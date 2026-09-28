import { describe, it, expect, beforeAll } from 'vitest';
import { toCsv } from '@/lib/csv';
import { resolveRange } from '@/lib/date-range';
import { hashPassword, verifyPassword } from '@/lib/password';
import { encryptSecret, decryptSecret, sha256, generateApiSecret } from '@/lib/crypto';
import { loginSchema, createUserSchema } from '@/lib/validations/auth';

beforeAll(() => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
});

describe('csv', () => {
  it('escapes commas/quotes and neutralises formula injection', () => {
    const out = toCsv([['a,b', 'say "hi"', '=SUM(A1)']]);
    expect(out).toBe('"a,b","say ""hi""",\'=SUM(A1)');
  });
});

describe('date ranges', () => {
  it('yesterday ends where today starts', () => {
    const y = resolveRange('yesterday');
    const t = resolveRange('today');
    expect(y.end.getTime()).toBe(t.start.getTime());
  });
  it('falls back to 30 days on garbage', () => {
    expect(resolveRange('nope').key).toBe('30d');
  });
});

describe('authentication primitives', () => {
  it('hashes and verifies passwords, rejecting wrong ones', async () => {
    const h = await hashPassword('correct horse');
    expect(h).not.toContain('correct horse');
    expect(await verifyPassword(h, 'correct horse')).toBe(true);
    expect(await verifyPassword(h, 'wrong')).toBe(false);
  });
  it('validates login and user-creation input', () => {
    expect(loginSchema.safeParse({ username: 'ab', password: 'x' }).success).toBe(false);
    expect(createUserSchema.safeParse({ name: 'A B', username: 'good_name', email: 'a@b.co', password: 'longenough' }).success).toBe(true);
    expect(createUserSchema.safeParse({ name: 'A B', username: 'bad name!', email: 'a@b.co', password: 'longenough' }).success).toBe(false);
  });
});

describe('secrets', () => {
  it('round-trips AES-GCM and rejects tampering', () => {
    const enc = encryptSecret('provider-key');
    expect(enc).not.toContain('provider-key');
    expect(decryptSecret(enc)).toBe('provider-key');
    const buf = Buffer.from(enc, 'base64');
    buf[buf.length - 1] ^= 1;
    expect(() => decryptSecret(buf.toString('base64'))).toThrow();
  });
  it('API keys hash deterministically and carry their prefix', () => {
    const k = generateApiSecret();
    expect(k.full.startsWith(k.prefix + '.')).toBe(true);
    expect(sha256(k.full)).toBe(sha256(k.full));
  });
});
