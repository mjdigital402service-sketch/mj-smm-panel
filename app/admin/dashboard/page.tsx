import {
  Users,
  Store,
  ShoppingCart,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Activity,
  IndianRupee,
  Server,
  BarChart3,
} from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { StatCard } from '@/components/shared/stat-card';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { OrderStatusBadge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/brand.config';
import { RevenueChart } from './revenue-chart';

async function getDashboardData() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalDistributors,
    activeDistributors,
    totalRetailers,
    activeRetailers,
    totalOrders,
    pendingOrders,
    processingOrders,
    completedOrders,
    cancelledOrders,
    revenueAgg,
    todayRevenueAgg,
    recentOrders,
    last14DaysOrders,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'DISTRIBUTOR' } }),
    prisma.user.count({
      where: { role: 'DISTRIBUTOR', status: 'ACTIVE' },
    }),
    prisma.user.count({ where: { role: 'RETAILER' } }),
    prisma.user.count({
      where: { role: 'RETAILER', status: 'ACTIVE' },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({
      where: { status: { in: ['PROCESSING', 'IN_PROGRESS'] } },
    }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.order.count({
      where: { status: { in: ['CANCELLED', 'FAILED'] } },
    }),
    prisma.order.aggregate({
      _sum: {
        charge: true,
        profit: true,
        providerCost: true,
      },
    }),
    prisma.order.aggregate({
      _sum: {
        charge: true,
        profit: true,
      },
      where: {
        createdAt: {
          gte: startOfToday,
        },
      },
    }),
    prisma.order.findMany({
      take: 8,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        retailer: true,
        service: true,
      },
    }),
    prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 13 * 86400000),
        },
      },
      select: {
        createdAt: true,
        charge: true,
        profit: true,
      },
    }),
  ]);

  const dayBuckets: Record<
    string,
    {
      revenue: number;
      profit: number;
    }
  > = {};

  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);

    dayBuckets[d.toISOString().slice(0, 10)] = {
      revenue: 0,
      profit: 0,
    };
  }

  for (const o of last14DaysOrders) {
    const key = o.createdAt.toISOString().slice(0, 10);

    if (dayBuckets[key]) {
      dayBuckets[key].revenue += Number(o.charge);
      dayBuckets[key].profit += Number(o.profit);
    }
  }

  return {
    totalDistributors,
    activeDistributors,
    totalRetailers,
    activeRetailers,
    totalOrders,
    pendingOrders,
    processingOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue: Number(revenueAgg._sum.charge ?? 0),
    totalCost: Number(revenueAgg._sum.providerCost ?? 0),
    totalProfit: Number(revenueAgg._sum.profit ?? 0),
    todayRevenue: Number(todayRevenueAgg._sum.charge ?? 0),
    todayProfit: Number(todayRevenueAgg._sum.profit ?? 0),
    recentOrders,
    chartData: Object.entries(dayBuckets).map(([date, v]) => ({
      date: date.slice(5),
      ...v,
    })),
  };
}

