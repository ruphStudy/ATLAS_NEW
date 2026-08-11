import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { SubscriptionManagementModule } from '@modules/subscription-management/subscription-management.module';
import { PlanManagementModule } from '@modules/plan-management/plan-management.module';
import { AiUsageTrackingModule } from '@modules/ai-usage-tracking/ai-usage-tracking.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { UsageTrackingController } from './usage-tracking.controller';
import { UsageTrackingService } from './usage-tracking.service';
import { UsageTrackingRepository } from './usage-tracking.repository';
import { UsageTrackingEventQueue, UsageTrackingEventWorker } from './jobs';

/**
 * UsageTrackingModule — the generic, cross-module SaaS usage ledger
 * (API calls, storage, marketplaces, suppliers, warehouses, reports,
 * automations, and any other `resourceKey` a module chooses to report).
 * Never duplicates AI Usage Tracking's own token/model-level ledger:
 * writes to the `AI_USAGE` resource key are rejected outright, and reads
 * for it delegate entirely to `AiUsageTrackingService.getUsageSummary()`.
 * Entitlement comparisons resolve limits from Plan Management's
 * `getEntitlementSnapshot()` for the workspace's Subscription Management
 * effective subscription — never a redefined limit table.
 */
@Module({
  imports: [
    DatabaseModule,
    SubscriptionManagementModule,
    PlanManagementModule,
    AiUsageTrackingModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.USAGE_TRACKING_EVENTS,
    }),
  ],
  controllers: [UsageTrackingController],
  providers: [UsageTrackingService, UsageTrackingRepository, UsageTrackingEventQueue, UsageTrackingEventWorker],
  exports: [UsageTrackingService],
})
export class UsageTrackingModule {}
