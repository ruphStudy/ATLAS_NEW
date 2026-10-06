export const TENANT_ISOLATION_MODULE = 'tenant-isolation';

/**
 * Request body/query/param keys that must never be trusted as-is — if a
 * client supplies one of these AND it disagrees with the resolved
 * `ITenantContext.workspaceId`/`organizationId`, the request is rejected as
 * tampering. Kept as a single source of truth rather than repeating literal
 * key names in every controller.
 */
export const TENANT_ID_PARAM_KEYS: string[] = ['workspaceId', 'workspace_id', 'organizationId', 'organization_id', 'tenantId', 'tenant_id'];

export const SKIP_TENANT_ISOLATION_METADATA_KEY = 'tenant-isolation:skip';
export const ALLOW_PLATFORM_ADMIN_METADATA_KEY = 'tenant-isolation:allow-platform-admin';

/** Workspace statuses considered "active" for tenant-isolation purposes — anything else (SUSPENDED, ARCHIVED, CANCELLED) rejects the request. */
export const ACTIVE_TENANT_WORKSPACE_STATUSES: string[] = ['ACTIVE', 'TRIAL'];
