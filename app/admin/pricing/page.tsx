import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPricingRuleAction } from '@/server/actions/payment.actions';
import { PricingRuleDelete } from './pricing-rule-delete';

export default async function AdminPricingPage() {
  const [rules, categories, services] = await Promise.all([
    prisma.pricingRule.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.category.findMany(),
    prisma.service.findMany({ select: { id: true, name: true } }),
  ]);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pricing Rules</h1>
        <p className="text-sm text-muted-foreground">
          Default markup rules for Distributors and Retailers. Explicit per-user overrides always win over these rules.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add Rule</CardTitle></CardHeader>
        <CardContent>
          <form action={createPricingRuleAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Scope</Label>
              <select name="scope" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="GLOBAL">Global</option>
                <option value="CATEGORY">Category</option>
                <option value="SERVICE">Service</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Applies to</Label>
              <select name="targetRole" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="DISTRIBUTOR">Distributor</option>
                <option value="RETAILER">Retailer</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Category (if scoped)</Label>
              <select name="categoryId" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Service (if scoped)</Label>
              <select name="serviceId" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">—</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Markup</Label>
              <div className="flex gap-2">
                <select name="markupType" className="flex h-10 rounded-lg border border-input bg-background px-2 text-sm">
                  <option value="PERCENTAGE">%</option>
                  <option value="FIXED">Fixed</option>
                </select>
                <Input name="markupValue" type="number" step="0.01" required />
              </div>
            </div>
            <div className="flex items-end lg:col-span-5"><Button type="submit">Add Rule</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Active Rules ({rules.length})</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-3">
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{r.scope}</Badge>
                  <Badge>{r.targetRole}</Badge>
                  <span className="font-medium">
                    {r.markupType === 'PERCENTAGE' ? `${r.markupValue}%` : `Fixed ${r.markupValue}`}
                  </span>
                </div>
                {r.categoryId && <p className="mt-1 text-xs text-muted-foreground">Category: {categoryMap[r.categoryId]}</p>}
                {r.serviceId && <p className="mt-1 text-xs text-muted-foreground">Service: {serviceMap[r.serviceId]}</p>}
              </div>
              <PricingRuleDelete id={r.id} />
            </div>
          ))}
          {rules.length === 0 && <p className="py-6 text-center text-muted-foreground">No pricing rules yet — services default to admin markup only.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
