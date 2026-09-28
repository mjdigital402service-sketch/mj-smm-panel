'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { requireUser } from '@/lib/session';
import { createUserSchema } from '@/lib/validations/auth';
import { recordAudit } from '@/server/services/audit.service';
import {
  creditWallet,
  debitWallet,
} from '@/server/services/wallet.service';
import { notify } from '@/server/services/notification.service';
import type { Role } from '@prisma/client';

const MANAGED_ROLES: ReadonlyArray<'DISTRIBUTOR' | 'RETAILER'> = [
  'DISTRIBUTOR',
  'RETAILER',
];

function isManagedRole(
  role: Role,
): role is Extract<Role, 'DISTRIBUTOR' | 'RETAILER'> {
  return MANAGED_ROLES.includes(role as 'DISTRIBUTOR' | 'RETAILER');
}

function assertPositiveFiniteAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a valid positive number.');
  }
}

function assertValidCreditLimit(creditLimit: number) {
  if (!Number.isFinite(creditLimit) || creditLimit < 0) {
    throw new Error('Credit limit must be a valid non-negative number.');
  }
}

async function requireActiveDistributor(distributorId: string) {
  const distributor = await prisma.user.findUnique({
    where: {
      id: distributorId,
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!distributor) {
    throw new Error('Distributor not found.');
  }

  if (distributor.role !== 'DISTRIBUTOR') {
    throw new Error('Selected user is not a distributor.');
  }

  if (distributor.status !== 'ACTIVE') {
    throw new Error('The selected distributor is not active.');
  }

  return distributor;
}

export async function createUserAction(
  role: Extract<Role, 'DISTRIBUTOR' | 'RETAILER'>,
  formData: FormData,
) {
  const admin = await requireUser(['ADMIN']);

  if (!isManagedRole(role)) {
    throw new Error('Invalid user role.');
  }

  const parsed = createUserSchema.safeParse({
    name: formData.get('name'),
    username: formData.get('username'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    password: formData.get('password'),
    distributorId: formData.get('distributorId') || undefined,
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? 'Invalid input',
    );
  }

  if (role === 'RETAILER' && !parsed.data.distributorId) {
    throw new Error('A retailer must be assigned to a distributor.');
  }

  if (role === 'DISTRIBUTOR' && parsed.data.distributorId) {
    throw new Error('A distributor cannot be assigned to another distributor.');
  }

  if (role === 'RETAILER') {
    await requireActiveDistributor(parsed.data.distributorId!);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      email: parsed.data.email,
      phone: parsed.data.phone,
      passwordHash,
      role,
      distributorId:
        role === 'RETAILER'
          ? parsed.data.distributorId
          : null,
      wallet: {
        create: {
          balance: 0,
        },
      },
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: `CREATE_${role}`,
    entityType: 'User',
    entityId: user.id,
  });

  revalidatePath(
    role === 'RETAILER'
      ? '/admin/retailers'
      : '/admin/distributors',
  );
}

export async function setUserStatusAction(
  userId: string,
  status: 'ACTIVE' | 'SUSPENDED',
) {
  const admin = await requireUser(['ADMIN']);

  if (userId === admin.id) {
    throw new Error('You cannot change your own account status.');
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error('User not found.');
  }

  if (!isManagedRole(user.role)) {
    throw new Error('Only distributor and retailer accounts can be managed here.');
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      status,
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: `SET_STATUS_${status}`,
    entityType: 'User',
    entityId: userId,
  });

  if (status === 'SUSPENDED') {
    try {
      await notify({
        userId,
        type: 'ACCOUNT_SUSPENDED',
        title: 'Account suspended',
        message:
          'Your account has been suspended by an administrator.',
      });
    } catch {
      // Notification failure must not undo the account-status change.
    }
  }

  revalidatePath(
    updatedUser.role === 'RETAILER'
      ? '/admin/retailers'
      : '/admin/distributors',
  );
}

export async function deleteUserAction(userId: string) {
  const admin = await requireUser(['ADMIN']);

  if (userId === admin.id) {
    throw new Error('You cannot delete your own account.');
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error('User not found.');
  }

  if (!isManagedRole(user.role)) {
    throw new Error(
      'Only distributor and retailer accounts can be deleted here.',
    );
  }

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: 'DELETE_USER',
    entityType: 'User',
    entityId: userId,
  });

  revalidatePath(
    user.role === 'RETAILER'
      ? '/admin/retailers'
      : '/admin/distributors',
  );
}

