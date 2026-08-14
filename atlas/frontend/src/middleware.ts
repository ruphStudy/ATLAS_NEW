import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from '@/constants';

const PUBLIC_ROUTES = ['/login', '/register'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Next.js Middleware
 *
 * Responsibilities:
 *   - Route protection (redirect unauthenticated users to /login)
 *   - Redirect already-authenticated users away from auth pages
 *
 * Reads the same cookie the frontend's axios client authenticates with
 * (`lib/cookies.ts` / `lib/api/axios.ts`) — middleware runs on the
 * server/edge, so it can only see cookies, never localStorage.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const { pathname, search } = request.nextUrl;

  if (!token && !isPublicRoute(pathname) && pathname !== '/') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     *   - _next/static (static files)
     *   - _next/image  (image optimization)
     *   - favicon.ico
     *   - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
