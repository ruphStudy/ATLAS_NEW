import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { UsersModule } from '@modules/users/users.module';
import { SubscriptionManagementModule } from '@modules/subscription-management/subscription-management.module';
import { BillingEngineModule } from '@modules/billing-engine/billing-engine.module';
import { PaymentProviderModule } from '@modules/payment-provider/payment-provider.module';
import { UsageTrackingModule } from '@modules/usage-tracking/usage-tracking.module';
import { LicenseManagementModule } from '@modules/license-management/license-management.module';
import { AnalyticsCacheModule } from '@modules/analytics-cache/analytics-cache.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { TenantAnalyticsController } from './tenant-analytics.controller';
import { TenantAnalyticsService } from './tenant-analytics.service';
import { TenantAnalyticsRepository } from './tenant-analytics.repository';
import { TenantAnalyticsEventQueue, TenantAnalyticsEventWorker } from './jobs';

/**
 * TenantAnalyticsModule — platform-admin-only, read-heavy analytics over
 * the SaaS/tenant stack. Deliberately does NOT plug into the pre-existing
 * e-commerce/marketplace Analytics family (`AnalyticsFoundationModule`,
 * `DataAggregationEngineModule`, `ExportFrameworkModule`): their entity/
 * source-module vocabularies are closed enums with zero tenant/billing/
 * subscription concepts, and two of them are stubbed (`DataAggregationEngine
 * .aggregateData()` fabricates random numbers; `ExportFrameworkService
 * .performExport()` only handles pre-registered Report Builder definitions
 * and hardcodes fake file metadata) — using them would mean fake data or a
 * forced, awkward fit. The one exception is `AnalyticsCacheModule`, which
 * IS genuinely generic (structural cache-key building, no domain enums in
 * its logic) and already cross-module-consumed, so this module injects it
 * directly for caching MRR/ARR/cohort/churn computations. All revenue/
 * churn/payment figures are derived from each owning module's OWN already-
 * computed fields (`BillingEngineService`'s `total`/`balanceDue`,
 * `SubscriptionManagementService`'s `SubscriptionHistory` change types,
 * `PaymentProviderService`'s transaction statuses) — never recomputed.
 */
@Module({
  imports: [
    DatabaseModule,
    WorkspaceModule,
    UsersModule,
    SubscriptionManagementModule,
    BillingEngineModule,
    PaymentProviderModule,
    UsageTrackingModule,
    LicenseManagementModule,
    AnalyticsCacheModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.TENANT_ANALYTICS_EVENTS,
    }),
  ],
  controllers: [TenantAnalyticsController],
  providers: [
    TenantAnalyticsService,
    TenantAnalyticsRepository,
    TenantAnalyticsEventQueue,
    TenantAnalyticsEventWorker,
  ],
  exports: [TenantAnalyticsService],
})
export class TenantAnalyticsModule {}
