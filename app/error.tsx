'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The error message/stack is deliberately not rendered — never expose internals.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-xl font-semibold">Something went wrong</p>
      <p className="text-sm text-muted-foreground">Please try again. If it keeps happening, contact support.</p>
      <button onClick={reset} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try again</button>
    </div>
  );
}
