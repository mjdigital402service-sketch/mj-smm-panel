import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/session';

/** Scopes an Order query to what the current role is allowed to see. */
export function orderScope(user: SessionUser): Prisma.OrderWhereInput {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'DISTRIBUTOR') return { distributorId: user.id };
  return { retailerId: user.id };
}

export async function getOrderReport(user: SessionUser, start: Date, end: Date) {
  const where: Prisma.OrderWhereInput = { ...orderScope(user), createdAt: { gte: start, lt: end } };

  const [orders, agg, byStatus, byService] = await Promise.all([
    prisma.order.findMany({ where, include: { service: true, retailer: true }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.order.aggregate({ where, _sum: { charge: true, providerCost: true, profit: true }, _count: true }),
    prisma.order.groupBy({ by: ['status'], where, _count: true }),
    prisma.order.groupBy({ by: ['serviceId'], where, _count: true, _sum: { charge: true }, orderBy: { _sum: { charge: 'desc' } }, take: 10 }),
  ]);

  const services = await prisma.service.findMany({ where: { id: { in: byService.map((s) => s.serviceId) } }, select: { id: true, name: true } });
  const nameById = Object.fromEntries(services.map((s) => [s.id, s.name]));

  const isAdmin = user.role === 'ADMIN';
  return {
    orders,
    totals: {
      count: agg._count,
      revenue: Number(agg._sum.charge ?? 0),
      // Provider cost is only ever surfaced to Admin.
      providerCost: isAdmin ? Number(agg._sum.providerCost ?? 0) : null,
      profit: user.role === 'RETAILER' ? null : Number(agg._sum.profit ?? 0),
    },
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    topServices: byService.map((s) => ({ name: nameById[s.serviceId] ?? 'Unknown', count: s._count, revenue: Number(s._sum.charge ?? 0) })),
  };
}
