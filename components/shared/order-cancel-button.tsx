'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cancelOrderAction } from '@/server/actions/order.actions';

export function OrderCancelButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    if (!confirm('Cancel this order and refund the retailer?')) return;
    startTransition(async () => {
      try {
        await cancelOrderAction(orderId);
        toast.success('Order cancelled and refunded.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to cancel order.');
      }
    });
  }

  return (
    <Button size="sm" variant="destructive" disabled={pending} onClick={handleCancel}>
      {pending ? 'Cancelling…' : 'Cancel'}
    </Button>
  );
}
