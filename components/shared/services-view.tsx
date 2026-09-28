import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getDistributorPrice, getRetailerPrice } from '@/server/services/pricing.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/brand.config';

/** Provider identity and cost price are never selected or rendered here. */
export async function ServicesView({ basePath, searchParams }: { basePath: string; searchParams: { q?: string; category?: string } }) {
  const user = await requireUser(['DISTRIBUTOR', 'RETAILER']);
  const [categories, services] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.service.findMany({
      where: {
        isActive: true,
        category: { isActive: true },
        ...(searchParams.category ? { categoryId: searchParams.category } : {}),
        ...(searchParams.q ? { name: { contains: searchParams.q, mode: 'insensitive' } } : {}),
      },
      select: { id: true, serviceCode: true, name: true, description: true, minQuantity: true, maxQuantity: true, dripfeedEnabled: true, refillEnabled: true, cancelEnabled: true, category: { select: { name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { serviceCode: 'asc' }],
      take: 300,
    }),
  ]);

  const priced = await Promise.all(
    services.map(async (s) => ({
      ...s,
      rate: (user.role === 'DISTRIBUTOR' ? await getDistributorPrice(s.id, user.id) : await getRetailerPrice(s.id, user.id)).toNumber(),
    })),
  );

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Services</h1><p className="text-sm text-muted-foreground">Rates shown are per 1,000.</p></div>
      <Card>
        <CardContent className="p-4">
          <form action={basePath} className="flex flex-wrap gap-2">
            <input name="q" defaultValue={searchParams.q} placeholder="Search services…" className="h-10 min-w-[180px] flex-1 rounded-lg border border-input bg-background px-3 text-sm" />
            <select name="category" defaultValue={searchParams.category ?? ''} className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Filter</button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{priced.length} services</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 font-medium">ID</th><th className="pb-2 font-medium">Service</th><th className="pb-2 font-medium">Category</th><th className="pb-2 font-medium">Rate / 1000</th><th className="pb-2 font-medium">Min / Max</th><th className="pb-2 font-medium">Features</th></tr></thead>
            <tbody>
              {priced.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 text-xs">{s.serviceCode}</td>
                  <td className="py-2.5"><p className="font-medium">{s.name}</p>{s.description && <p className="max-w-md truncate text-xs text-muted-foreground">{s.description}</p>}</td>
                  <td className="py-2.5 text-xs">{s.category.name}</td>
                  <td className="py-2.5 font-medium">{formatCurrency(s.rate)}</td>
                  <td className="py-2.5 text-xs">{s.minQuantity} / {s.maxQuantity}</td>
                  <td className="py-2.5"><div className="flex flex-wrap gap-1">{s.dripfeedEnabled && <Badge variant="secondary">Drip</Badge>}{s.refillEnabled && <Badge variant="secondary">Refill</Badge>}{s.cancelEnabled && <Badge variant="secondary">Cancel</Badge>}</div></td>
                </tr>
              ))}
              {priced.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No services found.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
