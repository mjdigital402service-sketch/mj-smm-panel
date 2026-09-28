'use client';

import { useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CreateUserForm({
  action,
  title,
  distributors,
}: {
  action: (formData: FormData) => Promise<void>;
  title: string;
  distributors?: { id: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await action(formData);
        toast.success(`${title} created successfully.`);
        formRef.current?.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
          {distributors && (
            <div className="space-y-1.5">
              <Label htmlFor="distributorId">Distributor</Label>
              <select id="distributorId" name="distributorId" required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">Select distributor…</option>
                {distributors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={pending}>{pending ? 'Creating…' : `Create ${title}`}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
