import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { resolveRange } from '@/lib/date-range';
import { getOrderReport } from '@/server/services/report.service';
import { toCsv } from '@/lib/csv';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== 'ACTIVE') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const { start, end } = resolveRange(sp.get('range') ?? undefined, sp.get('from') ?? undefined, sp.get('to') ?? undefined);
  const report = await getOrderReport(user, start, end);

  const header = ['Order', 'Date', 'Retailer', 'Service', 'Link', 'Quantity', 'Charge', 'Status'];
  if (user.role !== 'RETAILER') header.push('Profit');
  if (user.role === 'ADMIN') header.push('Provider Cost');

  const rows = report.orders.map((o) => {
    const row: (string | number)[] = [o.orderNumber, o.createdAt.toISOString(), o.retailer.name, o.service.name, o.link, o.quantity, o.charge.toFixed(4), o.status];
    if (user.role !== 'RETAILER') row.push(o.profit.toFixed(4));
    if (user.role === 'ADMIN') row.push(o.providerCost.toFixed(4));
    return row;
  });

  return new NextResponse(toCsv([header, ...rows]), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-report.csv"`,
    },
  });
}
