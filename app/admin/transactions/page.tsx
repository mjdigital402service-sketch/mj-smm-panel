import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/brand.config';

export default async function AdminTransactionsPage() {
  const transactions = await prisma.walletTransaction.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 150,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Transactions
        </h1>

        <p className="text-sm text-muted-foreground">
          Full wallet ledger — every credit and debit is recorded immutably.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Recent Transactions ({transactions.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Balance After</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((t: any) => (
                <tr
                  key={t.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-2.5">
                    {t.user.name}
                  </td>

                  <td className="py-2.5">
                    <Badge variant="secondary">
                      {t.type.replace('_', ' ')}
                    </Badge>
                  </td>

                  <td
                    className={`py-2.5 font-medium ${
                      t.amount.isNegative()
                        ? 'text-destructive'
                        : 'text-success'
                    }`}
                  >
                    {t.amount.isNegative() ? '' : '+'}
                    {formatCurrency(t.amount.toNumber())}
                  </td>

                  <td className="py-2.5">
                    {formatCurrency(t.newBalance.toNumber())}
                  </td>

                  <td className="max-w-[240px] truncate py-2.5 text-xs text-muted-foreground">
                    {t.description}
                  </td>

                  <td className="py-2.5 text-xs text-muted-foreground">
                    {t.createdAt.toLocaleString()}
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No transactions yet.
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