import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sha256 } from '@/lib/crypto';

export class ApiAuthError extends Error {
  constructor(message: string, public status = 401) {
    super(message);
  }
}

// In-memory sliding-window rate limiter. For multi-instance deployments,
// swap this for a Redis-backed limiter (see DEPLOYMENT.md) — the interface
// stays the same.
const requestLog = new Map<string, number[]>();

function checkRateLimit(apiKeyId: string, limitPerMinute: number) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const timestamps = (requestLog.get(apiKeyId) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= limitPerMinute) {
    throw new ApiAuthError('Rate limit exceeded. Try again shortly.', 429);
  }
  timestamps.push(now);
  requestLog.set(apiKeyId, timestamps);
}

/**
 * Authenticates a request to /api/v1/* using the `key` parameter (form body
 * or query string), matching the conventional "single API key" pattern used
 * throughout this industry. Enforces active status, IP whitelist and rate
 * limit, and logs every call to ApiLog.
 */
export async function authenticateApiRequest(request: NextRequest, providedKey: string | null) {
  if (!providedKey) throw new ApiAuthError('Missing API key.');

  const [prefix] = providedKey.split('.');
  const keyHash = sha256(providedKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey || !apiKey.isActive || apiKey.keyPrefix !== prefix) {
    throw new ApiAuthError('Invalid API key.');
  }
  if (apiKey.user.status !== 'ACTIVE') {
    throw new ApiAuthError('Account is not active.');
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.ip ?? 'unknown';
  if (apiKey.ipWhitelist.length > 0 && !apiKey.ipWhitelist.includes(ip)) {
    throw new ApiAuthError('IP address not whitelisted for this key.', 403);
  }

  checkRateLimit(apiKey.id, apiKey.rateLimitPerMinute);

  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  return { apiKey, user: apiKey.user, ip };
}

export async function logApiCall(apiKeyId: string, endpoint: string, method: string, statusCode: number, ip: string) {
  await prisma.apiLog.create({ data: { apiKeyId, endpoint, method, statusCode, ipAddress: ip } }).catch(() => undefined);
}
