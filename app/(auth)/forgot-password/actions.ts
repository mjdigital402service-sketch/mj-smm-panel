'use server';

import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { sha256 } from '@/lib/crypto';
import { hashPassword } from '@/lib/password';
import { recordAudit } from '@/server/services/audit.service';

/**
 * Password reset tokens are stored as a SystemSetting-backed table entry
 * keyed by hash for simplicity in this reference implementation; for high
 * volume deployments, promote this to its own PasswordResetToken model.
 * The raw token is only ever sent by email — never logged or stored.
 */
export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always behave the same way regardless of whether the email exists, to
  // avoid leaking which emails are registered.
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    await prisma.systemSetting.upsert({
      where: { key: `pwreset:${tokenHash}` },
      create: { key: `pwreset:${tokenHash}`, value: { userId: user.id, expiresAt: Date.now() + 30 * 60_000 } },
      update: { value: { userId: user.id, expiresAt: Date.now() + 30 * 60_000 } },
    });
    // TODO(integration): send `rawToken` via your transactional email
    // provider as a link to /reset-password?token=rawToken. Never log it.
    await recordAudit({ actorId: user.id, action: 'PASSWORD_RESET_REQUESTED', entityType: 'User', entityId: user.id });
  }

  redirect('/login?reset=requested');
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) redirect(`/reset-password?token=${token}&error=weak`);

  const tokenHash = sha256(token);
  const setting = await prisma.systemSetting.findUnique({ where: { key: `pwreset:${tokenHash}` } });
  const payload = setting?.value as { userId: string; expiresAt: number } | undefined;

  if (!payload || payload.expiresAt < Date.now()) {
    redirect('/forgot-password?error=expired');
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: payload!.userId }, data: { passwordHash } });
  await prisma.systemSetting.delete({ where: { key: `pwreset:${tokenHash}` } }).catch(() => undefined);
  await recordAudit({ actorId: payload!.userId, action: 'PASSWORD_RESET_COMPLETED', entityType: 'User', entityId: payload!.userId });

  redirect('/login?reset=success');
}
