'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { distributorSetRetailerStatusAction, distributorTransferAction } from '@/server/actions/distributor.actions';

export function RetailerRowActions({ retailerId, status }: { retailerId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');

  function transfer(mode: 'credit' | 'debit') {
    const value = parseFloat(amount);
    if (!(value > 0)) return toast.error('Enter a valid amount.');
    startTransition(async () => {
      try {
        await distributorTransferAction({ retailerId, amount: value, mode });
        toast.success(mode === 'credit' ? 'Balance added.' : 'Balance deducted.');
        setAmount('');
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Transfer failed.');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen((v) => !v)}>Balance</Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => startTransition(async () => {
            await distributorSetRetailerStatusAction(retailerId, status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
            toast.success('Status updated.');
          })}
        >
          {status === 'ACTIVE' ? 'Suspend' : 'Activate'}
        </Button>
      </div>
      {open && (
        <div className="flex items-center gap-2 rounded-lg border border-border p-2">
          <Input className="h-8 w-28" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button size="sm" disabled={pending} onClick={() => transfer('credit')}>Add</Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => transfer('debit')}>Deduct</Button>
        </div>
      )}
    </div>
  );
}
