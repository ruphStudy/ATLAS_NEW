import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SKIP_TENANT_ISOLATION_METADATA_KEY, ALLOW_PLATFORM_ADMIN_METADATA_KEY } from '../constants';
import { ITenantContext } from '../interfaces';

/**
 * Marks a route as exempt from `TenantIsolationGuard` — for endpoints that
 * are legitimately cross-tenant or workspace-less (e.g. platform-level
 * listing endpoints, health checks mounted behind auth). Has no effect on
 * `@Public()` routes, which never reach the guard's tenant checks anyway
 * since there is no `request.user` to resolve a context from.
 */
export const SkipTenantIsolation = () => SetMetadata(SKIP_TENANT_ISOLATION_METADATA_KEY, true);

/**
 * Opt-in, per-route authorization for platform-admin cross-tenant access.
 * `TenantIsolationGuard` only allows a platform admin to bypass workspace
 * membership when BOTH this decorator is present on the route AND the
 * caller's `ITenantContext.isPlatformAdmin` is true — satisfying "explicit
 * authorized flows" rather than a blanket bypass from the flag alone. Every
 * use is recorded as a `PLATFORM_ADMIN_OVERRIDE_USED` audit entry.
 */
export const AllowPlatformAdmin = () => SetMetadata(ALLOW_PLATFORM_ADMIN_METADATA_KEY, true);

/**
 * Reads the resolved `ITenantContext` off the request (set by
 * `TenantContextInterceptor`). Returns `undefined` for routes with no
 * authenticated user (e.g. `@Public()`) — callers that require a context
 * should use `TenantContextService.getContextOrThrow()` instead.
 */
export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext): ITenantContext | undefined => {
  const request = ctx.switchToHttp().getRequest<{ tenantContext?: ITenantContext }>();
  return request.tenantContext;
});
