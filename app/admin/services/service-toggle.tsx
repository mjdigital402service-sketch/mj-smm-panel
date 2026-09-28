'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { toggleServiceAction } from '@/server/actions/catalog.actions';

export function ServiceToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex justify-end">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await toggleServiceAction(id, !isActive);
            toast.success('Service updated.');
          })
        }
      >
        {isActive ? 'Deactivate' : 'Activate'}
      </Button>
    </div>
  );
}
