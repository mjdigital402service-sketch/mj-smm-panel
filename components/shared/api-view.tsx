import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { ApiKeyManager } from './api-key-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BRAND } from '@/lib/brand.config';

export async function ApiView() {
  const user = await requireUser(['ADMIN', 'DISTRIBUTOR', 'RETAILER']);
  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          API Access
        </h1>
        <p className="text-sm text-muted-foreground">
          Integrate {BRAND.name} into your own systems.
        </p>
      </div>

      <ApiKeyManager
        initialKeys={keys.map((k: any) => ({
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
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          <p>
            Base URL:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5">
              {BRAND.domain}/api/v1
            </code>
            . Pass your key as the <code>key</code> parameter.
          </p>

          <ul className="space-y-1 font-mono text-xs">
            <li>GET /services</li>
            <li>GET /balance</li>
            <li>POST /orders &nbsp;(service, link, quantity)</li>
            <li>GET /orders/:orderNumber</li>
            <li>GET /orders</li>
          </ul>

          <p className="text-muted-foreground">
            Full reference: API_DOCUMENTATION.md. Order placement via API is
            available to Retailer accounts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}