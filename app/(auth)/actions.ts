'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { createSession, destroySession } from '@/lib/session';
import { loginSchema } from '@/lib/validations/auth';
import { recordAudit } from '@/server/services/audit.service';

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });

  // Constant-shape response to avoid username enumeration via timing/content.
  const genericError = 'Invalid username or password.';

  if (!user) return { error: genericError };
  if (user.status !== 'ACTIVE') return { error: 'This account is suspended. Contact support.' };

  const valid = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!valid) {
    await recordAudit({ action: 'LOGIN_FAILED', entityType: 'User', entityId: user.id, ipAddress: ip });
    return { error: genericError };
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: ip } });
  await createSession(user.id, ip, headers().get('user-agent') ?? undefined);
  await recordAudit({ actorId: user.id, action: 'LOGIN_SUCCESS', entityType: 'User', entityId: user.id, ipAddress: ip });

  const destination = user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'DISTRIBUTOR' ? '/distributor/dashboard' : '/retailer/dashboard';
  redirect(destination);
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
