import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/brand.config';
import { getWalletBalance } from '@/server/services/wallet.service';
import { ChangePasswordForm } from './change-password-form';

export async function ProfileView() {
  const session = await requireUser(['ADMIN', 'DISTRIBUTOR', 'RETAILER']);
  const [user, balance] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.id }, include: { distributor: { select: { name: true } } } }),
    getWalletBalance(session.id),
  ]);
  const rows: [string, string][] = [
    ['Name', user.name], ['Username', `@${user.username}`], ['Email', user.email], ['Phone', user.phone ?? '—'],
    ['Wallet balance', formatCurrency(balance.toNumber())], ['Member since', user.createdAt.toLocaleDateString()],
    ['Last login', user.lastLoginAt?.toLocaleString() ?? '—'],
  ];
  if (user.distributor) rows.splice(4, 0, ['Distributor', user.distributor.name]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Profile</h1></div>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle>Account</CardTitle><Badge variant={user.status === 'ACTIVE' ? 'success' : 'destructive'}>{user.status}</Badge></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {rows.map(([k, v]) => (<div key={k}><p className="text-xs text-muted-foreground">{k}</p><p className="text-sm font-medium">{v}</p></div>))}
        </CardContent>
      </Card>
      <ChangePasswordForm />
    </div>
  );
}