export async function adjustBalanceAction(params: {
  userId: string;
  amount: number;
  mode: 'credit' | 'debit';
  note: string;
}) {
  const admin = await requireUser(['ADMIN']);

  if (!params || !['credit', 'debit'].includes(params.mode)) {
    throw new Error('Invalid wallet adjustment mode.');
  }

  assertPositiveFiniteAmount(params.amount);

  const note = String(params.note ?? '').trim();

  const user = await prisma.user.findUnique({
    where: {
      id: params.userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error('User not found.');
  }

  if (!isManagedRole(user.role)) {
    throw new Error(
      'Wallet adjustment is only available for distributor and retailer accounts.',
    );
  }

  if (params.mode === 'credit') {
    await creditWallet({
      userId: params.userId,
      amount: params.amount,
      type: 'MANUAL_CREDIT',
      description: note || 'Manual credit by admin',
    });

    try {
      await notify({
        userId: params.userId,
        type: 'WALLET_CREDITED',
        title: 'Wallet credited',
        message:
          'Your wallet was credited by an administrator.',
      });
    } catch {
      // Notification failure must not undo a successful wallet transaction.
    }
  } else {
    await debitWallet({
      userId: params.userId,
      amount: params.amount,
      type: 'MANUAL_DEBIT',
      description: note || 'Manual debit by admin',
    });
  }

  await recordAudit({
    actorId: admin.id,
    action: `WALLET_${params.mode.toUpperCase()}`,
    entityType: 'User',
    entityId: params.userId,
    metadata: {
      amount: params.amount,
      note,
    },
  });

  revalidatePath(
    user.role === 'RETAILER'
      ? '/admin/retailers'
      : '/admin/distributors',
  );
  revalidatePath('/admin/wallet');
}

export async function reassignRetailerDistributorAction(
  retailerId: string,
  newDistributorId: string,
) {
  const admin = await requireUser(['ADMIN']);

  if (!retailerId || !newDistributorId) {
    throw new Error('Retailer and distributor are required.');
  }

  if (retailerId === newDistributorId) {
    throw new Error('A retailer cannot be assigned to itself.');
  }

  const retailer = await prisma.user.findUnique({
    where: {
      id: retailerId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!retailer) {
    throw new Error('Retailer not found.');
  }

  if (retailer.role !== 'RETAILER') {
    throw new Error('Selected user is not a retailer.');
  }

  const distributor = await requireActiveDistributor(
    newDistributorId,
  );

  await prisma.user.update({
    where: {
      id: retailerId,
    },
    data: {
      distributorId: distributor.id,
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: 'REASSIGN_DISTRIBUTOR',
    entityType: 'User',
    entityId: retailerId,
    metadata: {
      newDistributorId: distributor.id,
    },
  });

  revalidatePath('/admin/retailers');
  revalidatePath('/distributor/retailers');
}

export async function setCreditLimitAction(
  userId: string,
  creditLimit: number,
) {
  const admin = await requireUser(['ADMIN']);

  assertValidCreditLimit(creditLimit);

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error('User not found.');
  }

  if (user.role !== 'DISTRIBUTOR') {
    throw new Error(
      'Credit limits can only be assigned to distributor accounts.',
    );
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      creditLimit,
      allowNegativeBalance: creditLimit > 0,
    },
  });

  await recordAudit({
    actorId: admin.id,
    action: 'SET_CREDIT_LIMIT',
    entityType: 'User',
    entityId: userId,
    metadata: {
      creditLimit,
    },
  });

  revalidatePath('/admin/distributors');
  revalidatePath('/distributor/wallet');
}