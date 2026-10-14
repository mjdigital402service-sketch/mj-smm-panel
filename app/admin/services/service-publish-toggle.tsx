'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { toggleServicePublishedAction } from '@/server/actions/catalog.actions';

export function ServicePublishToggle({
  id,
  isPublished,
}: {
  id: string;
  isPublished: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={isPublished ? 'outline' : 'default'}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await toggleServicePublishedAction(id, !isPublished);
            toast.success(
              isPublished ? 'Service moved to draft.' : 'Service published.',
            );
          } catch {
            toast.error('Could not update publishing status.');
          }
        })
      }
    >
      {isPublished ? 'Unpublish' : 'Publish'}
    </Button>
  );
}
