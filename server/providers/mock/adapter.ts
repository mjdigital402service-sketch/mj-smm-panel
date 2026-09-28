import type {
  ProviderAdapter,
  ProviderCredentials,
  RemoteService,
  CreateOrderInput,
  CreateOrderResult,
  OrderStatusResult,
  BalanceResult,
} from '../base/types';

/**
 * DEVELOPMENT/MOCK ADAPTER — no external network calls.
 * Used for local development and automated tests when no real provider
 * credentials are configured. Clearly marked as mock; never used in
 * production order flows unless explicitly assigned to a Provider record
 * with adapterKey = "mock".
 */
const mockOrderState = new Map<string, { status: OrderStatusResult['status']; remains: number; quantity: number }>();
let counter = 100000;

export const mockAdapter: ProviderAdapter = {
  key: 'mock',

  async getServices(_creds: ProviderCredentials): Promise<RemoteService[]> {
    return [
      { providerServiceId: '1001', name: 'Mock Instagram Followers', category: 'Instagram', rate: '90.0000', min: '100', max: '100000', type: 'default', dripfeed: true, refill: true, cancel: true },
      { providerServiceId: '1002', name: 'Mock YouTube Views', category: 'YouTube', rate: '40.0000', min: '500', max: '1000000', type: 'default', dripfeed: false, refill: false, cancel: false },
      { providerServiceId: '1003', name: 'Mock TikTok Likes', category: 'TikTok', rate: '60.0000', min: '50', max: '50000', type: 'default', dripfeed: false, refill: true, cancel: true },
    ];
  },

  async getBalance(_creds: ProviderCredentials): Promise<BalanceResult> {
    return { balance: '5000.0000', currency: 'USD' };
  },

  async createOrder(_creds: ProviderCredentials, input: CreateOrderInput): Promise<CreateOrderResult> {
    const id = String(++counter);
    mockOrderState.set(id, { status: 'In progress', remains: input.quantity, quantity: input.quantity });
    return { providerOrderId: id, raw: { mock: true, input } };
  },

  async getOrderStatus(_creds: ProviderCredentials, providerOrderId: string): Promise<OrderStatusResult> {
    const state = mockOrderState.get(providerOrderId);
    if (!state) {
      return {
        providerOrderId,
        status: 'Completed',
        charge: '0',
        startCount: '0',
        remains: '0',
        currency: 'USD',
        raw: { mock: true, note: 'unknown order, assumed completed' },
      };
    }
    // simulate gradual progress
    state.remains = Math.max(0, state.remains - Math.ceil(state.quantity * 0.4));
    state.status = state.remains === 0 ? 'Completed' : 'In progress';
    return {
      providerOrderId,
      status: state.status,
      charge: '0',
      startCount: '0',
      remains: String(state.remains),
      currency: 'USD',
      raw: { mock: true, state },
    };
  },

  async cancelOrder(_creds: ProviderCredentials, providerOrderId: string) {
    mockOrderState.delete(providerOrderId);
    return { success: true, raw: { mock: true } };
  },

  async refillOrder(_creds: ProviderCredentials, providerOrderId: string) {
    return { refillId: `refill-${providerOrderId}`, raw: { mock: true } };
  },
};
