import crypto from 'crypto';

/**
 * AES-256-GCM encryption for secrets at rest (e.g. provider API keys).
 * Requires ENCRYPTION_KEY env var: a 32-byte key, base64-encoded.
 * Never log or return decrypted secrets to the client.
 */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes.');
  }
  return key;
}

export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function generateApiSecret(): { prefix: string; secret: string; full: string } {
  const secret = crypto.randomBytes(24).toString('hex');
  const prefix = secret.slice(0, 8);
  return { prefix, secret, full: `${prefix}.${secret}` };
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
