/** Where a resolved tenant context came from — useful for audit trails and for distinguishing a normal request from a platform-admin override. */
export enum TenantContextSource {
  JWT = 'JWT',
  PLATFORM_ADMIN_OVERRIDE = 'PLATFORM_ADMIN_OVERRIDE',
}

export enum TenantIsolationSecurityEvent {
  CROSS_TENANT_ACCESS_ATTEMPT = 'tenant-isolation.cross_tenant_access_attempt',
  TENANT_ID_TAMPERING_DETECTED = 'tenant-isolation.tenant_id_tampering_detected',
  INACTIVE_TENANT_ACCESS_ATTEMPT = 'tenant-isolation.inactive_tenant_access_attempt',
  PLATFORM_ADMIN_OVERRIDE_USED = 'tenant-isolation.platform_admin_override_used',
}

/**
 * The resolved tenant identity for the current async execution — populated
 * once per request by `TenantContextInterceptor` (from the JWT already
 * validated by the existing global `JwtAuthGuard`) and carried through the
 * entire call stack via `AsyncLocalStorage`, including into any BullMQ job
 * enqueued from within that stack (see `stampJobTenantContext`).
 */
export interface ITenantContext {
  userId: string;
  workspaceId: string;
  organizationId: string | null;
  role: string;
  isPlatformAdmin: boolean;
  source: TenantContextSource;
}

/** Serializable form of `ITenantContext` attached to BullMQ job payloads so a worker (which has no HTTP request) can restore it before processing. */
export type ITenantJobContext = ITenantContext;
