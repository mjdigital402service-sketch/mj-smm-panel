/**
 * DEVELOPMENT SEED — never run against production.
 * Creates 1 admin, 2 distributors, several retailers, categories, a MOCK
 * provider, mapped services and payment methods. The credentials below are
 * for local development only.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';

const prisma = new PrismaClient();

function encryptDevSecret(plain: string): string {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('Set ENCRYPTION_KEY in .env before seeding (openssl rand -base64 32).');
  const key = Buffer.from(raw, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

const hash = (p: string) => argon2.hash(p, { type: argon2.argon2id });

async function upsertUser(data: { username: string; name: string; email: string; role: 'ADMIN' | 'DISTRIBUTOR' | 'RETAILER'; password: string; distributorId?: string; balance?: number }) {
  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      username: data.username, name: data.name, email: data.email, role: data.role,
      passwordHash: await hash(data.password), distributorId: data.distributorId,
      wallet: { create: { balance: new Prisma.Decimal(data.balance ?? 0) } },
    },
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed in production.');

  const admin = await upsertUser({ username: 'admin', name: 'Platform Admin', email: 'admin@example.test', role: 'ADMIN', password: 'Admin@12345' });
  const dist1 = await upsertUser({ username: 'distributor1', name: 'Distributor One', email: 'dist1@example.test', role: 'DISTRIBUTOR', password: 'Distributor@123', balance: 5000 });
  const dist2 = await upsertUser({ username: 'distributor2', name: 'Distributor Two', email: 'dist2@example.test', role: 'DISTRIBUTOR', password: 'Distributor@123', balance: 5000 });

  const retailers = [
    { username: 'retailer1', name: 'Retailer One', dist: dist1.id },
    { username: 'retailer2', name: 'Retailer Two', dist: dist1.id },
    { username: 'retailer3', name: 'Retailer Three', dist: dist2.id },
    { username: 'retailer4', name: 'Retailer Four', dist: dist2.id },
  ];
  for (const r of retailers) {
    await upsertUser({ username: r.username, name: r.name, email: `${r.username}@example.test`, role: 'RETAILER', password: 'Retailer@123', distributorId: r.dist, balance: 1000 });
  }

  const cats: Record<string, string> = {};
  for (const [i, name] of ['Instagram', 'YouTube', 'TikTok'].entries()) {
    const c = await prisma.category.upsert({ where: { name }, create: { name, sortOrder: i }, update: {} });
    cats[name] = c.id;
  }

  let provider = await prisma.provider.findFirst({ where: { name: 'Mock Provider (dev)' } });
  if (!provider) {
    provider = await prisma.provider.create({
      data: { name: 'Mock Provider (dev)', apiUrl: 'http://localhost/mock', adapterKey: 'mock', apiKeyEncrypted: encryptDevSecret('dev-mock-key') },
    });
  }

  const defs = [
    { pid: '1001', name: 'Instagram Followers - Standard', cat: 'Instagram', cost: 90, min: 100, max: 100000, drip: true, refill: true, cancel: true },
    { pid: '1002', name: 'YouTube Views - Standard', cat: 'YouTube', cost: 40, min: 500, max: 1000000, drip: false, refill: false, cancel: false },
    { pid: '1003', name: 'TikTok Likes - Standard', cat: 'TikTok', cost: 60, min: 50, max: 50000, drip: false, refill: true, cancel: true },
  ];
  for (const d of defs) {
    const ps = await prisma.providerService.upsert({
      where: { providerId_providerServiceId: { providerId: provider.id, providerServiceId: d.pid } },
      create: { providerId: provider.id, providerServiceId: d.pid, name: `Mock ${d.name}`, costPrice: d.cost, min: d.min, max: d.max, dripfeedSupported: d.drip, refillSupported: d.refill, cancelSupported: d.cancel },
      update: {},
    });
    const exists = await prisma.service.findFirst({ where: { providerServiceId: ps.id } });
    if (!exists) {
      await prisma.service.create({
        data: {
          name: d.name, categoryId: cats[d.cat], providerServiceId: ps.id, costPrice: d.cost,
          adminMarkupType: 'PERCENTAGE', adminMarkupValue: 10, minQuantity: d.min, maxQuantity: d.max,
          dripfeedEnabled: d.drip, refillEnabled: d.refill, cancelEnabled: d.cancel,
        },
      });
    }
  }

  if ((await prisma.pricingRule.count()) === 0) {
    await prisma.pricingRule.create({ data: { scope: 'GLOBAL', targetRole: 'RETAILER', markupType: 'PERCENTAGE', markupValue: 10 } });
  }
  if ((await prisma.paymentMethod.count()) === 0) {
    await prisma.paymentMethod.create({ data: { name: 'UPI (dev placeholder)', type: 'UPI', config: { upiId: 'yourbrand@upi' } } });
  }

  console.log('Seed complete. Dev logins (DEVELOPMENT ONLY):');
  console.log('  admin / Admin@12345');
  console.log('  distributor1, distributor2 / Distributor@123');
  console.log('  retailer1..retailer4 / Retailer@123');
  void admin;
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
