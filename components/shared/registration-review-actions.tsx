'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reviewRetailerRegistrationAction } from '@/server/actions/registration-review.actions';

export default function RegistrationReviewActions({
  userId,
}: {
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function review(decision: 'APPROVE' | 'REJECT') {
    const message =
      decision === 'APPROVE'
        ? 'Approve this retailer registration?'
        : 'Reject this retailer registration?';

    if (!window.confirm(message)) return;

    setError('');

    startTransition(async () => {
      try {
        await reviewRetailerRegistrationAction(userId, decision);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'The registration could not be updated.',
        );
      }
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => review('APPROVE')}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {isPending ? 'Please wait…' : 'Approve'}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => review('REJECT')}
          className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground disabled:opacity-50"
        >
          Reject
        </button>
      </div>

      {error ? (
        <p role="alert" className="max-w-48 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
