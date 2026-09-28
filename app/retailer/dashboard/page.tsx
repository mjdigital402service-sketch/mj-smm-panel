import {
  Wallet,
  ShoppingCart,
  Clock,
  Loader,
  CheckCircle2,
  XCircle,
  CreditCard,
  ArrowRight,
  Activity,
  Sparkles,
} from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { getWalletBalance } from '@/server/services/wallet.service';
import { StatCard } from '@/components/shared/stat-card';
import { formatCurrency } from '@/lib/brand.config';

export default async function RetailerDashboard() {
  const user = await requireUser(['RETAILER']);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const base = { retailerId: user.id };

  const [
    balance,
    total,
    pending,
    processing,
    completed,
    cancelled,
    today,
  ] = await Promise.all([
    getWalletBalance(user.id),

    prisma.order.count({
      where: base,
    }),

    prisma.order.count({
      where: {
        ...base,
        status: 'PENDING',
      },
    }),

    prisma.order.count({
      where: {
        ...base,
        status: {
          in: ['PROCESSING', 'IN_PROGRESS'],
        },
      },
    }),

    prisma.order.count({
      where: {
        ...base,
        status: 'COMPLETED',
      },
    }),

    prisma.order.count({
      where: {
        ...base,
        status: {
          in: ['CANCELLED', 'FAILED', 'REFUNDED'],
        },
      },
    }),

    prisma.order.aggregate({
      where: {
        ...base,
        createdAt: {
          gte: startOfToday,
        },
        status: {
          notIn: ['FAILED', 'CANCELLED', 'REFUNDED'],
        },
      },
      _sum: {
        charge: true,
      },
    }),
  ]);

  const walletBalance = balance.toNumber();
  const todaySpending = Number(today._sum.charge ?? 0);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 text-white shadow-lg sm:p-7">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 right-20 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" />
              Retailer Dashboard
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome, {user.name}
            </h1>

            <p className="mt-2 max-w-xl text-sm text-blue-100 sm:text-base">
              Manage your orders, wallet and account activity from one place.
            </p>
          </div>

          <div className="hidden shrink-0 sm:block">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-blue-100">
                Wallet Balance
              </p>

              <p className="mt-1 text-2xl font-bold">
                {formatCurrency(walletBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Wallet Balance"
          value={formatCurrency(walletBalance)}
          icon={Wallet}
          tone="primary"
        />

        <StatCard
          label="Today's Spending"
          value={formatCurrency(todaySpending)}
          icon={CreditCard}
          trend="today"
          tone="info"
        />

        <StatCard
          label="Total Orders"
          value={total}
          icon={ShoppingCart}
          trend="all time"
          tone="primary"
        />

        <StatCard
          label="Pending Orders"
          value={pending}
          icon={Clock}
          tone="warning"
        />
      </div>

      {/* Order Status */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold tracking-tight">
            Order Overview
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Current status of your orders
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Processing"
            value={processing}
            icon={Loader}
            tone="info"
          />

          <StatCard
            label="Completed"
            value={completed}
            icon={CheckCircle2}
            tone="success"
          />

          <StatCard
            label="Cancelled / Failed"
            value={cancelled}
            icon={XCircle}
            tone="destructive"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-semibold tracking-tight">
            Quick Actions
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Access your most frequently used services
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* New Order */}
          <a
            href="/retailer/new-order"
            className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-blue-500/10 dark:from-blue-500/5 dark:to-indigo-500/5"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <ShoppingCart className="h-5 w-5" />
              </div>

              <ArrowRight className="h-4 w-4 text-blue-400 transition-transform duration-200 group-hover:translate-x-1" />
            </div>

            <h3 className="relative mt-4 font-semibold">
              Place a New Order
            </h3>

            <p className="relative mt-1 text-xs text-muted-foreground">
              Browse services and place your next order.
            </p>
          </a>

          {/* Add Funds */}
          <a
            href="/retailer/wallet"
            className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-emerald-500/10 dark:from-emerald-500/5 dark:to-teal-500/5"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>

              <ArrowRight className="h-4 w-4 text-emerald-400 transition-transform duration-200 group-hover:translate-x-1" />
            </div>

            <h3 className="relative mt-4 font-semibold">
              Add Funds
            </h3>

            <p className="relative mt-1 text-xs text-muted-foreground">
              Add balance to your wallet and continue ordering.
            </p>
          </a>

          {/* Reports */}
          <a
            href="/retailer/reports"
            className="group relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-violet-500/10 dark:from-violet-500/5 dark:to-purple-500/5"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                <Activity className="h-5 w-5" />
              </div>

              <ArrowRight className="h-4 w-4 text-violet-400 transition-transform duration-200 group-hover:translate-x-1" />
            </div>

            <h3 className="relative mt-4 font-semibold">
              View Reports
            </h3>

            <p className="relative mt-1 text-xs text-muted-foreground">
              Review your orders, spending and account activity.
            </p>
          </a>
        </div>
      </div>

      {/* Account Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm dark:from-blue-500/5 dark:to-indigo-500/5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <CreditCard className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Today&apos;s Activity
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                You have spent{' '}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {formatCurrency(todaySpending)}
                </span>{' '}
                today on active orders.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm dark:from-emerald-500/5 dark:to-teal-500/5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold">
                Completed Orders
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                You have successfully completed{' '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {completed}
                </span>{' '}
                orders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}