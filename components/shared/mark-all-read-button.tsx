'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { markAllReadAction } from '@/server/actions/notification.actions';

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => markAllReadAction())}>
      Mark all read
    </Button>
  );
}
