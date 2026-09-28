import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'smm_session';

const roleSections: Record<string, string> = {
  '/admin': 'admin',
  '/distributor': 'distributor',
  '/retailer': 'retailer',
};

/**
 * Edge-safe first line of defense: redirects unauthenticated requests away
 * from protected sections to /login. This does NOT decode the session or
 * check roles (that requires a DB round-trip, done server-side in each
 * section's layout via requireUser()) — it only prevents anonymous access.
 * Every protected API route and Server Component independently re-verifies
 * authorization; this middleware is a UX convenience, not the security
 * boundary.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPrefix = Object.keys(roleSections).find((p) => pathname.startsWith(p));

  if (protectedPrefix) {
    const hasSession = request.cookies.has(SESSION_COOKIE);
    if (!hasSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/distributor/:path*', '/retailer/:path*'],
};
