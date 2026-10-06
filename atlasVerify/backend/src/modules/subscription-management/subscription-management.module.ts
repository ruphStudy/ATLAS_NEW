import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { SubscriptionManagementController } from './subscription-management.controller';
import { SubscriptionManagementService } from './subscription-management.service';
import { SubscriptionManagementRepository } from './subscription-management.repository';
import { SubscriptionCacheService } from './subscription-cache.service';
import { SubscriptionManagementEventQueue, SubscriptionManagementEventWorker } from './jobs';

/**
 * SubscriptionManagementModule — tracks subscription lifecycle
 * (create/activate/upgrade/downgrade/pause/resume/cancel/renew/expire) for
 * an organization or workspace tenant. Deliberately excludes Plan
 * Management, Billing, Payment, Usage and Quota business logic — `planKey`
 * is an opaque reference and `prorationReference` is a structured hint,
 * both interpreted only by those (separate, not-yet-built) systems. Tenant
 * scoping/membership reuses Workspace Management + Tenant Isolation
 * directly; nothing here re-implements them.
 */
@Module({
  imports: [
    DatabaseModule,
    WorkspaceModule,
    RolesPermissionsModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.SUBSCRIPTION_MANAGEMENT_EVENTS,
    }),
  ],
  controllers: [SubscriptionManagementController],
  providers: [
    SubscriptionManagementService,
    SubscriptionManagementRepository,
    SubscriptionCacheService,
    SubscriptionManagementEventQueue,
    SubscriptionManagementEventWorker,
  ],
  exports: [SubscriptionManagementService],
})
export class SubscriptionManagementModule {}
