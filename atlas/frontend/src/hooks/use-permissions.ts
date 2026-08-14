import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getEffectivePermissions } from '@/services/permissions.service';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/stores';

/**
 * The current user's effective permission keys (`module.resource.action`,
 * e.g. `products.product.view`) for the active workspace — used to
 * permission-gate navigation/actions without hardcoding role names.
 * ADMIN/OWNER roles still go through this same check; there is no
 * role-name special-casing here.
 */
export function useEffectivePermissions() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: [QUERY_KEYS.PERMISSIONS, user?.workspaceId],
    queryFn: getEffectivePermissions,
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePermissionChecks() {
  const { data } = useEffectivePermissions();

  const allowedKeys = useMemo(() => new Set((data?.permissions ?? []).filter((p) => p.effect === 'ALLOW').map((p) => p.key)), [data]);
  const deniedKeys = useMemo(() => new Set((data?.permissions ?? []).filter((p) => p.effect === 'DENY').map((p) => p.key)), [data]);

  /** Exact permission-key check, e.g. `hasPermission('products.product.view')`. */
  const hasPermission = (key: string): boolean => {
    if (deniedKeys.has(key)) return false;
    return allowedKeys.has(key);
  };

  /** Nav-visibility check — true if the user holds *any* allowed permission whose key starts with `${moduleSlug}.`. */
  const canAccessModule = (moduleSlug: string): boolean => {
    if (!data) return false;
    const prefix = `${moduleSlug}.`;
    for (const key of allowedKeys) {
      if (key === moduleSlug || key.startsWith(prefix)) return true;
    }
    return false;
  };

  return { hasPermission, canAccessModule, isLoaded: !!data };
}
