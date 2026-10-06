import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { PlanManagementModule } from '@modules/plan-management/plan-management.module';
import { SubscriptionManagementModule } from '@modules/subscription-management/subscription-management.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsRepository } from './feature-flags.repository';
import { FeatureFlagCacheService } from './feature-flag-cache.service';
import { FeatureFlagsEventQueue, FeatureFlagsEventWorker } from './jobs';

/**
 * FeatureFlagsModule — centralized, configuration-driven flag evaluation
 * engine. Flag *definitions* (schema, dependencies, kill switch) are
 * global; per-scope rollout/targeting config lives on `FeatureFlagOverride`
 * (GLOBAL/ORGANIZATION/WORKSPACE/PLAN/USER/ENVIRONMENT), resolved with the
 * same scope-precedence idiom `SettingsService.resolve()` uses. Plan-gated
 * targeting consumes `PlanManagementService.getEntitlementSnapshot()` and
 * `SubscriptionManagementService.getEntitlementReference()` rather than
 * re-deriving entitlement data — Plan Management explicitly documents
 * itself as the entitlement source of truth, not an evaluation engine.
 * Caching follows the same per-module in-process `Map` pattern as
 * `PlanCacheService`/`SettingsCacheService` (no shared cache abstraction
 * exists in this codebase), invalidated event-driven via the queue worker
 * on every definition/override write.
 */
@Module({
  imports: [
    DatabaseModule,
    PlanManagementModule,
    SubscriptionManagementModule,
    RolesPermissionsModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.FEATURE_FLAGS_EVENTS,
    }),
  ],
  controllers: [FeatureFlagsController],
  providers: [
    FeatureFlagsService,
    FeatureFlagsRepository,
    FeatureFlagCacheService,
    FeatureFlagsEventQueue,
    FeatureFlagsEventWorker,
  ],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
