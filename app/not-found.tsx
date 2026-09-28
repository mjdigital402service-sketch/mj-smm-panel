import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-semibold">404</p>
      <p className="text-muted-foreground">We couldn't find that page.</p>
      <Link href="/" className="text-sm underline underline-offset-4">Go home</Link>
    </div>
  );
}
