import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/stat-card';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/brand.config';

export default async function AdminWalletPage() {
  const [wallets, creditSum, debitSum] = await Promise.all([
    prisma.wallet.findMany({ include: { user: true }, orderBy: { balance: 'desc' }, take: 50 }),
    prisma.walletTransaction.aggregate({ _sum: { amount: true }, where: { amount: { gt: 0 } } }),
    prisma.walletTransaction.aggregate({ _sum: { amount: true }, where: { amount: { lt: 0 } } }),
  ]);

  const totalBalance = wallets.reduce((s, w) => s + Number(w.balance), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wallet Overview</h1>
        <p className="text-sm text-muted-foreground">Aggregate wallet balances and ledger flow.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Balance Held" value={formatCurrency(totalBalance)} icon={Wallet} />
        <StatCard label="Total Credits (ledger)" value={formatCurrency(Number(creditSum._sum.amount ?? 0))} icon={TrendingUp} tone="success" />
        <StatCard label="Total Debits (ledger)" value={formatCurrency(Math.abs(Number(debitSum._sum.amount ?? 0)))} icon={TrendingDown} tone="destructive" />
      </div>

      <Card>
        <CardHeader><CardTitle>Top Balances</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((w) => (
                <tr key={w.id} className="border-b border-border last:border-0">
                  <td className="py-2.5">{w.user.name} <span className="text-xs text-muted-foreground">@{w.user.username}</span></td>
                  <td className="py-2.5 text-xs">{w.user.role}</td>
                  <td className="py-2.5 font-medium">{formatCurrency(w.balance.toNumber())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
