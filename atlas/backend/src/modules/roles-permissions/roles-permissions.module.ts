import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { RolesPermissionsController } from './roles-permissions.controller';
import { RolesPermissionsService } from './roles-permissions.service';
import { RolesPermissionsRepository } from './roles-permissions.repository';
import { PermissionResolverService } from './permission-resolver.service';
import { PermissionsGuard } from './guards';
import { RolesPermissionsEventQueue, RolesPermissionsEventWorker } from './jobs';

/**
 * RolesPermissionsModule — centralized RBAC: roles (system/organization/
 * workspace/custom), a shared permission catalog, role inheritance with
 * deny overrides, and time-boxed assignments to users/teams/service
 * accounts. Additive only: the existing global `JwtAuthGuard` and the
 * legacy `@UserRole()` flat-role checks used throughout the codebase are
 * untouched, preserving current access behavior. `PermissionsGuard` +
 * `@RequirePermission(...)` are exported here for any module that wants to
 * opt into granular checks going forward, so permission logic stays
 * centralized in one place instead of being re-implemented per module.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.ROLES_PERMISSIONS_EVENTS,
    }),
  ],
  controllers: [RolesPermissionsController],
  providers: [
    RolesPermissionsService,
    RolesPermissionsRepository,
    PermissionResolverService,
    PermissionsGuard,
    RolesPermissionsEventQueue,
    RolesPermissionsEventWorker,
  ],
  exports: [RolesPermissionsService, PermissionResolverService, PermissionsGuard],
})
export class RolesPermissionsModule {}
