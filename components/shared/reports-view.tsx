import { requireUser } from '@/lib/session';
import { resolveRange, RANGE_LABELS, type RangeKey } from '@/lib/date-range';
import { getOrderReport } from '@/server/services/report.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/brand.config';

export async function ReportsView({ basePath, searchParams }: { basePath: string; searchParams: { range?: string; from?: string; to?: string } }) {
  const user = await requireUser(['ADMIN', 'DISTRIBUTOR', 'RETAILER']);
  const { key, start, end } = resolveRange(searchParams.range, searchParams.from, searchParams.to);
  const report = await getOrderReport(user, start, end);
  const qs = `range=${key}${searchParams.from ? `&from=${searchParams.from}` : ''}${searchParams.to ? `&to=${searchParams.to}` : ''}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">{start.toLocaleDateString()} – {new Date(end.getTime() - 1).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/export/orders?${qs}`} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">Export Orders CSV</a>
          <a href={`/api/export/transactions?${qs}`} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">Export Transactions CSV</a>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(RANGE_LABELS) as RangeKey[]).filter((k) => k !== 'custom').map((k) => (
              <a key={k} href={`${basePath}?range=${k}`} className={`rounded-full border px-3 py-1 text-xs ${k === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent'}`}>
                {RANGE_LABELS[k]}
              </a>
            ))}
          </div>
          <form className="flex flex-wrap items-end gap-2" action={basePath}>
            <input type="hidden" name="range" value="custom" />
            <label className="text-xs">From<input type="date" name="from" defaultValue={searchParams.from} className="ml-2 h-9 rounded-lg border border-input bg-background px-2 text-sm" /></label>
            <label className="text-xs">To<input type="date" name="to" defaultValue={searchParams.to} className="ml-2 h-9 rounded-lg border border-input bg-background px-2 text-sm" /></label>
            <button className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Apply</button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Orders</p><p className="text-2xl font-semibold">{report.totals.count}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">{user.role === 'RETAILER' ? 'Spending' : 'Revenue'}</p><p className="text-2xl font-semibold">{formatCurrency(report.totals.revenue)}</p></CardContent></Card>
        {report.totals.providerCost !== null && <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Provider Cost</p><p className="text-2xl font-semibold">{formatCurrency(report.totals.providerCost)}</p></CardContent></Card>}
        {report.totals.profit !== null && <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Profit</p><p className="text-2xl font-semibold text-success">{formatCurrency(report.totals.profit)}</p></CardContent></Card>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>By Status</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {report.byStatus.map((s) => <Badge key={s.status} variant="secondary">{s.status.replace('_', ' ')}: {s.count}</Badge>)}
            {report.byStatus.length === 0 && <p className="text-sm text-muted-foreground">No orders in this period.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top Services</CardTitle></CardHeader>
          <CardContent className="divide-y divide-border">
            {report.topServices.map((s) => (
              <div key={s.name} className="flex justify-between py-2 text-sm"><span className="truncate pr-3">{s.name}</span><span className="shrink-0 text-muted-foreground">{s.count} · {formatCurrency(s.revenue)}</span></div>
            ))}
            {report.topServices.length === 0 && <p className="text-sm text-muted-foreground">No data.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
