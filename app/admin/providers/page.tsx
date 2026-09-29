import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createProviderAction } from '@/server/actions/catalog.actions';
import { ProviderActions } from './provider-actions';
import { formatCurrency } from '@/lib/brand.config';

export default async function AdminProvidersPage() {
  const providers = await prisma.provider.findMany({
    include: { _count: { select: { services: true, orders: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Providers</h1>
        <p className="text-sm text-muted-foreground">
          Connect upstream providers. Credentials are encrypted at rest and never exposed to the browser.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createProviderAction}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">Provider name</Label>
              <Input id="name" name="name" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="apiUrl">API URL</Label>
              <Input
                id="apiUrl"
                name="apiUrl"
                placeholder="https://provider.example/api/v2"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="apiKey">API Key</Label>
              <Input id="apiKey" name="apiKey" type="password" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adapterKey">Adapter</Label>
              <select
                id="adapterKey"
                name="adapterKey"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="generic-http">
                  Generic HTTP (recommended)
                </option>
                <option value="mock">Mock / Development</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button type="submit">Add Provider</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Providers ({providers.length})</CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Adapter</th>
                <th className="pb-2 font-medium">Services</th>
                <th className="pb-2 font-medium">Orders</th>
                <th className="pb-2 font-medium">Balance</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {providers.map((p: any) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 font-medium">{p.name}</td>

                  <td className="py-3 text-xs">{p.adapterKey}</td>

                  <td className="py-3">{p._count.services}</td>

                  <td className="py-3">{p._count.orders}</td>

                  <td className="py-3">
                    {p.balance
                      ? formatCurrency(p.balance.toNumber())
                      : '—'}
                  </td>

                  <td className="py-3">
                    <Badge
                      variant={p.isActive ? 'success' : 'destructive'}
                    >
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>

                  <td className="py-3">
                    <ProviderActions
                      id={p.id}
                      isActive={p.isActive}
                    />
                  </td>
                </tr>
              ))}

              {providers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No providers configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}