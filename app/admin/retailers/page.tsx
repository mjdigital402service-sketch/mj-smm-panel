import {
  Users,
  UserCheck,
  Wallet,
  ShoppingCart,
  TrendingUp,
  Store,
  UserPlus,
} from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateUserForm } from '@/components/shared/create-user-form';
import { UserRowActions } from '@/components/shared/user-row-actions';
import { createUserAction } from '@/server/actions/admin-users.actions';
import { formatCurrency } from '@/lib/brand.config';

export default async function AdminRetailersPage() {
  const [retailers, distributors] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'RETAILER' },
      include: {
        wallet: true,
        distributor: true,
        ordersPlaced: {
          select: { charge: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.user.findMany({
      where: {
        role: 'DISTRIBUTOR',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  const activeRetailers = retailers.filter(
    (r: any) => r.status === 'ACTIVE',
  ).length;

  const inactiveRetailers = retailers.length - activeRetailers;

  const totalWallet = retailers.reduce(
    (sum: number, r: any) =>
      sum + (r.wallet?.balance?.toNumber?.() ?? 0),
    0,
  );

  const totalOrders = retailers.reduce(
    (sum: number, r: any) => sum + r.ordersPlaced.length,
    0,
  );

  const totalSpending = retailers.reduce(
    (sum: number, r: any) =>
      sum +
      r.ordersPlaced.reduce(
        (orderSum: number, o: any) =>
          orderSum + Number(o.charge),
        0,
      ),
    0,
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 text-white shadow-lg sm:p-7">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 right-20 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 ring-1 ring-white/15">
              <Users className="h-3.5 w-3.5" />
              Retailer Management
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Retailers
            </h1>

            <p className="mt-2 max-w-xl text-sm text-blue-100 sm:text-base">
              Create, monitor and manage retailer accounts across your
              distributor network.
            </p>
          </div>

          <div className="hidden shrink-0 sm:block">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-blue-100">
                Total Retailers
              </p>

              <p className="mt-1 text-2xl font-bold">
                {retailers.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Total Retailers
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight">
                {retailers.length}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Active
              </p>

              <p className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {activeRetailers}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <UserCheck className="h-5 w-5" />
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
                {inactiveRetailers}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Wallet Balance
              </p>

              <p className="mt-2 text-xl font-extrabold tracking-tight">
                {formatCurrency(totalWallet)}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Total Spending
              </p>

              <p className="mt-2 text-xl font-extrabold tracking-tight">
                {formatCurrency(totalSpending)}
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Create Retailer */}
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <UserPlus className="h-5 w-5" />
            </div>

            <div>
              <CardTitle className="text-base">
                Create Retailer
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Add a new retailer and assign them to an active distributor.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <CreateUserForm
            title="Retailer"
            distributors={distributors}
            action={createUserAction.bind(null, 'RETAILER')}
          />
        </CardContent>
      </Card>

      {/* Retailer Table */}
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">
                All Retailers ({retailers.length})
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Manage retailer accounts, balances and activity.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              <ShoppingCart className="h-3.5 w-3.5" />
              {totalOrders} total orders
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/20 text-left">
                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Retailer
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Distributor
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Wallet
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Orders
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Spending
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
                {retailers.map((r: any) => {
                  const spending = r.ordersPlaced.reduce(
                    (s: number, o: any) =>
                      s + Number(o.charge),
                    0,
                  );

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border/60 align-middle transition-colors last:border-0 hover:bg-muted/30"
                    >
                      {/* Retailer */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
                            {r.name?.charAt(0)?.toUpperCase() || 'R'}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {r.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              @{r.username}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Distributor */}
                      <td className="px-5 py-4">
                        {r.distributor ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                              <Store className="h-3.5 w-3.5" />
                            </div>

                            <span className="whitespace-nowrap text-xs font-medium">
                              {r.distributor.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>

                      {/* Wallet */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="font-semibold">
                          {formatCurrency(
                            r.wallet?.balance?.toNumber?.() ?? 0,
                          )}
                        </span>
                      </td>

                      {/* Orders */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">
                            {r.ordersPlaced.length}
                          </span>
                        </div>
                      </td>

                      {/* Spending */}
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="font-semibold">
                          {formatCurrency(spending)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
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

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <UserRowActions
                            userId={r.id}
                            status={r.status}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {retailers.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>

                        <p className="mt-3 font-medium">
                          No retailers yet
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          Create your first retailer account using the form
                          above.
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

      {/* Bottom Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm dark:from-blue-500/5 dark:to-indigo-500/5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <UserCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold">Active Network</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeRetailers} active retailers
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-violet-50 to-purple-50 p-5 shadow-sm dark:from-violet-500/5 dark:to-purple-500/5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
              <ShoppingCart className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold">Order Activity</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {totalOrders} orders placed
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm dark:from-emerald-500/5 dark:to-teal-500/5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Wallet className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold">Network Balance</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(totalWallet)} total wallet balance
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}