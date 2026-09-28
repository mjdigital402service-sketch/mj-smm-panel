import type {
  ProviderAdapter,
  ProviderCredentials,
  RemoteService,
  CreateOrderInput,
  CreateOrderResult,
  OrderStatusResult,
  BalanceResult,
} from '../base/types';
import { ProviderError } from '../base/types';

/**
 * Generic adapter for any provider that exposes a typical form-encoded
 * "key + action" REST endpoint (a very common pattern across the SMM-panel
 * industry in general — this is NOT tied to any specific vendor; the exact
 * field names are configurable per-provider via `config` on the Provider
 * record if a given upstream deviates from these defaults).
 *
 * This is intentionally generic and provider-agnostic: it makes no
 * assumptions about who is on the other end.
 */
async function callWithRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable = err instanceof ProviderError ? err.retryable : true;
      if (!retryable || attempt === retries) break;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}

async function post(url: string, body: Record<string, string>): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new ProviderError(`Provider HTTP ${res.status}`, res.status >= 500);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    throw new ProviderError(err instanceof Error ? err.message : 'Provider request failed', true);
  } finally {
    clearTimeout(timeout);
  }
}

export const genericHttpAdapter: ProviderAdapter = {
  key: 'generic-http',

  async getServices(creds: ProviderCredentials): Promise<RemoteService[]> {
    const data = await callWithRetry(() => post(creds.apiUrl, { key: creds.apiKey, action: 'services' }));
    if (!Array.isArray(data)) throw new ProviderError('Unexpected services response shape');
    return data.map((s: any) => ({
      providerServiceId: String(s.service),
      name: String(s.name),
      category: String(s.category ?? 'Uncategorized'),
      rate: String(s.rate),
      min: String(s.min),
      max: String(s.max),
      type: String(s.type ?? 'default'),
      dripfeed: Boolean(s.dripfeed),
      refill: Boolean(s.refill),
      cancel: Boolean(s.cancel),
    }));
  },

  async getBalance(creds: ProviderCredentials): Promise<BalanceResult> {
    const data = await callWithRetry(() => post(creds.apiUrl, { key: creds.apiKey, action: 'balance' }));
    return { balance: String(data.balance ?? '0'), currency: String(data.currency ?? 'USD') };
  },

  async createOrder(creds: ProviderCredentials, input: CreateOrderInput): Promise<CreateOrderResult> {
    const data = await callWithRetry(() =>
      post(creds.apiUrl, {
        key: creds.apiKey,
        action: 'add',
        service: input.providerServiceId,
        link: input.link,
        quantity: String(input.quantity),
        ...(input.runs ? { runs: String(input.runs) } : {}),
        ...(input.interval ? { interval: String(input.interval) } : {}),
        ...(input.comments ? { comments: input.comments } : {}),
      }),
    );
    if (data.error) throw new ProviderError(String(data.error), false, data);
    return { providerOrderId: String(data.order), raw: data };
  },

  async getOrderStatus(creds: ProviderCredentials, providerOrderId: string): Promise<OrderStatusResult> {
    const data = await callWithRetry(() =>
      post(creds.apiUrl, { key: creds.apiKey, action: 'status', order: providerOrderId }),
    );
    if (data.error) throw new ProviderError(String(data.error), false, data);
    return {
      providerOrderId,
      status: data.status,
      charge: String(data.charge ?? '0'),
      startCount: data.start_count != null ? String(data.start_count) : null,
      remains: data.remains != null ? String(data.remains) : null,
      currency: String(data.currency ?? 'USD'),
      raw: data,
    };
  },

  async cancelOrder(creds: ProviderCredentials, providerOrderId: string) {
    const data = await callWithRetry(() =>
      post(creds.apiUrl, { key: creds.apiKey, action: 'cancel', order: providerOrderId }),
    );
    return { success: !data.error, raw: data };
  },

  async refillOrder(creds: ProviderCredentials, providerOrderId: string) {
    const data = await callWithRetry(() =>
      post(creds.apiUrl, { key: creds.apiKey, action: 'refill', order: providerOrderId }),
    );
    if (data.error) throw new ProviderError(String(data.error), false, data);
    return { refillId: String(data.refill ?? data.order), raw: data };
  },
};
