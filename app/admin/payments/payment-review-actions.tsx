'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { reviewPaymentAction } from '@/server/actions/payment.actions';

export function PaymentReviewActions({ paymentId }: { paymentId: string }) {
  const [pending, startTransition] = useTransition();

  function review(approve: boolean) {
    startTransition(async () => {
      try {
        await reviewPaymentAction(paymentId, approve);
        toast.success(approve ? 'Payment approved and credited.' : 'Payment rejected.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to review payment.');
      }
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" disabled={pending} onClick={() => review(true)}>Approve</Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={() => review(false)}>Reject</Button>
    </div>
  );
}
