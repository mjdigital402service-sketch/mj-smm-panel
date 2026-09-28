import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { resetPasswordAction } from '../forgot-password/actions';

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string; error?: string } }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Choose a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={resetPasswordAction} className="space-y-4">
            <input type="hidden" name="token" value={searchParams.token ?? ''} />
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            {searchParams.error && <p className="text-sm text-destructive">Please choose a password with at least 8 characters.</p>}
            <Button type="submit" className="w-full">Update password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
