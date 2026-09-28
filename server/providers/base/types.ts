/**
 * PROVIDER ADAPTER CONTRACT
 * ---------------------------------------------------------------------------
 * Every upstream SMM provider is wrapped by a class implementing this
 * interface. The order engine, sync engine, and admin UI only ever talk to
 * this interface — never to a provider's raw HTTP API directly. This is what
 * lets new providers be added by dropping in a new adapter, with zero changes
 * to order/wallet/pricing logic.
 */

export interface ProviderCredentials {
  apiUrl: string;
  apiKey: string;
}

export interface RemoteService {
  providerServiceId: string;
  name: string;
  category: string;
  rate: string; // cost per 1000, as returned by provider, string to preserve precision
  min: string;
  max: string;
  type: string;
  dripfeed: boolean;
  refill: boolean;
  cancel: boolean;
}

export interface CreateOrderInput {
  providerServiceId: string;
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
  comments?: string;
}

export interface CreateOrderResult {
  providerOrderId: string;
  raw: unknown;
}

export interface OrderStatusResult {
  providerOrderId: string;
  status: 'Pending' | 'In progress' | 'Processing' | 'Completed' | 'Partial' | 'Canceled' | 'Cancelled' | 'Failed';
  charge: string;
  startCount: string | null;
  remains: string | null;
  currency: string;
  raw: unknown;
}

export interface BalanceResult {
  balance: string;
  currency: string;
}

export interface ProviderAdapter {
  /** Unique key this adapter registers under, e.g. "mock", "generic-smm-v2" */
  readonly key: string;

  getServices(creds: ProviderCredentials): Promise<RemoteService[]>;
  getBalance(creds: ProviderCredentials): Promise<BalanceResult>;
  createOrder(creds: ProviderCredentials, input: CreateOrderInput): Promise<CreateOrderResult>;
  getOrderStatus(creds: ProviderCredentials, providerOrderId: string): Promise<OrderStatusResult>;
  getMultiOrderStatus?(creds: ProviderCredentials, providerOrderIds: string[]): Promise<OrderStatusResult[]>;
  cancelOrder(creds: ProviderCredentials, providerOrderId: string): Promise<{ success: boolean; raw: unknown }>;
  refillOrder(creds: ProviderCredentials, providerOrderId: string): Promise<{ refillId: string; raw: unknown }>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean = false,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
