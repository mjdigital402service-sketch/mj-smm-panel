'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { generateApiSecret, sha256 } from '@/lib/crypto';
import { recordAudit } from '@/server/services/audit.service';

type CreateApiKeyResult = {
  fullKey: string;
};

export async function createApiKeyAction(): Promise<CreateApiKeyResult> {
  const user = await requireUser([
    'ADMIN',
    'DISTRIBUTOR',
    'RETAILER',
  ]);

  const { prefix, full } = generateApiSecret();

  /*
   * Only the SHA-256 hash is persisted.
   * The plaintext API secret is returned once to the authenticated user
   * and cannot be recovered from the database later.
   */
  await prisma.apiKey.create({
    data: {
      userId: user.id,
      keyPrefix: prefix,
      keyHash: sha256(full),
    },
  });

  /*
   * API key creation has already succeeded.
   * Audit failure must not make the caller believe that the key was
   * not created.
   */
  try {
    await recordAudit({
      actorId: user.id,
      action: 'CREATE_API_KEY',
      entityType: 'ApiKey',
    });
  } catch (auditError) {
    console.error(
      'CREATE_API_KEY audit failed',
      auditError,
    );
  }

  revalidatePath('/admin/api-management');
  revalidatePath('/distributor/api');
  revalidatePath('/retailer/api');

  return {
    fullKey: full,
  };
}

export async function revokeApiKeyAction(
  id: string,
): Promise<void> {
  const user = await requireUser([
    'ADMIN',
    'DISTRIBUTOR',
    'RETAILER',
  ]);

  const apiKeyId = String(id ?? '').trim();

  if (!apiKeyId) {
    throw new Error('Invalid API key.');
  }

  const key = await prisma.apiKey.findUnique({
    where: {
      id: apiKeyId,
    },
    select: {
      id: true,
      userId: true,
      isActive: true,
    },
  });

  if (!key) {
    throw new Error('API key not found.');
  }

  /*
   * Admin can revoke any API key.
   * Distributor/Retailer can revoke only their own key.
   */
  if (
    user.role !== 'ADMIN' &&
    key.userId !== user.id
  ) {
    throw new Error('Not authorized.');
  }

  /*
   * Revoking an already-revoked key is idempotent.
   * No additional database mutation is necessary.
   */
  if (!key.isActive) {
    return;
  }

  await prisma.apiKey.update({
    where: {
      id: key.id,
    },
    data: {
      isActive: false,
    },
  });

  /*
   * The revoke operation has already succeeded.
   * Audit failure must not turn a successful revoke into a
   * misleading action failure.
   */
  try {
    await recordAudit({
      actorId: user.id,
      action: 'REVOKE_API_KEY',
      entityType: 'ApiKey',
      entityId: key.id,
    });
  } catch (auditError) {
    console.error(
      'REVOKE_API_KEY audit failed',
      auditError,
    );
  }

  revalidatePath('/admin/api-management');
  revalidatePath('/distributor/api');
  revalidatePath('/retailer/api');
}