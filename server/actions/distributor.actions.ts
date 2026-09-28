'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { requireUser } from '@/lib/session';
import { createUserSchema } from '@/lib/validations/auth';
import {
  applyWalletDelta,
  InsufficientBalanceError,
} from '@/server/services/wallet.service';
import { getDistributorPrice } from '@/server/services/pricing.service';
import { getSettings } from '@/server/services/settings.service';
import { recordAudit } from '@/server/services/audit.service';
import { notify } from '@/server/services/notification.service';

/**
 * Loads a retailer and enforces that it belongs to the calling distributor.
 */
async function ownedRetailer(
  distributorId: string,
  retailerId: string,
) {
  const retailer = await prisma.user.findUnique({
    where: {
      id: retailerId,
    },
    select: {
      id: true,
      role: true,
      distributorId: true,
      status: true,
    },
  });

  if (
    !retailer ||
    retailer.role !== 'RETAILER' ||
    retailer.distributorId !== distributorId
  ) {
    throw new Error('Retailer not found.');
  }

  return retailer;
}

function assertPositiveFiniteAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter a valid positive amount.');
  }
}

function assertPositiveFinitePrice(price: number) {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Enter a valid positive price.');
  }
}

export async function distributorCreateRetailerAction(
  formData: FormData,
) {
  const dist = await requireUser(['DISTRIBUTOR']);

  const parsed = createUserSchema.safeParse({
    name: formData.get('name'),
    username: formData.get('username'),
    email: formData.get('email'),
    phone: formData.get('phone') || undefined,
    password: formData.get('password'),
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? 'Invalid input',
    );
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      email: parsed.data.email,
      phone: parsed.data.phone,
      passwordHash: await hashPassword(parsed.data.password),
      role: 'RETAILER',
      distributorId: dist.id,
      wallet: {
        create: {
          balance: 0,
        },
      },
    },
  });

  try {
    await recordAudit({
      actorId: dist.id,
      action: 'CREATE_RETAILER',
      entityType: 'User',
      entityId: user.id,
    });
  } catch {
    // Audit failure must not make successful retailer creation appear failed.
  }

  revalidatePath('/distributor/retailers');
}

/**
 * Enables or suspends one of the distributor's own retailers.
 */
export async function distributorSetRetailerStatusAction(
  retailerId: string,
  status: 'ACTIVE' | 'SUSPENDED',
) {
  const dist = await requireUser(['DISTRIBUTOR']);

  await ownedRetailer(dist.id, retailerId);

  await prisma.user.update({
    where: {
      id: retailerId,
    },
    data: {
      status,
    },
  });

  try {
    await recordAudit({
      actorId: dist.id,
      action: `SET_STATUS_${status}`,
      entityType: 'User',
      entityId: retailerId,
    });
  } catch {
    // Audit failure must not make the status update appear failed.
  }

  revalidatePath('/distributor/retailers');
}

/**
 * Transfers money from the distributor wallet to one of
 * the distributor's own retailer wallets.
 *
 * IMPORTANT:
 * Distributor is NOT allowed to debit or reclaim money
 * from a retailer wallet.
 *
 * Allowed:
 *   Distributor -> Retailer
 *
 * Forbidden:
 *   Retailer -> Distributor
 *
 * The server rejects any attempt to use a debit/reverse mode.
 */
