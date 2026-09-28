'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  setUserStatusAction,
  deleteUserAction,
  adjustBalanceAction,
} from '@/server/actions/admin-users.actions';

export function UserRowActions({ userId, status }: { userId: string; status: 'ACTIVE' | 'SUSPENDED' | 'PENDING' }) {
  const [pending, startTransition] = useTransition();
  const [showBalance, setShowBalance] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  function toggleStatus() {
    startTransition(async () => {
      try {
        await setUserStatusAction(userId, status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
        toast.success('Status updated.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update status.');
      }
    });
  }

  function remove() {
    if (!confirm('Delete this user permanently? This cannot be undone.')) return;
    startTransition(async () => {
      try {
        await deleteUserAction(userId);
        toast.success('User deleted.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete user.');
      }
    });
  }

  function submitBalance(mode: 'credit' | 'debit') {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    startTransition(async () => {
      try {
        await adjustBalanceAction({ userId, amount: value, mode, note });
        toast.success(`Wallet ${mode}ed successfully.`);
        setShowBalance(false);
        setAmount('');
        setNote('');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to adjust balance.');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={toggleStatus}>
          {status === 'ACTIVE' ? 'Suspend' : 'Activate'}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setShowBalance((v) => !v)}>
          Balance
        </Button>
        <Button size="sm" variant="destructive" disabled={pending} onClick={remove}>
          Delete
        </Button>
      </div>
      {showBalance && (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border p-2">
          <Input className="h-8 w-28" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input className="h-8 w-40" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" disabled={pending} onClick={() => submitBalance('credit')}>Credit</Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => submitBalance('debit')}>Debit</Button>
        </div>
      )}
    </div>
  );
}
