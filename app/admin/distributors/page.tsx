import {
  Users,
  Wallet,
  Store,
  TrendingUp,
  UserPlus,
  Search,
  Building2,
} from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateUserForm } from '@/components/shared/create-user-form';
import { UserRowActions } from '@/components/shared/user-row-actions';
import { createUserAction } from '@/server/actions/admin-users.actions';
import { formatCurrency } from '@/lib/brand.config';

export default async function AdminDistributorsPage() {
  const distributors = await prisma.user.findMany({
    where: { role: 'DISTRIBUTOR' },
    include: {
      wallet: true,
      retailers: true,
      ordersUnderDist: {
        select: {
          charge: true,
          profit: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const activeCount = distributors.filter(
    (d) => d.status === 'ACTIVE',
  ).length;

  const totalWallet = distributors.reduce(
    (sum, d) => sum + Number(d.wallet?.balance ?? 0),
    0,
  );

  const totalSales = distributors.reduce(
    (sum, d) =>
      sum +
      d.ordersUnderDist.reduce(
        (inner, o) => inner + Number(o.charge),
        0,
      ),
    0,
  );

  const totalProfit = distributors.reduce(
    (sum, d) =>
      sum +
      d.ordersUnderDist.reduce(
        (inner, o) => inner + Number(o.profit),
        0,
      ),
    0,
  );

  const totalRetailers = distributors.reduce(
    (sum, d) => sum + d.retailers.length,
    0,
  );

  return (
    <div className="min-h-full space-y-6 pb-8">

      {/* =====================================================
          HEADER
      ====================================================== */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-600/15 md:p-7">

        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">

          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold backdrop-blur-sm">
              <Building2 className="h-3.5 w-3.5 text-cyan-200" />
              DISTRIBUTOR MANAGEMENT
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Distributors
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              Create, manage and monitor all distributor accounts,
              wallets, retailers and business performance.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-100">
                Total Distributors
              </p>

              <p className="mt-0.5 text-2xl font-extrabold">
                {distributors.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          SUMMARY CARDS
      ====================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Total
                </p>

                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {distributors.length}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Active
                </p>

                <p className="mt-2 text-2xl font-extrabold text-emerald-600">
                  {activeCount}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Retailers
                </p>

                <p className="mt-2 text-2xl font-extrabold text-slate-900">
                  {totalRetailers}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Store className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Wallet Balance
                </p>

                <p className="mt-2 text-xl font-extrabold text-slate-900">
                  {formatCurrency(totalWallet)}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Total Profit
                </p>

                <p className="mt-2 text-xl font-extrabold text-emerald-600">
                  {formatCurrency(totalProfit)}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* =====================================================
          CREATE DISTRIBUTOR
      ====================================================== */}
      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">

        <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-5 py-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <UserPlus className="h-4 w-4" />
            </span>

            Create Distributor
          </CardTitle>

          <p className="mt-1 text-xs text-slate-500">
            Add a new distributor account to your platform.
          </p>
        </CardHeader>

        <CardContent className="p-5 md:p-6">
          <CreateUserForm
            title="Distributor"
            action={createUserAction.bind(null, 'DISTRIBUTOR')}
          />
        </CardContent>
      </Card>

      {/* =====================================================
          DISTRIBUTOR TABLE
      ====================================================== */}
      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">

        <CardHeader className="border-b border-slate-100 px-5 py-4 md:px-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Users className="h-4 w-4" />
                </span>

                All Distributors
              </CardTitle>

              <p className="mt-1 text-xs text-slate-500">
                {distributors.length} distributor account
                {distributors.length !== 1 ? 's' : ''} registered
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-slate-400" />

              <span className="text-[11px] font-medium text-slate-400">
                Distributor directory
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1000px] text-sm">

              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left">

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Distributor
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Contact
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Wallet
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Retailers
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sales / Profit
                  </th>

                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Actions
                  </th>

                </tr>
              </thead>

              <tbody>
                {distributors.map((d) => {
                  const sales = d.ordersUnderDist.reduce(
                    (s, o) => s + Number(o.charge),
                    0,
                  );

                  const profit = d.ordersUnderDist.reduce(
                    (s, o) => s + Number(o.profit),
                    0,
                  );

                  return (
                    <tr
                      key={d.id}
                      className="border-b border-slate-100 align-middle transition-colors last:border-0 hover:bg-blue-50/40"
                    >

                      {/* Distributor */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-sm">
                            {d.name?.charAt(0)?.toUpperCase() ?? 'D'}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-800">
                              {d.name}
                            </p>

                            <p className="mt-0.5 truncate text-[11px] text-slate-400">
                              @{d.username}
                            </p>
                          </div>

                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <p className="max-w-[180px] truncate text-xs font-medium text-slate-700">
                          {d.email}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {d.phone ?? 'No phone'}
                        </p>
                      </td>

                      {/* Wallet */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">

                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                            <Wallet className="h-3.5 w-3.5" />
                          </div>

                          <span className="font-bold text-slate-800">
                            {formatCurrency(
                              d.wallet?.balance.toNumber() ?? 0,
                            )}
                          </span>

                        </div>
                      </td>

                      {/* Retailers */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">

                          <Store className="h-4 w-4 text-indigo-500" />

                          <span className="font-bold text-slate-700">
                            {d.retailers.length}
                          </span>

                        </div>
                      </td>

                      {/* Sales / Profit */}
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">
                          {formatCurrency(sales)}
                        </p>

                        <p className="mt-1 text-[11px] font-semibold text-emerald-600">
                          {formatCurrency(profit)} profit
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <Badge
                          variant={
                            d.status === 'ACTIVE'
                              ? 'success'
                              : 'destructive'
                          }
                        >
                          {d.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <UserRowActions
                          userId={d.id}
                          status={d.status}
                        />
                      </td>

                    </tr>
                  );
                })}

                {distributors.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-14 text-center"
                    >
                      <div className="mx-auto flex max-w-xs flex-col items-center">

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <Users className="h-6 w-6" />
                        </div>

                        <p className="mt-4 text-sm font-bold text-slate-700">
                          No distributors yet
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          Create your first distributor account
                          using the form above.
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
          PERFORMANCE SUMMARY
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
                {activeCount} active distributors
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Store className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold text-indigo-700">
                Retailer Network
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-800">
                {totalRetailers} retailers
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <TrendingUp className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold text-emerald-700">
                Distributor Profit
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-800">
                {formatCurrency(totalProfit)}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}