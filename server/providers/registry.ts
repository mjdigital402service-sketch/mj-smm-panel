import type { ProviderAdapter, ProviderCredentials } from './base/types';
import { genericHttpAdapter } from './generic-http/adapter';
import { mockAdapter } from './mock/adapter';
import { decryptSecret } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';

const registry: Record<string, ProviderAdapter> = {
  [genericHttpAdapter.key]: genericHttpAdapter,
  [mockAdapter.key]: mockAdapter,
};

export function getAdapter(adapterKey: string): ProviderAdapter {
  const adapter = registry[adapterKey];
  if (!adapter) throw new Error(`No provider adapter registered for key "${adapterKey}"`);
  return adapter;
}

/**
 * Loads a Provider row and decrypts its credentials server-side only.
 * The decrypted API key must NEVER be returned from an API route or
 * rendered to any client component.
 */
export async function loadProviderContext(providerId: string): Promise<{
  adapter: ProviderAdapter;
  creds: ProviderCredentials;
  providerName: string;
}> {
  const provider = await prisma.provider.findUniqueOrThrow({ where: { id: providerId } });
  const adapter = getAdapter(provider.adapterKey);
  const creds: ProviderCredentials = {
    apiUrl: provider.apiUrl,
    apiKey: decryptSecret(provider.apiKeyEncrypted),
  };
  return { adapter, creds, providerName: provider.name };
}

export async function logProviderCall(
  providerId: string,
  action: string,
  success: boolean,
  requestMeta?: unknown,
  responseMeta?: unknown,
  errorMessage?: string,
) {
  await prisma.providerLog.create({
    data: {
      providerId,
      action,
      success,
      requestMeta: requestMeta as any,
      responseMeta: responseMeta as any,
      errorMessage,
    },
  });
}
