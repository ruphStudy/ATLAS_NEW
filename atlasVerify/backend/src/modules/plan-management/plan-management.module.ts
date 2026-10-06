import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { SettingsModule } from '@modules/settings/settings.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { PlanManagementController } from './plan-management.controller';
import { PlanManagementService } from './plan-management.service';
import { PlanManagementRepository } from './plan-management.repository';
import { PlanCacheService } from './plan-cache.service';
import { PlanManagementEventQueue, PlanManagementEventWorker } from './jobs';

/**
 * PlanManagementModule — owns the plan catalog (versioned, immutable once
 * published) consumed by Subscription Management via `planKey`/`code`.
 * Deliberately excludes Subscription, Billing, Payment, Usage, Quota,
 * License and Feature Flag business logic — this module only stores and
 * exposes normalized entitlement/limit declarations for those (separate)
 * systems to interpret. Mutations require `PlatformAdminGuard` (from
 * `TenantIsolationModule`) since the catalog is platform-wide, not
 * workspace-owned data; reads are open to any authenticated caller.
 */
@Module({
  imports: [
    DatabaseModule,
    SettingsModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.PLAN_MANAGEMENT_EVENTS,
    }),
  ],
  controllers: [PlanManagementController],
  providers: [
    PlanManagementService,
    PlanManagementRepository,
    PlanCacheService,
    PlanManagementEventQueue,
    PlanManagementEventWorker,
  ],
  exports: [PlanManagementService],
})
export class PlanManagementModule {}
