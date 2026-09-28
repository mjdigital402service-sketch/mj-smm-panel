'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { replyTicketAction, closeTicketAction, reopenTicketAction } from '@/server/actions/ticket.actions';

export function TicketThreadActions({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const [text, setText] = useState('');
  const [pending, startTransition] = useTransition();

  function send() {
    if (!text.trim()) return;
    startTransition(async () => {
      try {
        await replyTicketAction(ticketId, text.trim());
        setText('');
        toast.success('Reply sent.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to send reply.');
      }
    });
  }

  return (
    <div className="space-y-3">
      {!closed && (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Write a reply…" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <Button onClick={send} disabled={pending}>Send Reply</Button>
            <Button variant="outline" disabled={pending} onClick={() => startTransition(async () => { await closeTicketAction(ticketId); toast.success('Ticket closed.'); })}>Close Ticket</Button>
          </div>
        </>
      )}
      {closed && (
        <Button variant="outline" disabled={pending} onClick={() => startTransition(async () => { await reopenTicketAction(ticketId); toast.success('Ticket reopened.'); })}>Reopen Ticket</Button>
      )}
    </div>
  );
}
