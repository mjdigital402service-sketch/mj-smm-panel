'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { recordAudit } from '@/server/services/audit.service';

export async function reviewRetailerRegistrationAction(
  userId: string,
  decision: 'APPROVE' | 'REJECT',
) {
  const admin = await requireUser(['ADMIN']);

  if (
    typeof userId !== 'string' ||
    userId.trim().length === 0 ||
    !['APPROVE', 'REJECT'].includes(decision)
  ) {
    throw new Error('Invalid registration review request.');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true },
  });

  if (!user) {
    throw new Error('User not found.');
  }

  if (user.role !== 'RETAILER' || user.status !== 'PENDING') {
    throw new Error('This retailer registration is no longer pending.');
  }

  const nextStatus = decision === 'APPROVE' ? 'ACTIVE' : 'SUSPENDED';

  await prisma.user.update({
    where: { id: user.id },
    data: { status: nextStatus },
  });

  await recordAudit({
    actorId: admin.id,
    action:
      decision === 'APPROVE'
        ? 'RETAILER_REGISTRATION_APPROVED'
        : 'RETAILER_REGISTRATION_REJECTED',
    entityType: 'User',
    entityId: user.id,
    metadata: { decision, previousStatus: 'PENDING', nextStatus },
  });

  revalidatePath('/admin/users');
  revalidatePath('/admin/retailers');
  revalidatePath('/login');

  return {
    success: true,
    status: nextStatus,
  };
}
