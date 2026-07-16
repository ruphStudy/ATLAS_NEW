import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware
 *
 * Responsibilities:
 *   - Route protection (redirect unauthenticated users to /login)
 *   - Workspace context validation
 *
 * Note: Authentication logic deferred. Skeleton only.
 */
export function middleware(_request: NextRequest) {
  // TODO: implement authentication guard
  // const token = request.cookies.get('atlas_access_token')?.value;
  // if (!token && isProtectedRoute(request.nextUrl.pathname)) {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

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
