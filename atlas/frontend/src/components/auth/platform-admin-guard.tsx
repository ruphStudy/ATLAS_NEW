'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks';
import { ROUTES } from '@/constants';

/**
 * Route-level guard for Platform Admin pages.
 *
 * Mirrors the backend's `PlatformAdminGuard` (`isPlatformAdmin` on the
 * `User` row) on the frontend: sidebar visibility alone doesn't stop a
 * non-platform-admin user from navigating straight to a Platform Admin
 * URL, so every Platform Admin page wraps its content in this guard.
 * Non-platform-admins are redirected to the normal dashboard; the
 * backend guard/tenant-isolation checks remain the actual authority for
 * every API call these pages make.
 */
export function PlatformAdminGuard({ children }: { children: React.ReactNode }) {
  const currentUser = useCurrentUser();
  const router = useRouter();
  const isPlatformAdmin = !!currentUser?.isPlatformAdmin;

  useEffect(() => {
    if (currentUser && !isPlatformAdmin) {
      router.replace(ROUTES.DASHBOARD);
    }
  }, [currentUser, isPlatformAdmin, router]);

  if (!isPlatformAdmin) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
