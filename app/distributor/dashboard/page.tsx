import {
  Wallet,
  Store,
  ShoppingCart,
  TrendingUp,
  Clock,
  Users,
  ArrowUpRight,
  Activity,
  CircleDollarSign,
  UserCheck,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { StatCard } from '@/components/shared/stat-card';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/brand.config';
import { getWalletBalance } from '@/server/services/wallet.service';

export default async function DistributorDashboard() {
  const user = await requireUser(['DISTRIBUTOR']);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    balance,
    totalRetailers,
    activeRetailers,
    totalOrders,
    todayOrders,
    pending,
    agg,
    recent,
  ] = await Promise.all([
    getWalletBalance(user.id),

    prisma.user.count({
      where: { distributorId: user.id },
    }),

    prisma.user.count({
      where: {
        distributorId: user.id,
        status: 'ACTIVE',
      },
    }),

    prisma.order.count({
      where: { distributorId: user.id },
    }),

    prisma.order.count({
      where: {
        distributorId: user.id,
        createdAt: { gte: startOfToday },
      },
    }),

    prisma.order.count({
      where: {
        distributorId: user.id,
        status: {
          in: ['PENDING', 'PROCESSING', 'IN_PROGRESS'],
        },
      },
    }),

    prisma.order.aggregate({
      where: { distributorId: user.id },
      _sum: {
        charge: true,
        profit: true,
      },
    }),

    prisma.order.findMany({
      where: { distributorId: user.id },
      include: {
        retailer: true,
        service: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 8,
    }),
  ]);

  const totalSales = Number(agg._sum.charge ?? 0);
  const totalProfit = Number(agg._sum.profit ?? 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 text-white shadow-lg sm:p-7">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 right-20 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 ring-1 ring-white/15">
              <Activity className="h-3.5 w-3.5" />
              Distributor Dashboard
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome, {user.name}
            </h1>

            <p className="mt-2 max-w-xl text-sm text-blue-100 sm:text-base">
              Manage your retailer network, monitor orders and track your
              business performance from one place.
            </p>
          </div>

          <div className="hidden shrink-0 sm:block">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-blue-100">
                Available Balance
              </p>

              <p className="mt-1 text-2xl font-bold">
                {formatCurrency(balance.toNumber())}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Wallet Balance"
          value={formatCurrency(balance.toNumber())}
          icon={Wallet}
          tone="primary"
        />

        <StatCard
          label="Retailers"
          value={`${activeRetailers} / ${totalRetailers}`}
          icon={Store}
          trend="active / total"
          tone="info"
        />

        <StatCard
          label="Total Orders"
          value={totalOrders}
          icon={ShoppingCart}
          trend={`${todayOrders} today`}
          tone="primary"
        />

        <StatCard
          label="Pending Orders"
          value={pending}
          icon={Clock}
          tone="warning"
        />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Sales
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight">
                  {formatCurrency(totalSales)}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Lifetime sales generated
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <CircleDollarSign className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Profit
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalProfit)}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Your total distributor profit
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
              Business performance
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Retailers
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight">
                  {activeRetailers}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Out of {totalRetailers} total retailers
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs font-medium text-violet-600 dark:text-violet-400">
              <Users className="h-4 w-4" />
              Retailer network
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="overflow-hidden border-border/70 bg-card shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">
                Recent Orders
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Latest orders placed by your retailer network
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 sm:flex">
              <ShoppingCart className="h-3.5 w-3.5" />
              {recent.length} recent
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/20 text-left">
                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Order
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Retailer
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Service
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Charge
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {recent.map((o: any) => (
                  <tr
                    key={o.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="font-semibold text-foreground">
                        #{o.orderNumber}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          {o.retailer.name?.charAt(0)?.toUpperCase() || 'R'}
                        </div>

                        <span className="whitespace-nowrap font-medium">
                          {o.retailer.name}
                        </span>
                      </div>
                    </td>

                    <td className="max-w-[260px] px-5 py-4">
                      <span className="line-clamp-1 text-muted-foreground">
                        {o.service.name}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-semibold">
                      {formatCurrency(o.charge.toNumber())}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <OrderStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}

                {recent.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                        </div>

                        <p className="mt-3 font-medium">
                          No orders yet
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          Orders from your retailer network will appear here.
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-border/70 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm dark:from-blue-500/5 dark:to-indigo-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Store className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Retailer Network
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {activeRetailers} active retailers are currently connected
                  to your distributor account.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm dark:from-emerald-500/5 dark:to-teal-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <TrendingUp className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Profit Overview
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Your accumulated distributor profit is{' '}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalProfit)}
                  </span>
                  .
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}