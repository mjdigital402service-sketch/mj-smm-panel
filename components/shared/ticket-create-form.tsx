'use client';

import { useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createTicketAction } from '@/server/actions/ticket.actions';

export function TicketCreateForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        await createTicketAction(formData);
        toast.success('Ticket created.');
        ref.current?.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create ticket.');
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>New Ticket</CardTitle></CardHeader>
      <CardContent>
        <form ref={ref} action={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <select id="category" name="category" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option>General</option><option>Order</option><option>Payment</option><option>Technical</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <select id="priority" name="priority" defaultValue="MEDIUM" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="message">Message</Label>
            <textarea id="message" name="message" required rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div><Button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Submit Ticket'}</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
