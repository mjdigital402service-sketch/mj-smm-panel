'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createApiKeyAction, revokeApiKeyAction } from '@/server/actions/apikey.actions';

interface ApiKeyRow {
  id: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  rateLimitPerMinute: number;
}

export function ApiKeyManager({ initialKeys }: { initialKeys: ApiKeyRow[] }) {
  const [pending, startTransition] = useTransition();
  const [newKey, setNewKey] = useState<string | null>(null);

  function generate() {
    startTransition(async () => {
      const { fullKey } = await createApiKeyAction();
      setNewKey(fullKey);
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      await revokeApiKeyAction(id);
      toast.success('Key revoked.');
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>API Keys</CardTitle>
        <Button size="sm" onClick={generate} disabled={pending}>Generate New Key</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {newKey && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <p className="font-medium">Copy your new API key now — it will not be shown again:</p>
            <code className="mt-1 block break-all rounded bg-background p-2 text-xs">{newKey}</code>
          </div>
        )}
        <div className="divide-y divide-border">
          {initialKeys.map((k) => (
            <div key={k.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="font-mono">{k.keyPrefix}••••••••••••••••</p>
                <p className="text-xs text-muted-foreground">
                  {k.rateLimitPerMinute}/min · {k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleString()}` : 'never used'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={k.isActive ? 'success' : 'destructive'}>{k.isActive ? 'Active' : 'Revoked'}</Badge>
                {k.isActive && <Button size="sm" variant="outline" onClick={() => revoke(k.id)} disabled={pending}>Revoke</Button>}
              </div>
            </div>
          ))}
          {initialKeys.length === 0 && <p className="py-4 text-center text-muted-foreground">No API keys yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
