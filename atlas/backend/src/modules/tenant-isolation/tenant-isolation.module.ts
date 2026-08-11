import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { UsersModule } from '@modules/users/users.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantContextService } from './tenant-context.service';
import { TenantIsolationService } from './tenant-isolation.service';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { TenantIsolationGuard } from './guards/tenant-isolation.guard';
import { PlatformAdminGuard } from './guards/platform-admin.guard';

/**
 * TenantIsolationModule — centralized, reusable tenant-isolation
 * infrastructure built entirely on top of the existing Authentication (JWT
 * already validated by the global `JwtAuthGuard`), Workspace Management
 * (membership resolution, workspace status) and Audit Logs
 * infrastructure — none of which is redesigned here.
 *
 * - `TenantContextInterceptor` is registered globally (`APP_INTERCEPTOR`)
 *   and is purely additive: it populates `TenantContextService` for every
 *   authenticated request and never rejects one, so every existing
 *   controller keeps working unchanged.
 * - `TenantIsolationGuard` provides the actual enforcement (membership,
 *   active-tenant, tenant-ID-tampering) but is opt-in — apply it with
 *   `@UseGuards(TenantIsolationGuard)` on tenant-owned resources going
 *   forward, after `TenantIsolationModule` is imported.
 * - `TenantAwareRepository` (base class) and the utilities in
 *   `tenant-scope.util.ts` / `tenant-job-context.util.ts` are exported for
 *   any module to adopt without needing this module to know about them.
 */
@Module({
  imports: [WorkspaceModule, UsersModule, AuditLogsModule],
  providers: [
    TenantContextService,
    TenantIsolationService,
    TenantIsolationGuard,
    PlatformAdminGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
  exports: [TenantContextService, TenantIsolationService, TenantIsolationGuard, PlatformAdminGuard],
})
export class TenantIsolationModule {}
