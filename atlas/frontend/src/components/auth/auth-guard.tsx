'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores';
import { ROUTES } from '@/constants';

/**
 * Client-side session guard for the authenticated app shell.
 *
 * `middleware.ts` already blocks unauthenticated requests to `/dashboard/*`
 * at the edge, but it only checks cookie *presence* — it has no visibility
 * into the persisted Zustand auth store. When the access-token cookie is
 * present but the store has no session (e.g. localStorage was cleared
 * independently of the cookie, or a stale/invalid cookie survives a
 * partial logout), middleware still lets `/dashboard` through, so this
 * guard is the only place that can catch the mismatch.
 *
 * It must clear the stale cookie (via `clearSession()`) before navigating
 * to `/login`, and use a full document navigation rather than the Next.js
 * client router: middleware treats `/login` as a public route it bounces
 * *away* from whenever a cookie is present (`if (token && isPublicRoute)`),
 * so redirecting there with the stale cookie still attached — or via a
 * client-side transition middleware doesn't get to re-evaluate — leaves
 * the app stuck exactly where it started, with no request ever visibly
 * failing and no error ever thrown.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    if (!isHydrated || isAuthenticated) return;
    clearSession();
    window.location.href = ROUTES.LOGIN;
  }, [isHydrated, isAuthenticated, clearSession]);

  if (!isHydrated || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
