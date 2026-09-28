'use client';

import { useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { changePasswordAction } from '@/server/actions/profile.actions';

export function ChangePasswordForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  function submit(fd: FormData) {
    startTransition(async () => {
      try { await changePasswordAction(fd); toast.success('Password updated.'); ref.current?.reset(); }
      catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to update password.'); }
    });
  }
  return (
    <Card>
      <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
      <CardContent>
        <form ref={ref} action={submit} className="grid max-w-md gap-4">
          <div className="space-y-1.5"><Label htmlFor="current">Current password</Label><Input id="current" name="current" type="password" required /></div>
          <div className="space-y-1.5"><Label htmlFor="next">New password</Label><Input id="next" name="next" type="password" minLength={8} required /></div>
          <div><Button type="submit" disabled={pending}>Update Password</Button></div>
        </form>
      </CardContent>
    </Card>
  );
}
