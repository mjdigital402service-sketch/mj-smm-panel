import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const logs = await prisma.auditLog.findMany({
    where: searchParams.q
      ? {
          action: {
            contains: searchParams.q,
            mode: 'insensitive',
          },
        }
      : {},
    include: { actor: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Audit Logs
        </h1>
        <p className="text-sm text-muted-foreground">
          Immutable record of sensitive actions on the platform.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={searchParams.q}
              placeholder="Filter by action (e.g. WALLET, LOGIN)…"
              className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
            />
            <button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
              Filter
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events ({logs.length})</CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Actor</th>
                <th className="pb-2 font-medium">Action</th>
                <th className="pb-2 font-medium">Entity</th>
                <th className="pb-2 font-medium">IP</th>
                <th className="pb-2 font-medium">Metadata</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((l: any) => (
                <tr
                  key={l.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-2.5 text-xs text-muted-foreground">
                    {l.createdAt.toLocaleString()}
                  </td>

                  <td className="py-2.5">
                    {l.actor?.name ?? 'System'}
                  </td>

                  <td className="py-2.5 font-mono text-xs">
                    {l.action}
                  </td>

                  <td className="py-2.5 text-xs">
                    {l.entityType}
                    {l.entityId
                      ? ` · ${l.entityId.slice(0, 8)}`
                      : ''}
                  </td>

                  <td className="py-2.5 text-xs">
                    {l.ipAddress ?? '—'}
                  </td>

                  <td className="max-w-[220px] truncate py-2.5 text-xs text-muted-foreground">
                    {l.metadata ? JSON.stringify(l.metadata) : ''}
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No audit events.
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