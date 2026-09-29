import {
  Package,
  Plus,
  Layers3,
  Server,
  CircleDollarSign,
  Settings2,
  Activity,
  ShieldCheck,
  TrendingUp,
  Download,
} from 'lucide-react';

import { prisma } from '@/lib/prisma';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  createServiceAction,
  toggleServiceAction,
} from '@/server/actions/catalog.actions';
import { computeAdminPrice } from '@/server/services/pricing.service';
import { formatCurrency } from '@/lib/brand.config';
import { ServiceToggle } from './service-toggle';
import { ProviderImportButton } from './provider-import-button';

export default async function AdminServicesPage() {
  const [services, categories, providerServices] = await Promise.all([
    prisma.service.findMany({
      include: { category: true },
      orderBy: { sortOrder: 'asc' },
    }),

    prisma.category.findMany({
      where: { isActive: true },
    }),

    prisma.providerService.findMany({
      include: { provider: true },
    }),
  ]);

  const activeServices = services.filter(
    (s: any) => s.isActive,
  ).length;

  const inactiveServices = services.length - activeServices;

  const averageCost =
    services.length > 0
      ? services.reduce(
          (sum: number, s: any) =>
            sum + s.costPrice.toNumber(),
          0,
        ) / services.length
      : 0;

  // Group synced provider services by provider
  const providerMap = new Map<
    string,
    {
      id: string;
      name: string;
      serviceCount: number;
    }
  >();

  for (const providerService of providerServices) {
    const providerId = providerService.provider.id;

    const existing = providerMap.get(providerId);

    if (existing) {
      existing.serviceCount += 1;
    } else {
      providerMap.set(providerId, {
        id: providerId,
        name: providerService.provider.name,
        serviceCount: 1,
      });
    }
  }

  const providers = Array.from(providerMap.values());

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 text-white shadow-lg sm:p-7">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 right-20 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 ring-1 ring-white/15">
              <Package className="h-3.5 w-3.5" />
              Service Management
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Services
            </h1>

            <p className="mt-2 max-w-xl text-sm text-blue-100 sm:text-base">
              Manage your service catalog, provider mappings and admin resale
              pricing from one place.
            </p>
          </div>

          <div className="hidden shrink-0 sm:block">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-blue-100">
                Total Services
              </p>

              <p className="mt-1 text-2xl font-bold">
                {services.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Total Services
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight">
                {services.length}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Package className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Active Services
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {activeServices}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Inactive
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-red-600 dark:text-red-400">
                {inactiveServices}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Categories
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight">
                {categories.length}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
              <Layers3 className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Provider Import */}
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Download className="h-5 w-5" />
            </div>

            <div>
              <CardTitle className="text-base">
                Import Provider Services
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Import synced provider services into your website service
                catalog without creating duplicates.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {providers.length > 0 ? (
            <div className="space-y-3">
              {providers.map((provider: any) => (
                <div
                  key={provider.id}
                  className="flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                      <Server className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-semibold">
                        {provider.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {provider.serviceCount.toLocaleString()} synced
                        provider services
                      </p>
                    </div>
                  </div>

                  <ProviderImportButton
                    providerId={provider.id}
                    providerName={provider.name}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
              <Server className="mx-auto h-8 w-8 text-muted-foreground" />

              <p className="mt-3 font-medium">
                No synced provider services
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Sync a provider first, then import its services here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Service */}
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Plus className="h-5 w-5" />
            </div>

            <div>
              <CardTitle className="text-base">
                Add New Service
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Create a service and configure its provider mapping and
                pricing.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <form
            action={createServiceAction}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="name">Service name</Label>

              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Instagram Followers"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categoryId">Category</Label>

              <select
                id="categoryId"
                name="categoryId"
                required
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Select category...</option>

                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="providerServiceId">
                Provider Mapping
              </Label>

              <select
                id="providerServiceId"
                name="providerServiceId"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">None (manual)</option>

                {providerServices.map((ps: any) => (
                  <option key={ps.id} value={ps.id}>
                    {ps.provider.name} — {ps.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="costPrice">
                Cost price (per 1000)
              </Label>

              <Input
                id="costPrice"
                name="costPrice"
                type="number"
                step="0.0001"
                min="0"
                required
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adminMarkupValue">
                Admin markup (%)
              </Label>

              <Input
                id="adminMarkupValue"
                name="adminMarkupValue"
                type="number"
                step="0.01"
                defaultValue={10}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="minQuantity">
                Min quantity
              </Label>

              <Input
                id="minQuantity"
                name="minQuantity"
                type="number"
                defaultValue={100}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maxQuantity">
                Max quantity
              </Label>

              <Input
                id="maxQuantity"
                name="maxQuantity"
                type="number"
                defaultValue={100000}
                required
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/70 bg-muted/20 p-3 lg:col-span-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="dripfeedEnabled"
                  className="h-4 w-4 rounded border-border accent-blue-600"
                />
                Drip-feed
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="refillEnabled"
                  className="h-4 w-4 rounded border-border accent-blue-600"
                />
                Refill
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="cancelEnabled"
                  className="h-4 w-4 rounded border-border accent-blue-600"
                />
                Cancel
              </label>
            </div>

            <div className="flex items-end">
              <Button
                type="submit"
                className="h-10 w-full gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Services */}
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">
                All Services ({services.length})
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Manage service status, pricing and provider configuration.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              <Server className="h-3.5 w-3.5" />
              {providerServices.length} provider mappings
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/20 text-left">
                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    ID
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Service
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Category
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Cost
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Admin Price
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Min / Max
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {services.map((s: any) => (
                  <tr
                    key={s.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                        #{s.serviceCode}
                      </span>
                    </td>

                    <td className="max-w-[280px] px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                          <Package className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {s.name}
                          </p>

                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Service configuration
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                        {s.category.name}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />

                        <span className="font-medium">
                          {formatCurrency(s.costPrice.toNumber())}
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(
                          computeAdminPrice(s).toNumber(),
                        )}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="text-xs">
                        <span className="font-medium">
                          {s.minQuantity.toLocaleString()}
                        </span>

                        <span className="mx-1 text-muted-foreground">
                          /
                        </span>

                        <span className="font-medium">
                          {s.maxQuantity.toLocaleString()}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <Badge
                        variant={
                          s.isActive
                            ? 'success'
                            : 'destructive'
                        }
                      >
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <ServiceToggle
                          id={s.id}
                          isActive={s.isActive}
                        />
                      </div>
                    </td>
                  </tr>
                ))}

                {services.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-14 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>

                        <p className="mt-3 font-medium">
                          No services yet
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          Add your first service using the form above.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Info */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm dark:from-blue-500/5 dark:to-indigo-500/5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <CircleDollarSign className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Pricing Model
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Provider cost → Admin price → Distributor price →
                Retailer price
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-violet-50 to-purple-50 p-5 shadow-sm dark:from-violet-500/5 dark:to-purple-500/5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
              <Settings2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Provider Mapping
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {providerServices.length} provider services available
                for mapping.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm dark:from-emerald-500/5 dark:to-teal-500/5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Average Cost
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(averageCost)} average service cost
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}