export default async function AdminDashboardPage() {
  const d = await getDashboardData();

  return (
    <div className="min-h-full space-y-6 pb-8">
      {/* =====================================================
          DASHBOARD HEADER
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-600/15 md:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-sm">
              <Activity className="h-3.5 w-3.5 text-cyan-200" />
              <span>Platform Overview</span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              Monitor your entire SMM platform, orders, users, revenue and
              business performance from one place.
            </p>
          </div>

          {/* Today summary */}
          <div className="min-w-[220px] rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
                  Today Revenue
                </p>

                <p className="mt-1 text-2xl font-extrabold">
                  {formatCurrency(d.todayRevenue)}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                <IndianRupee className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-100">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
              <span>
                Today's profit {formatCurrency(d.todayProfit)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          PEOPLE & ORDER OVERVIEW
      ====================================================== */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Platform Overview
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Users and order activity
            </p>
          </div>

          <div className="hidden items-center gap-1.5 text-xs font-medium text-slate-400 sm:flex">
            <Activity className="h-3.5 w-3.5" />
            Live data
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Distributors"
            value={`${d.activeDistributors} / ${d.totalDistributors}`}
            icon={Users}
            trend="active / total"
          />

          <StatCard
            label="Retailers"
            value={`${d.activeRetailers} / ${d.totalRetailers}`}
            icon={Store}
            trend="active / total"
          />

          <StatCard
            label="Total Orders"
            value={d.totalOrders}
            icon={ShoppingCart}
          />

          <StatCard
            label="Pending Orders"
            value={d.pendingOrders}
            icon={Clock}
            tone="warning"
          />
        </div>
      </section>

      {/* =====================================================
          ORDER STATUS
      ====================================================== */}
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold text-slate-900">
            Order Status
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Current order processing overview
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Processing"
            value={d.processingOrders}
            icon={TrendingUp}
            tone="default"
          />

          <StatCard
            label="Completed"
            value={d.completedOrders}
            icon={CheckCircle2}
            tone="success"
          />

          <StatCard
            label="Cancelled / Failed"
            value={d.cancelledOrders}
            icon={XCircle}
            tone="destructive"
          />

          <StatCard
            label="Today's Profit"
            value={formatCurrency(d.todayProfit)}
            icon={Wallet}
            tone="success"
          />
        </div>
      </section>

      {/* =====================================================
          FINANCIAL OVERVIEW
      ====================================================== */}
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold text-slate-900">
            Financial Overview
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Platform-wide revenue, provider cost and profit
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Revenue */}
          <Card className="group overflow-hidden rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Total Revenue
                  </p>

                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                    {formatCurrency(d.totalRevenue)}
                  </p>

                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>Platform revenue</span>
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-105">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Cost */}
          <Card className="group overflow-hidden rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Provider Cost
                  </p>

                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                    {formatCurrency(d.totalCost)}
                  </p>

                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-600">
                    <Server className="h-3.5 w-3.5" />
                    <span>Total service cost</span>
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform group-hover:scale-105">
                  <Server className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profit */}
          <Card className="group overflow-hidden rounded-2xl border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Total Profit
                  </p>

                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-emerald-600">
                    {formatCurrency(d.totalProfit)}
                  </p>

                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Net platform profit</span>
                  </div>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-105">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* =====================================================
          REVENUE CHART
      ====================================================== */}
      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 px-5 py-4 md:px-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <BarChart3 className="h-4 w-4" />
                </span>

                Revenue &amp; Profit
              </CardTitle>

              <p className="mt-1 text-xs text-slate-500">
                Performance over the last 14 days
              </p>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Revenue
              </div>

              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Profit
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6">
          <RevenueChart data={d.chartData} />
        </CardContent>
      </Card>

      {/* =====================================================
          RECENT ORDERS
      ====================================================== */}
      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 px-5 py-4 md:px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <ShoppingCart className="h-4 w-4" />
                </span>

                Recent Orders
              </CardTitle>

              <p className="mt-1 text-xs text-slate-500">
                Latest activity across the platform
              </p>
            </div>

            <div className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-500 sm:flex">
              <Clock className="h-3 w-3" />
              Latest 8
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Order
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Retailer
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Service
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Charge
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {d.recentOrders.map((o: any) => (
                  <tr
                    key={o.id}
                    className="border-b border-slate-100 transition-colors last:border-0 hover:bg-blue-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <ShoppingCart className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="font-bold text-slate-800">
                            #{o.orderNumber}
                          </p>

                          <p className="mt-0.5 text-[10px] text-slate-400">
                            Order ID
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[150px] truncate font-semibold text-slate-700">
                        {o.retailer.name}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[240px] truncate text-slate-600">
                        {o.service.name}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">
                        {formatCurrency(o.charge.toNumber())}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <OrderStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}

                {d.recentOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center"
                    >
                      <div className="mx-auto flex max-w-xs flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <ShoppingCart className="h-5 w-5" />
                        </div>

                        <p className="mt-3 text-sm font-semibold text-slate-700">
                          No orders yet
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Recent orders will appear here once customers
                          start placing orders.
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

      {/* =====================================================
          BOTTOM SUMMARY
      ====================================================== */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold text-blue-700">
                Active Network
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-800">
                {d.activeDistributors + d.activeRetailers} active users
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold text-emerald-700">
                Completed Orders
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-800">
                {d.completedOrders} completed
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Clock className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold text-amber-700">
                Attention Required
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-800">
                {d.pendingOrders} pending orders
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}