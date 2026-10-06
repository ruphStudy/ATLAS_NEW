import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { SubscriptionManagementModule } from '@modules/subscription-management/subscription-management.module';
import { UsageTrackingModule } from '@modules/usage-tracking/usage-tracking.module';
import { FeatureFlagsModule } from '@modules/feature-flags/feature-flags.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { AppStoreController } from './app-store.controller';
import { AppStoreService } from './app-store.service';
import { AppStoreRepository } from './app-store.repository';
import { AppStoreCredentialEncryptor } from './app-store-credential.encryptor';
import { AppStoreCredentialDecryptor } from './app-store-credential.decryptor';
import { AppStoreEventQueue, AppStoreEventWorker } from './jobs';

/**
 * AppStoreModule — the central catalog/lifecycle/installation manager for
 * ATLAS extensions, integrations and add-ons. Deliberately owns NO app
 * runtime logic itself ("keep app-specific runtime logic outside the App
 * Store module") — installing an app only creates a tracked
 * `AppInstallation` record; whatever actually executes the app's code
 * lives entirely outside this module. Eligibility is checked, never
 * re-implemented: `FeatureFlagsService.evaluate()` for rollout gating,
 * `SubscriptionManagementService.getEntitlementReference()`/
 * `getEffectiveSubscription()` for plan/paid-app gating — this module
 * never creates subscriptions or billing periods itself, only reads
 * existing entitlement state before allowing an install. Distinct from
 * the pre-existing e-commerce `marketplace*` module family (selling-
 * channel integrations) — this is ATLAS's own app/plugin store, an
 * unrelated "marketplace" in name only, hence the `app-store` module name
 * rather than anything prefixed `marketplace-`.
 */
@Module({
  imports: [
    DatabaseModule,
    SubscriptionManagementModule,
    UsageTrackingModule,
    FeatureFlagsModule,
    RolesPermissionsModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.APP_STORE_EVENTS,
    }),
  ],
  controllers: [AppStoreController],
  providers: [
    AppStoreService,
    AppStoreRepository,
    AppStoreCredentialEncryptor,
    AppStoreCredentialDecryptor,
    AppStoreEventQueue,
    AppStoreEventWorker,
  ],
  exports: [AppStoreService],
})
export class AppStoreModule {}
