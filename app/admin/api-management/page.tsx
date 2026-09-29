import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiKeyManager } from '@/components/shared/api-key-manager';

export default async function AdminApiManagementPage() {
  const user = await requireUser(['ADMIN']);

  const [myKeys, recentLogs] = await Promise.all([
    prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.apiLog.findMany({
      include: { apiKey: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          API Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your own API access and monitor platform-wide API usage.
        </p>
      </div>

      <ApiKeyManager
        initialKeys={myKeys.map((k: any) => ({
          id: k.id,
          keyPrefix: k.keyPrefix,
          isActive: k.isActive,
          lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
          createdAt: k.createdAt.toISOString(),
          rateLimitPerMinute: k.rateLimitPerMinute,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent API Calls (platform-wide)</CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">User</th>
                <th className="pb-2 font-medium">Endpoint</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">IP</th>
                <th className="pb-2 font-medium">Time</th>
              </tr>
            </thead>

            <tbody>
              {recentLogs.map((l: any) => (
                <tr
                  key={l.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-2.5">{l.apiKey.user.name}</td>
                  <td className="py-2.5 text-xs">{l.endpoint}</td>
                  <td className="py-2.5 text-xs">{l.method}</td>
                  <td className="py-2.5">{l.statusCode}</td>
                  <td className="py-2.5 text-xs">
                    {l.ipAddress ?? '—'}
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground">
                    {l.createdAt.toLocaleString()}
                  </td>
                </tr>
              ))}

              {recentLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No API activity yet.
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