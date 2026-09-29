import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RetailerPriceRow } from '@/components/shared/retailer-price-row';
import {
  getDistributorPrice,
  getRetailerPrice,
} from '@/server/services/pricing.service';
import { getSettings } from '@/server/services/settings.service';
import { formatCurrency } from '@/lib/brand.config';

export default async function DistributorPricingPage({
  searchParams,
}: {
  searchParams: { retailerId?: string };
}) {
  const user = await requireUser(['DISTRIBUTOR']);

  const [settings, retailers, services] = await Promise.all([
    getSettings(),
    prisma.user.findMany({
      where: { distributorId: user.id },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { isActive: true },
      select: {
        id: true,
        serviceCode: true,
        name: true,
      },
      orderBy: { serviceCode: 'asc' },
      take: 200,
    }),
  ]);

  const retailerId =
    searchParams.retailerId &&
    retailers.some((r: any) => r.id === searchParams.retailerId)
      ? searchParams.retailerId
      : undefined;

  const rows = retailerId
    ? await Promise.all(
        services.map(async (s: any) => ({
          ...s,
          cost: (
            await getDistributorPrice(s.id, user.id)
          ).toNumber(),
          current: (
            await getRetailerPrice(s.id, retailerId)
          ).toNumber(),
        })),
      )
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Retailer Pricing
        </h1>

        <p className="text-sm text-muted-foreground">
          Set per-retailer rates (per 1,000). Allowed range: your cost up to
          +{settings.maxRetailerMarkupPercent}%.
        </p>
      </div>

      {!settings.distributorCanSetRetailerPricing && (
        <Card>
          <CardContent className="p-4 text-sm text-warning">
            Retailer pricing has been disabled by the administrator.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <form
            className="flex gap-2"
            action="/distributor/pricing"
          >
            <select
              name="retailerId"
              defaultValue={retailerId ?? ''}
              className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a retailer…</option>

              {retailers.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Load
            </button>
          </form>
        </CardContent>
      </Card>

      {retailerId && (
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">
                    Service
                  </th>

                  <th className="pb-2 font-medium">
                    Your cost
                  </th>

                  <th className="pb-2 font-medium text-right">
                    Retailer price
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r: any) => (
                  <tr
                    key={r.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2.5">
                      #{r.serviceCode} {r.name}
                    </td>

                    <td className="py-2.5">
                      {formatCurrency(r.cost)}
                    </td>

                    <td className="py-2.5">
                      <RetailerPriceRow
                        retailerId={retailerId}
                        serviceId={r.id}
                        initial={r.current.toFixed(4)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}