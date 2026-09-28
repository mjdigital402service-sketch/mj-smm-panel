/**
 * DB-backed integration tests (wallet ledger, orders, refunds, RBAC data rules,
 * provider failure, duplicate protection). They need a real PostgreSQL:
 *   DATABASE_URL=postgresql://... npx prisma migrate deploy && npm test
 * Without DATABASE_URL they are skipped rather than faking results.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const hasDb = !!process.env.DATABASE_URL;
const d = hasDb ? describe : describe.skip;

d('wallet + orders (integration)', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let wallet: typeof import('@/server/services/wallet.service');
  let orders: typeof import('@/server/services/order.service');
  let ids: { dist: string; retailer: string; service: string; provider: string; category: string };
  const tag = `t${Date.now()}`;

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? Buffer.alloc(32, 3).toString('base64');
    prisma = (await import('@/lib/prisma')).prisma;
    wallet = await import('@/server/services/wallet.service');
    orders = await import('@/server/services/order.service');

    const { encryptSecret } = await import('@/lib/crypto');
    const dist = await prisma.user.create({ data: { username: `d_${tag}`, name: 'D', email: `d_${tag}@x.test`, passwordHash: 'x', role: 'DISTRIBUTOR', wallet: { create: {} } } });
    const retailer = await prisma.user.create({ data: { username: `r_${tag}`, name: 'R', email: `r_${tag}@x.test`, passwordHash: 'x', role: 'RETAILER', distributorId: dist.id, wallet: { create: {} } } });
    const category = await prisma.category.create({ data: { name: `cat_${tag}` } });
    const provider = await prisma.provider.create({ data: { name: `p_${tag}`, apiUrl: 'http://mock', adapterKey: 'mock', apiKeyEncrypted: encryptSecret('k') } });
    const ps = await prisma.providerService.create({ data: { providerId: provider.id, providerServiceId: '1001', name: 'm', costPrice: 100, min: 10, max: 10000 } });
    const service = await prisma.service.create({ data: { name: `s_${tag}`, categoryId: category.id, providerServiceId: ps.id, costPrice: 100, adminMarkupType: 'PERCENTAGE', adminMarkupValue: 10, minQuantity: 10, maxQuantity: 10000 } });
    ids = { dist: dist.id, retailer: retailer.id, service: service.id, provider: provider.id, category: category.id };
  });

  afterAll(async () => { await prisma?.$disconnect(); });

  it('credits and debits with a ledger entry each and correct running balances', async () => {
    await wallet.creditWallet({ userId: ids.retailer, amount: 500, type: 'MANUAL_CREDIT', description: 't' });
    await wallet.debitWallet({ userId: ids.retailer, amount: 200, type: 'MANUAL_DEBIT', description: 't' });
    const tx = await prisma.walletTransaction.findMany({ where: { userId: ids.retailer }, orderBy: { createdAt: 'asc' } });
    expect(tx.map((t) => t.newBalance.toString())).toEqual(['500', '300']);
    expect((await wallet.getWalletBalance(ids.retailer)).toString()).toBe('300');
  });

  it('refuses to overdraw without credit', async () => {
    await expect(wallet.debitWallet({ userId: ids.retailer, amount: 99999, type: 'MANUAL_DEBIT', description: 't' })).rejects.toThrow(/Insufficient/);
  });

  it('places an order: debits exactly once, records cost/profit, and ignores a duplicate submission', async () => {
    const before = await wallet.getWalletBalance(ids.retailer);
    const input = { retailerId: ids.retailer, serviceId: ids.service, link: 'https://example.com/x', quantity: 1000, idempotencyKey: `${tag}-a` };
    const o1 = await orders.placeOrder(input);
    const o2 = await orders.placeOrder(input);
    expect(o2.id).toBe(o1.id);
    const after = await wallet.getWalletBalance(ids.retailer);
    expect(before.sub(after).toString()).toBe(o1.charge.toString());
    expect(o1.profit.toString()).toBe(o1.charge.sub(o1.providerCost).toString());
    expect(o1.status).toBe('PROCESSING');
  });

  it('rejects out-of-range quantity and insufficient balance', async () => {
    await expect(orders.placeOrder({ retailerId: ids.retailer, serviceId: ids.service, link: 'https://e.com', quantity: 1 })).rejects.toThrow(/Quantity/);
    await expect(orders.placeOrder({ retailerId: ids.retailer, serviceId: ids.service, link: 'https://e.com', quantity: 10000 })).rejects.toThrow(/Insufficient/);
  });

  it('refunds the retailer when the provider fails', async () => {
    await prisma.provider.update({ where: { id: ids.provider }, data: { adapterKey: 'does-not-exist' } });
    const before = await wallet.getWalletBalance(ids.retailer);
    const o = await orders.placeOrder({ retailerId: ids.retailer, serviceId: ids.service, link: 'https://e.com/y', quantity: 100 });
    expect(o.status).toBe('FAILED');
    expect((await wallet.getWalletBalance(ids.retailer)).toString()).toBe(before.toString());
    const refund = await prisma.walletTransaction.findFirst({ where: { userId: ids.retailer, type: 'REFUND', reference: o.id } });
    expect(refund).not.toBeNull();
    await prisma.provider.update({ where: { id: ids.provider }, data: { adapterKey: 'mock' } });
  });

  it('cancelling an order refunds it and cannot be cancelled twice', async () => {
    await wallet.creditWallet({ userId: ids.retailer, amount: 1000, type: 'MANUAL_CREDIT', description: 't' });
    const o = await orders.placeOrder({ retailerId: ids.retailer, serviceId: ids.service, link: 'https://e.com/z', quantity: 100 });
    const before = await wallet.getWalletBalance(ids.retailer);
    await orders.cancelOrder(o.id);
    expect((await wallet.getWalletBalance(ids.retailer)).sub(before).toString()).toBe(o.charge.toString());
    await expect(orders.cancelOrder(o.id)).rejects.toThrow(/cannot be cancelled/);
  });
});

d('api authentication + hierarchy (integration)', () => {
  it('rejects missing/invalid keys, enforces IP whitelist and rate limit', async () => {
    const { NextRequest } = await import('next/server');
    const { prisma } = await import('@/lib/prisma');
    const { authenticateApiRequest } = await import('@/server/api/apiAuth');
    const { generateApiSecret, sha256 } = await import('@/lib/crypto');

    const req = (ip = '1.2.3.4') => new NextRequest('http://localhost/api/v1/balance', { headers: { 'x-forwarded-for': ip } });
    await expect(authenticateApiRequest(req(), null)).rejects.toThrow(/Missing API key/);
    await expect(authenticateApiRequest(req(), 'abcd1234.deadbeef')).rejects.toThrow(/Invalid API key/);

    const u = await prisma.user.create({ data: { username: `api_${Date.now()}`, name: 'A', email: `api_${Date.now()}@x.test`, passwordHash: 'x', role: 'RETAILER', wallet: { create: {} } } });
    const k = generateApiSecret();
    await prisma.apiKey.create({ data: { userId: u.id, keyPrefix: k.prefix, keyHash: sha256(k.full), ipWhitelist: ['9.9.9.9'], rateLimitPerMinute: 2 } });

    await expect(authenticateApiRequest(req('1.2.3.4'), k.full)).rejects.toThrow(/not whitelisted/);
    await authenticateApiRequest(req('9.9.9.9'), k.full);
    await authenticateApiRequest(req('9.9.9.9'), k.full);
    await expect(authenticateApiRequest(req('9.9.9.9'), k.full)).rejects.toThrow(/Rate limit/);

    await prisma.apiKey.updateMany({ where: { userId: u.id }, data: { isActive: false } });
    await expect(authenticateApiRequest(req('9.9.9.9'), k.full)).rejects.toThrow(/Invalid API key/);
  });
});
