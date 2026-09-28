import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { requestPasswordResetAction } from './actions';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>Enter the email on your account and we'll send a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={requestPasswordResetAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button type="submit" className="w-full">Send reset link</Button>
            <p className="text-center text-sm text-muted-foreground">
              <a href="/login" className="underline underline-offset-4 hover:text-foreground">Back to login</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
