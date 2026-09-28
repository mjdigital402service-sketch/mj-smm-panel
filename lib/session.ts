import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from './prisma';
import { sha256 } from './crypto';
import type { Role, UserStatus } from '@prisma/client';

const SESSION_COOKIE = 'smm_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  status: UserStatus;
  distributorId: string | null;
}

/**
 * Creates a new server-side session record and sets an httpOnly, secure,
 * SameSite=Lax cookie containing only an opaque random token (never the
 * session id or user id directly) to prevent enumeration/tampering.
 */
export async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: { userId, tokenHash, ipAddress, userAgent, expiresAt },
  });

  cookies().set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession() {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (raw) {
    const tokenHash = sha256(raw);
    await prisma.session.deleteMany({ where: { tokenHash } }).catch(() => undefined);
  }
  cookies().delete(SESSION_COOKIE);
}

/**
 * Resolves the current session's user from the DB (never trusts client claims).
 * Returns null if no valid, unexpired session exists.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const tokenHash = sha256(raw);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  const { user } = session;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    status: user.status,
    distributorId: user.distributorId,
  };
}

/** Throws-free guard for use in Server Components/route handlers. */
export async function requireUser(allowed?: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedError();
  }
  if (allowed && !allowed.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('Forbidden');
    this.name = 'ForbiddenError';
  }
}
