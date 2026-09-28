'use client';

import { useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitPaymentRequestAction } from '@/server/actions/payment.actions';

export function PaymentRequestForm({ methods }: { methods: { id: string; name: string }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        await submitPaymentRequestAction(formData);
        toast.success('Payment request submitted for review.');
        ref.current?.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to submit.');
      }
    });
  }

  return (
    <form ref={ref} action={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      <div className="space-y-1.5"><Label htmlFor="amount">Amount</Label><Input id="amount" name="amount" type="number" step="0.01" min="1" required /></div>
      <div className="space-y-1.5">
        <Label htmlFor="paymentMethodId">Method</Label>
        <select id="paymentMethodId" name="paymentMethodId" required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">Select…</option>{methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5"><Label htmlFor="transactionRef">Transaction reference</Label><Input id="transactionRef" name="transactionRef" placeholder="UTR / Txn ID" /></div>
      <div className="flex items-end"><Button type="submit" disabled={pending}>{pending ? 'Submitting…' : 'Add Funds'}</Button></div>
    </form>
  );
}
