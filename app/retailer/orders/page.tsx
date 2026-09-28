import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/brand.config';
import type { OrderStatus } from '@prisma/client';

const PAGE_SIZE = 25;
const STATUSES: OrderStatus[] = ['PENDING', 'PROCESSING', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELLED', 'REFUNDED', 'FAILED'];

export default async function RetailerOrdersPage({ searchParams }: { searchParams: { status?: string; q?: string; page?: string } }) {
  const user = await requireUser(['RETAILER']);
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const status = STATUSES.includes(searchParams.status as OrderStatus) ? (searchParams.status as OrderStatus) : undefined;
  const where = {
    retailerId: user.id,
    ...(status ? { status } : {}),
    ...(searchParams.q ? { OR: [{ link: { contains: searchParams.q, mode: 'insensitive' as const } }, { service: { name: { contains: searchParams.q, mode: 'insensitive' as const } } }] } : {}),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, include: { service: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `/retailer/orders?page=${p}${status ? `&status=${status}` : ''}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ''}`;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">My Orders</h1></div>
      <Card>
        <CardContent className="space-y-3 p-4">
          <form className="flex gap-2"><input name="q" defaultValue={searchParams.q} placeholder="Search link or service…" className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm" />{status && <input type="hidden" name="status" value={status} />}<button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Search</button></form>
          <div className="flex flex-wrap gap-2">
            <a href="/retailer/orders" className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent">All</a>
            {STATUSES.map((s) => <a key={s} href={`/retailer/orders?status=${s}`} className={`rounded-full border px-3 py-1 text-xs ${s === status ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent'}`}>{s.replace('_', ' ')}</a>)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{total} orders</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 font-medium">Order</th><th className="pb-2 font-medium">Service</th><th className="pb-2 font-medium">Link</th><th className="pb-2 font-medium">Qty</th><th className="pb-2 font-medium">Start</th><th className="pb-2 font-medium">Remains</th><th className="pb-2 font-medium">Charge</th><th className="pb-2 font-medium">Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="py-2.5">#{o.orderNumber}<p className="text-xs text-muted-foreground">{o.createdAt.toLocaleDateString()}</p></td>
                  <td className="max-w-[160px] truncate py-2.5">{o.service.name}</td>
                  <td className="max-w-[160px] truncate py-2.5 text-xs">{o.link}</td>
                  <td className="py-2.5">{o.quantity}</td><td className="py-2.5">{o.startCount ?? '—'}</td><td className="py-2.5">{o.remains ?? '—'}</td>
                  <td className="py-2.5">{formatCurrency(o.charge.toNumber())}</td><td className="py-2.5"><OrderStatusBadge status={o.status} /></td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No orders found.</td></tr>}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-between text-sm"><span className="text-muted-foreground">Page {page} of {pages}</span><div className="flex gap-2">{page > 1 && <a href={href(page - 1)} className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent">Previous</a>}{page < pages && <a href={href(page + 1)} className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent">Next</a>}</div></div>
        </CardContent>
      </Card>
    </div>
  );
}
