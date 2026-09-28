'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { toggleCategoryAction } from '@/server/actions/catalog.actions';

export function CategoryToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleCategoryAction(id, !isActive);
          toast.success('Category updated.');
        })
      }
    >
      {isActive ? 'Deactivate' : 'Activate'}
    </Button>
  );
}
