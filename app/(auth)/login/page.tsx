'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
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
      className="h-12 w-full rounded-xl bg-amber-300 text-sm font-bold text-slate-950 shadow-lg shadow-amber-900/10 transition-all hover:bg-amber-200 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
      disabled={pending}
    >
      {pending ? 'Signing in...' : 'Sign in to Dashboard'}
      {!pending && <span className="ml-2" aria-hidden="true">→</span>}
    </Button>
  );
}

function CollaborationPreview() {
  return (
    <section className="relative hidden min-h-[650px] overflow-hidden rounded-[1.75rem] bg-[#172b38] p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 85% 15%, #e9c66b 0, transparent 28%), radial-gradient(circle at 5% 90%, #347b86 0, transparent 35%)',
        }}
      />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300 font-black text-slate-950">
            {BRAND.name.slice(0, 1)}
          </div>
          <div>
            <p className="text-sm font-semibold">{BRAND.name}</p>
            <p className="text-xs text-slate-300">Your digital workspace</p>
          </div>
        </div>
        <span className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-slate-200">
          Workspace
        </span>
      </div>

      <div className="relative z-10 mx-auto my-8 w-full max-w-lg">
        <div className="mb-5 max-w-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
            Work smarter
          </p>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Your business.
            <br />
            All in one place.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">
            Manage orders, track activity and keep your digital services
            organized from one workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Workspace overview</p>
              <p className="mt-1 text-xs text-slate-300">Your panel at a glance</p>
            </div>
            <span className="rounded-lg bg-amber-300/15 px-2.5 py-1.5 text-xs font-medium text-amber-200">
              Dashboard
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/20 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-300/15 text-lg text-amber-200">
                ↗
              </div>
              <p className="mt-4 text-xs text-slate-300">Order management</p>
              <p className="mt-1 text-sm font-semibold">Stay organized</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/20 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-300/15 text-lg text-cyan-200">
                ◷
              </div>
              <p className="mt-4 text-xs text-slate-300">Account activity</p>
              <p className="mt-1 text-sm font-semibold">Track progress</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/20 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-200">
              ✓
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Your workspace, connected</p>
              <p className="mt-1 text-xs text-slate-300">
                Tools and account access in one place
              </p>
            </div>
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4 border-t border-white/15 pt-5 text-xs text-slate-300">
        <span>Built for your next step.</span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          Simple. Secure. Organized.
        </span>
      </div>
    </section>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f5f4ef] px-4 py-5 sm:px-6 sm:py-8 lg:flex lg:items-center lg:justify-center">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-teal-200/25 blur-3xl" />

      <div className="relative mx-auto grid min-h-[min(850px,calc(100vh-2.5rem))] w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-[0_30px_100px_-35px_rgba(31,41,55,0.28)] lg:grid-cols-[0.88fr_1.12fr]">
        <section className="flex min-w-0 flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-10 xl:px-14">
          <div className="mb-9 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
              <img
                src={BRAND.logo}
                alt={`${BRAND.name} logo`}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight text-slate-900">
                {BRAND.name}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {BRAND.tagline}
              </p>
            </div>
          </div>

          <div className="mb-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Welcome to your workspace
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Welcome back
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
              Sign in to your account to manage your dashboard and continue
              where you left off.
            </p>
          </div>

          <form action={formAction} className="space-y-5">
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
                className="h-12 rounded-xl border-slate-200 bg-slate-50/80 px-4 text-sm transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-300/30"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="password"
                  className="text-sm font-semibold text-slate-700"
                >
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-slate-600 transition-colors hover:text-amber-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                className="h-12 rounded-xl border-slate-200 bg-slate-50/80 px-4 text-sm transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-300/30"
              />
            </div>

            {state.error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {state.error}
              </div>
            )}

            <div className="pt-1">
              <SubmitButton />
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-semibold text-slate-900 underline decoration-amber-400 decoration-2 underline-offset-4 transition-colors hover:text-amber-700"
              >
                Create account
              </Link>
            </p>
          </div>

          <div className="mt-7 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m9.5 12 1.7 1.7 3.5-3.5"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">
                Secure account access
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Your sign-in is handled by the existing secure authentication
                system.
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              &copy; {new Date().getFullYear()} {BRAND.legalName}
            </span>
            <span>Professional Digital &amp; SMM Solutions</span>
          </div>
        </section>

        <div className="hidden min-w-0 p-3 lg:block xl:p-4">
          <CollaborationPreview />
        </div>

        <div className="px-6 pb-6 lg:hidden">
          <div className="rounded-2xl bg-[#172b38] p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
              {BRAND.name}
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              Everything you need, in one workspace.
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Manage your digital services and orders from one convenient
              dashboard.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}