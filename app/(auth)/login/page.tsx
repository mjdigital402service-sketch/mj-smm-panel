'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { loginAction, type LoginState } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BRAND } from '@/lib/brand.config';

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/25"
      disabled={pending}
    >
      {pending ? 'Signing in…' : 'Sign in to Dashboard'}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-8">

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      {/* Login container */}
      <div className="relative z-10 w-full max-w-md">

        {/* Brand */}
        <div className="mb-7 text-center">

          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-white p-2 shadow-xl shadow-blue-900/10 ring-1 ring-slate-200">
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

        {/* Login card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">

          {/* Card top accent */}
          <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

          <div className="p-7 sm:p-8">

            <div className="mb-7">
              <h2 className="text-xl font-bold text-slate-900">
                Welcome Back
              </h2>

              <p className="mt-1.5 text-sm text-slate-500">
                Sign in to access your dashboard
              </p>
            </div>

            <form action={formAction} className="space-y-5">

              {/* Username */}
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="text-sm font-semibold text-slate-700"
                >
                  Username
                </Label>

                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  placeholder="Enter your username"
                  required
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Password
                  </Label>

                  <a
                    href="/forgot-password"
                    className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>

                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Error */}
              {state.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {state.error}
                </div>
              )}

              {/* Submit */}
              <div className="pt-1">
                <SubmitButton />
              </div>
            </form>

            {/* Security note */}
            <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-100 pt-5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 text-blue-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.5 12l1.7 1.7 3.5-3.5"
                  />
                </svg>
              </div>

              <p className="text-xs text-slate-500">
                Your account is protected with secure authentication
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} {BRAND.legalName}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Professional Digital & SMM Solutions
          </p>
        </div>
      </div>
    </main>
  );
}