export async function distributorTransferAction(params: {
  retailerId: string;
  amount: number;
  mode: 'credit' | 'debit';
  note?: string;
}) {
  const dist = await requireUser(['DISTRIBUTOR']);

  if (params.mode !== 'credit') {
    throw new Error(
      'Distributors can only transfer funds from their own wallet to a retailer wallet.',
    );
  }

  if (!params.retailerId) {
    throw new Error('Retailer is required.');
  }

  assertPositiveFiniteAmount(params.amount);

  await ownedRetailer(dist.id, params.retailerId);

  const amount = new Prisma.Decimal(params.amount);

  const from = dist.id;
  const to = params.retailerId;

  const note =
    params.note?.trim() ||
    'Balance added by distributor';

  try {
    await prisma.$transaction(async (tx) => {
      /*
       * Lock both wallet rows in deterministic ID order.
       *
       * This prevents concurrent wallet operations from acquiring
       * the same rows in opposite order and creating a deadlock.
       */
      const orderedIds = [from, to].sort();

      for (const userId of orderedIds) {
        await tx.$queryRaw`
          SELECT "id"
          FROM "Wallet"
          WHERE "userId" = ${userId}
          FOR UPDATE
        `;
      }

      /*
       * Distributor wallet:
       *   - amount
       *
       * Retailer wallet:
       *   + amount
       */
      await applyWalletDelta(tx, {
        userId: from,
        delta: amount.neg(),
        type: 'MANUAL_DEBIT',
        reference: to,
        description: note,
      });

      await applyWalletDelta(tx, {
        userId: to,
        delta: amount,
        type: 'MANUAL_CREDIT',
        reference: from,
        description: note,
      });
    });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      throw new Error(
        'Insufficient balance in distributor wallet.',
      );
    }

    throw err;
  }

  try {
    await recordAudit({
      actorId: dist.id,
      action: 'RETAILER_BALANCE_CREDIT',
      entityType: 'User',
      entityId: params.retailerId,
      metadata: {
        amount: params.amount,
        note,
        direction: 'DISTRIBUTOR_TO_RETAILER',
      },
    });
  } catch {
    // Financial transaction has already committed.
  }

  try {
    await notify({
      userId: params.retailerId,
      type: 'WALLET_CREDITED',
      title: 'Wallet credited',
      message:
        'Your distributor added funds to your wallet.',
    });
  } catch {
    // Notification failure must not undo a completed transfer.
  }

  revalidatePath('/distributor/retailers');
  revalidatePath('/distributor/wallet');
  revalidatePath('/retailer/wallet');
}

/**
 * Sets a retailer-specific price for a service.
 *
 * Server-side rules:
 * - distributor must own the retailer
 * - Admin must enable distributor retailer pricing
 * - price cannot go below distributor buy price
 * - price cannot exceed distributor price + allowed markup
 */
export async function setRetailerPriceAction(params: {
  retailerId: string;
  serviceId: string;
  price: number;
}) {
  const dist = await requireUser(['DISTRIBUTOR']);

  if (!params.retailerId || !params.serviceId) {
    throw new Error(
      'Retailer and service are required.',
    );
  }

  assertPositiveFinitePrice(params.price);

  await ownedRetailer(dist.id, params.retailerId);

  const settings = await getSettings();

  if (!settings.distributorCanSetRetailerPricing) {
    throw new Error(
      'Retailer pricing is disabled by the administrator.',
    );
  }

  if (
    !Number.isFinite(settings.maxRetailerMarkupPercent) ||
    settings.maxRetailerMarkupPercent < 0
  ) {
    throw new Error(
      'Invalid retailer pricing configuration.',
    );
  }

  const floor = await getDistributorPrice(
    params.serviceId,
    dist.id,
  );

  if (floor.isNegative()) {
    throw new Error(
      'Invalid distributor service price.',
    );
  }

  const ceiling = floor.mul(
    new Prisma.Decimal(1).add(
      new Prisma.Decimal(
        settings.maxRetailerMarkupPercent,
      ).div(100),
    ),
  );

  const price = new Prisma.Decimal(params.price);

  if (price.lt(floor)) {
    throw new Error(
      `Price cannot be below your cost (${floor.toFixed(4)}).`,
    );
  }

  if (price.gt(ceiling)) {
    throw new Error(
      `Price exceeds the allowed maximum (${ceiling.toFixed(4)}).`,
    );
  }

  await prisma.retailerPricing.upsert({
    where: {
      retailerId_serviceId: {
        retailerId: params.retailerId,
        serviceId: params.serviceId,
      },
    },
    create: {
      retailerId: params.retailerId,
      serviceId: params.serviceId,
      price,
    },
    update: {
      price,
    },
  });

  try {
    await recordAudit({
      actorId: dist.id,
      action: 'SET_RETAILER_PRICE',
      entityType: 'RetailerPricing',
      entityId: params.retailerId,
      metadata: {
        serviceId: params.serviceId,
        price: price.toString(),
      },
    });
  } catch {
    // Pricing update has already committed.
  }

  revalidatePath('/distributor/pricing');
  revalidatePath('/distributor/retailers');
  revalidatePath('/retailer/services');
}