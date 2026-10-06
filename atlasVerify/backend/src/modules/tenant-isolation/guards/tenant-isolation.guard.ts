import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantIsolationService } from '../tenant-isolation.service';
import { ALLOW_PLATFORM_ADMIN_METADATA_KEY, SKIP_TENANT_ISOLATION_METADATA_KEY } from '../constants';
import { ITenantContext } from '../interfaces';
import { MissingTenantContextException } from '../exceptions/tenant-isolation.exceptions';

interface IRequestForGuard {
  user?: { sub?: string; workspaceId?: string; role?: string };
  tenantContext?: ITenantContext;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  url?: string;
}

/**
 * Opt-in guard providing the actual enforcement (membership + tenant-ID
 * tampering + active-tenant checks) — apply with `@UseGuards(TenantIsolationGuard)`
 * on any controller/route that owns tenant-scoped resources. Deliberately
 * NOT registered globally: rolling strict membership/tampering checks onto
 * every already-shipped endpoint without per-module verification risks
 * breaking working behavior, which this module must not do. The passive
 * `TenantContextInterceptor` (registered globally) makes the context
 * available everywhere regardless of whether a route also uses this guard.
 */
@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantIsolationService: TenantIsolationService,
  ) {}

  async canActivate(executionContext: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_ISOLATION_METADATA_KEY, [
      executionContext.getHandler(),
      executionContext.getClass(),
    ]);
    if (skip) {
      return true;
    }

    const request = executionContext.switchToHttp().getRequest<IRequestForGuard>();
    if (!request.user?.sub || !request.user?.workspaceId) {
      throw new MissingTenantContextException();
    }

    const context = request.tenantContext ?? (await this.tenantIsolationService.resolveContext(request.user));
    request.tenantContext = context;

    const workspace = await this.tenantIsolationService.getWorkspaceOrThrow(context.workspaceId);
    this.tenantIsolationService.assertActiveTenant(workspace);

    const allowPlatformAdmin = this.reflector.getAllAndOverride<boolean>(ALLOW_PLATFORM_ADMIN_METADATA_KEY, [
      executionContext.getHandler(),
      executionContext.getClass(),
    ]);

    if (allowPlatformAdmin && context.isPlatformAdmin) {
      await this.tenantIsolationService.recordPlatformAdminOverride(context, workspace.id, request.url ?? 'unknown-route');
    } else {
      await this.tenantIsolationService.assertMembership(workspace, context.userId);
    }

    await this.tenantIsolationService.assertNoTenantTampering(context, {
      body: request.body,
      query: request.query,
      params: request.params,
    });

    return true;
  }
}
