import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/brand.config';
import { OrderCancelButton } from '@/components/shared/order-cancel-button';
import type { OrderStatus } from '@prisma/client';

export default async function AdminOrdersPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const where: any = {};
  if (searchParams.status) where.status = searchParams.status as OrderStatus;
  if (searchParams.q) {
    where.OR = [
      { link: { contains: searchParams.q, mode: 'insensitive' } },
      { retailer: { name: { contains: searchParams.q, mode: 'insensitive' } } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    include: { retailer: true, service: true, provider: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const statuses: OrderStatus[] = ['PENDING', 'PROCESSING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELLED', 'REFUNDED', 'FAILED'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">All orders across every distributor and retailer.</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          <a href="/admin/orders" className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">All</a>
          {statuses.map((s) => (
            <a key={s} href={`/admin/orders?status=${s}`} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">
              {s.replace('_', ' ')}
            </a>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Orders ({orders.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">Order</th>
                <th className="pb-2 font-medium">Retailer</th>
                <th className="pb-2 font-medium">Service</th>
                <th className="pb-2 font-medium">Provider</th>
                <th className="pb-2 font-medium">Qty</th>
                <th className="pb-2 font-medium">Charge</th>
                <th className="pb-2 font-medium">Profit</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="py-2.5">#{o.orderNumber}</td>
                  <td className="py-2.5">{o.retailer.name}</td>
                  <td className="py-2.5 max-w-[160px] truncate">{o.service.name}</td>
                  <td className="py-2.5 text-xs">{o.provider?.name ?? '—'}</td>
                  <td className="py-2.5">{o.quantity}</td>
                  <td className="py-2.5">{formatCurrency(o.charge.toNumber())}</td>
                  <td className="py-2.5 text-success">{formatCurrency(o.profit.toNumber())}</td>
                  <td className="py-2.5"><OrderStatusBadge status={o.status} /></td>
                  <td className="py-2.5 text-right">
                    {['PENDING', 'PROCESSING', 'IN_PROGRESS'].includes(o.status) && <OrderCancelButton orderId={o.id} />}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No orders match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
