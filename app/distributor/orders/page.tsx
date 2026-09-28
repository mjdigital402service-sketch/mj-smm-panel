import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/ui/badge';
import { OrderCancelButton } from '@/components/shared/order-cancel-button';
import { formatCurrency } from '@/lib/brand.config';

export default async function DistributorOrdersPage() {
  const user = await requireUser(['DISTRIBUTOR']);
  const orders = await prisma.order.findMany({
    where: { distributorId: user.id },
    include: { retailer: true, service: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Orders</h1><p className="text-sm text-muted-foreground">Orders placed by your retailers.</p></div>
      <Card>
        <CardHeader><CardTitle>Orders ({orders.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 font-medium">Order</th><th className="pb-2 font-medium">Retailer</th><th className="pb-2 font-medium">Service</th><th className="pb-2 font-medium">Qty</th><th className="pb-2 font-medium">Charge</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium text-right">Actions</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="py-2.5">#{o.orderNumber}</td><td className="py-2.5">{o.retailer.name}</td><td className="max-w-[160px] truncate py-2.5">{o.service.name}</td>
                  <td className="py-2.5">{o.quantity}</td><td className="py-2.5">{formatCurrency(o.charge.toNumber())}</td><td className="py-2.5"><OrderStatusBadge status={o.status} /></td>
                  <td className="py-2.5 text-right">{['PENDING', 'PROCESSING', 'IN_PROGRESS'].includes(o.status) && <OrderCancelButton orderId={o.id} />}</td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No orders yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
