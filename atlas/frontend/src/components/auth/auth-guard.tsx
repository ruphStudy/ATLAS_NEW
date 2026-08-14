'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores';
import { getAccessToken } from '@/lib/api/axios';
import { ROUTES } from '@/constants';

/**
 * Client-side session guard for the authenticated app shell.
 *
 * `middleware.ts` already blocks unauthenticated requests to `/dashboard/*`
 * at the edge (cookie presence check). This guard covers the remaining
 * client-only edge case: the access-token cookie is present, but the
 * persisted Zustand auth store has no `user` (e.g. localStorage was
 * cleared independently of the cookie) — in that case we can't safely
 * render a shell with no identity, so we send the user back to sign in.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated && !getAccessToken()) {
      router.replace(ROUTES.LOGIN);
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated || (!isAuthenticated && typeof window !== 'undefined')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
