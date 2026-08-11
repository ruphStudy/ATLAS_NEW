import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { PlanManagementModule } from '@modules/plan-management/plan-management.module';
import { SubscriptionManagementModule } from '@modules/subscription-management/subscription-management.module';
import { UsageTrackingModule } from '@modules/usage-tracking/usage-tracking.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { QuotaManagementController } from './quota-management.controller';
import { QuotaManagementService } from './quota-management.service';
import { QuotaManagementRepository } from './quota-management.repository';
import { QuotaManagementEventQueue, QuotaManagementEventWorker } from './jobs';

/**
 * QuotaManagementModule — the configuration-driven enforcement/policy layer
 * Plan Management explicitly says it does not provide ("no Usage/Quota
 * enforcement engine here" per `IPlanLimit`'s own doc comment). Consumed
 * usage is NEVER queried from `UsageRecord` directly — always via
 * `UsageTrackingService.getCurrentUsage()`, which this module also never
 * duplicates the aggregation logic of. Billing calculations are likewise
 * never performed here (Billing Engine stays a passive calculator over
 * caller-supplied figures) — this module only PUBLISHES quota-warning/
 * exceeded/blocked/reset events for whatever assembles billing periods to
 * consume. `QuotaPolicy` falls back to Plan Management's raw declared
 * limit when no explicit policy is configured, so enforcement works with
 * zero required setup while staying fully overridable per plan/org/
 * workspace/user via policies and time-boxed admin `QuotaOverride`s.
 */
@Module({
  imports: [
    DatabaseModule,
    PlanManagementModule,
    SubscriptionManagementModule,
    UsageTrackingModule,
    RolesPermissionsModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.QUOTA_MANAGEMENT_EVENTS,
    }),
  ],
  controllers: [QuotaManagementController],
  providers: [
    QuotaManagementService,
    QuotaManagementRepository,
    QuotaManagementEventQueue,
    QuotaManagementEventWorker,
  ],
  exports: [QuotaManagementService],
})
export class QuotaManagementModule {}
