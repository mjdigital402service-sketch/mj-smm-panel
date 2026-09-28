import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const users = await prisma.user.findMany({
    where: searchParams.q ? { OR: [{ name: { contains: searchParams.q, mode: 'insensitive' } }, { username: { contains: searchParams.q, mode: 'insensitive' } }, { email: { contains: searchParams.q, mode: 'insensitive' } }] } : {},
    include: { distributor: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold tracking-tight">Users</h1><p className="text-sm text-muted-foreground">Every account on the platform.</p></div>
      <Card><CardContent className="p-4"><form className="flex gap-2"><input name="q" defaultValue={searchParams.q} placeholder="Search name, username or email…" className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm" /><button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Search</button></form></CardContent></Card>
      <Card>
        <CardHeader><CardTitle>{users.length} users</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Role</th><th className="pb-2 font-medium">Distributor</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Last login</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="py-2.5"><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">@{u.username} · {u.email}</p></td>
                  <td className="py-2.5 text-xs">{u.role}</td><td className="py-2.5 text-xs">{u.distributor?.name ?? '—'}</td>
                  <td className="py-2.5"><Badge variant={u.status === 'ACTIVE' ? 'success' : 'destructive'}>{u.status}</Badge></td>
                  <td className="py-2.5 text-xs text-muted-foreground">{u.lastLoginAt?.toLocaleString() ?? 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
