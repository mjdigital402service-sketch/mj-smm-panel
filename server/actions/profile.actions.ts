'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { hashPassword, verifyPassword } from '@/lib/password';
import { recordAudit } from '@/server/services/audit.service';

const schema = z.object({ current: z.string().min(1), next: z.string().min(8, 'New password must be at least 8 characters') });

export async function changePasswordAction(formData: FormData) {
  const session = await requireUser(['ADMIN', 'DISTRIBUTOR', 'RETAILER']);
  const parsed = schema.safeParse({ current: formData.get('current'), next: formData.get('next') });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input');

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
  if (!(await verifyPassword(user.passwordHash, parsed.data.current))) throw new Error('Current password is incorrect.');

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.next) } });
  await recordAudit({ actorId: user.id, action: 'PASSWORD_CHANGED', entityType: 'User', entityId: user.id });
}
