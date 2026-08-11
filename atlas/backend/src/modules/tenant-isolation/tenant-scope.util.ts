import { TenantAccessDeniedException } from './exceptions/tenant-isolation.exceptions';

/**
 * Asserts a loaded resource actually belongs to the caller's tenant before
 * it is returned/mutated/deleted — the generic guard any module can apply
 * right after a `findById`-style lookup, regardless of what the query's
 * `where` clause already did. Cheap defense in depth against a query that
 * forgot (or was refactored to forget) its own `workspaceId` filter.
 */
export function assertSameTenant(resourceWorkspaceId: string | null | undefined, expectedWorkspaceId: string): void {
  if (resourceWorkspaceId !== expectedWorkspaceId) {
    throw new TenantAccessDeniedException();
  }
}

/**
 * Builds a tenant-scoped cache key — mirrors `CACHE_KEYS` in
 * `@common/constants` but as a generic helper for any module's own
 * arbitrarily-shaped cache keys, so a cache collision can never leak data
 * across workspaces.
 */
export function buildTenantCacheKey(workspaceId: string, ...parts: Array<string | number>): string {
  return `tenant:${workspaceId}:${parts.join(':')}`;
}

/**
 * Builds a tenant-scoped storage/file path prefix — for modules generating
 * files, documents, exports or webhook payloads that must never be
 * addressable across workspaces.
 */
export function buildTenantResourcePath(workspaceId: string, ...parts: Array<string | number>): string {
  return [workspaceId, ...parts.map(String)].join('/');
}
