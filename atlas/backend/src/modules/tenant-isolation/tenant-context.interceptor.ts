import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { TenantIsolationService } from './tenant-isolation.service';
import { ITenantContext } from './interfaces';

interface IRequestWithUserAndTenant {
  user?: { sub?: string; workspaceId?: string; role?: string };
  tenantContext?: ITenantContext;
}

/**
 * Global, non-blocking tenant-context propagation. Registered once as
 * `APP_INTERCEPTOR` (see `TenantIsolationModule`) so `TenantContextService`
 * is populated for EVERY authenticated request without requiring any
 * existing controller to change. Runs after guards (including the existing
 * global `JwtAuthGuard`), so `request.user` is already validated by the time
 * this executes. Routes with no `request.user` (public/unauthenticated) are
 * passed through untouched — this never rejects a request; only the opt-in
 * `TenantIsolationGuard` does that.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantContextInterceptor.name);

  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly tenantIsolationService: TenantIsolationService,
  ) {}

  async intercept(executionContext: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = executionContext.switchToHttp().getRequest<IRequestWithUserAndTenant>();

    if (!request.user?.sub || !request.user?.workspaceId) {
      return next.handle();
    }

    if (request.tenantContext) {
      // Already resolved by TenantIsolationGuard for this request — reuse it, don't resolve twice.
      return this.tenantContextService.run(request.tenantContext, () => next.handle());
    }

    try {
      const context = await this.tenantIsolationService.resolveContext(request.user);
      request.tenantContext = context;
      return this.tenantContextService.run(context, () => next.handle());
    } catch (error) {
      this.logger.warn(`Tenant context resolution failed, proceeding without it: ${(error as Error).message}`);
      return next.handle();
    }
  }
}
