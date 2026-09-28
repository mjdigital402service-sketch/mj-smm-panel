import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/brand.config';

const PAGE_SIZE = 25;

export async function TransactionsView({ basePath, searchParams }: { basePath: string; searchParams: { page?: string; type?: string } }) {
  const user = await requireUser(['DISTRIBUTOR', 'RETAILER']);
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  // Distributors see their own ledger plus their retailers' ledgers.
  const scope = user.role === 'DISTRIBUTOR' ? { user: { OR: [{ id: user.id }, { distributorId: user.id }] } } : { userId: user.id };
  const where = { ...scope, ...(searchParams.type ? { type: searchParams.type as any } : {}) };

  const [total, txns] = await Promise.all([
    prisma.walletTransaction.count({ where }),
    prisma.walletTransaction.findMany({ where, include: { user: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const q = (p: number) => `${basePath}?page=${p}${searchParams.type ? `&type=${searchParams.type}` : ''}`;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Transactions</h1></div>
      <Card>
        <CardHeader><CardTitle>{total} transactions</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground">{user.role === 'DISTRIBUTOR' && <th className="pb-2 font-medium">User</th>}<th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium">Amount</th><th className="pb-2 font-medium">Balance After</th><th className="pb-2 font-medium">Description</th><th className="pb-2 font-medium">Date</th></tr></thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  {user.role === 'DISTRIBUTOR' && <td className="py-2.5">{t.user.name}</td>}
                  <td className="py-2.5"><Badge variant="secondary">{t.type.replace('_', ' ')}</Badge></td>
                  <td className={`py-2.5 font-medium ${t.amount.isNegative() ? 'text-destructive' : 'text-success'}`}>{t.amount.isNegative() ? '' : '+'}{formatCurrency(t.amount.toNumber())}</td>
                  <td className="py-2.5">{formatCurrency(t.newBalance.toNumber())}</td>
                  <td className="max-w-[240px] truncate py-2.5 text-xs text-muted-foreground">{t.description}</td>
                  <td className="py-2.5 text-xs text-muted-foreground">{t.createdAt.toLocaleString()}</td>
                </tr>
              ))}
              {txns.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No transactions yet.</td></tr>}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {pages}</span>
            <div className="flex gap-2">
              {page > 1 && <a href={q(page - 1)} className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent">Previous</a>}
              {page < pages && <a href={q(page + 1)} className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent">Next</a>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
