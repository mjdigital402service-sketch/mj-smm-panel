'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { syncProviderServicesAction, toggleProviderAction } from '@/server/actions/catalog.actions';

export function ProviderActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await syncProviderServicesAction(id);
              toast.success('Services synced.');
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Sync failed.');
            }
          })
        }
      >
        Sync
      </Button>
      <Button
        size="sm"
        variant={isActive ? 'destructive' : 'default'}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await toggleProviderAction(id, !isActive);
            toast.success('Provider updated.');
          })
        }
      >
        {isActive ? 'Disable' : 'Enable'}
      </Button>
    </div>
  );
}
