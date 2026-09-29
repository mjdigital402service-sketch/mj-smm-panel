import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateUserForm } from '@/components/shared/create-user-form';
import { RetailerRowActions } from '@/components/shared/retailer-row-actions';
import { distributorCreateRetailerAction } from '@/server/actions/distributor.actions';
import { formatCurrency } from '@/lib/brand.config';

export default async function DistributorRetailersPage() {
  const user = await requireUser(['DISTRIBUTOR']);

  const retailers = await prisma.user.findMany({
    where: { distributorId: user.id },
    include: {
      wallet: true,
      ordersPlaced: {
        select: {
          charge: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Retailers
        </h1>

        <p className="text-sm text-muted-foreground">
          Create and manage your own retailers.
        </p>
      </div>

      <CreateUserForm
        title="Retailer"
        action={distributorCreateRetailerAction}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            Your Retailers ({retailers.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Wallet</th>
                <th className="pb-2 font-medium">Orders</th>
                <th className="pb-2 font-medium">Spending</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {retailers.map((r: any) => (
                <tr
                  key={r.id}
                  className="border-b border-border align-top last:border-0"
                >
                  <td className="py-3">
                    <p className="font-medium">
                      {r.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      @{r.username} · {r.email}
                    </p>
                  </td>

                  <td className="py-3">
                    {formatCurrency(
                      r.wallet?.balance?.toNumber?.() ?? 0,
                    )}
                  </td>

                  <td className="py-3">
                    {r.ordersPlaced.length}
                  </td>

                  <td className="py-3">
                    {formatCurrency(
                      r.ordersPlaced.reduce(
                        (s: number, o: any) =>
                          s + Number(o.charge),
                        0,
                      ),
                    )}
                  </td>

                  <td className="py-3">
                    <Badge
                      variant={
                        r.status === 'ACTIVE'
                          ? 'success'
                          : 'destructive'
                      }
                    >
                      {r.status}
                    </Badge>
                  </td>

                  <td className="py-3">
                    <RetailerRowActions
                      retailerId={r.id}
                      status={r.status}
                    />
                  </td>
                </tr>
              ))}

              {retailers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No retailers yet.
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