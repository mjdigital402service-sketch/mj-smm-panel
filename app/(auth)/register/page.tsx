'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { registerAction, type RegisterState } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BRAND } from '@/lib/brand.config';

const initialState: RegisterState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-700"
    >
      {pending ? 'Submittingâ€¦' : 'Create Account'}
    </Button>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useFormState(
    registerAction,
    initialState,
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
            <img
              src={BRAND.logo}
              alt={BRAND.name}
              className="h-full w-full object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {BRAND.name}
          </h1>

          <p className="mt-1 text-sm font-medium text-blue-600">
            {BRAND.tagline}
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

          <div className="p-7 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900">
              Create Your Account
            </h2>

            <p className="mt-1.5 text-sm text-slate-500">
              Submit your details for administrator approval.
            </p>

            <form action={formAction} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  minLength={2}
                  required
                  placeholder="Enter your full name"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  minLength={3}
                  pattern="[a-zA-Z0-9_]+"
                  required
                  placeholder="Letters, numbers and underscore"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Enter your phone number"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                  className="h-11 rounded-xl"
                />
              </div>

              {state.error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
                >
                  {state.error}
                </div>
              )}

              {state.success && (
                <div
                  role="status"
                  className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
                >
                  {state.success}
                </div>
              )}

              <div className="pt-1">
                <SubmitButton />
              </div>
            </form>

            <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Â© {new Date().getFullYear()} {BRAND.legalName}
        </p>
      </div>
    </main>
  );
}
