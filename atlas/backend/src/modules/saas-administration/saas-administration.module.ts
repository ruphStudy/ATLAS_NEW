import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { SubscriptionManagementModule } from '@modules/subscription-management/subscription-management.module';
import { BillingEngineModule } from '@modules/billing-engine/billing-engine.module';
import { PaymentProviderModule } from '@modules/payment-provider/payment-provider.module';
import { UsageTrackingModule } from '@modules/usage-tracking/usage-tracking.module';
import { QuotaManagementModule } from '@modules/quota-management/quota-management.module';
import { FeatureFlagsModule } from '@modules/feature-flags/feature-flags.module';
import { LicenseManagementModule } from '@modules/license-management/license-management.module';
import { AuthenticationModule } from '@modules/authentication/authentication.module';
import { UsersModule } from '@modules/users/users.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { SaasAdministrationController } from './saas-administration.controller';
import { SaasAdministrationService } from './saas-administration.service';
import { SaasAdministrationRepository } from './saas-administration.repository';
import { SaasAdministrationEventQueue, SaasAdministrationEventWorker } from './jobs';

/**
 * SaasAdministrationModule — the central platform-admin orchestration layer.
 * Every route is gated by `PlatformAdminGuard` (true ATLAS-staff only, not
 * workspace OWNER/ADMIN). This module deliberately owns almost no business
 * logic of its own: tenant lifecycle delegates to `WorkspaceService`'s
 * platform-admin-aware bypass (added alongside this module — an additive,
 * backward-compatible parameter, not a redesign), plan/subscription/quota/
 * feature overrides are thin pass-throughs to each owning module's own
 * admin primitive (`SubscriptionManagementService.changePlan()`/
 * `.adminOverride()`, `QuotaManagementService.createOverride()`,
 * `FeatureFlagsService.createOverride()`), and billing/payment/usage/
 * license views are read-only pass-throughs. The only genuinely new state
 * this module owns is admin-specific annotation (notes, internal flags,
 * support status), the cross-tenant immutable `AdminActionLog` (deliberately
 * separate from per-workspace Audit Logs, which it also always writes to
 * alongside), and tracked impersonation sessions — the JWT itself is minted
 * via the same `AuthenticationService.issueTokensForWorkspace()` every
 * other module's login-adjacent flow uses, never a bespoke token scheme.
 */
@Module({
  imports: [
    DatabaseModule,
    WorkspaceModule,
    SubscriptionManagementModule,
    BillingEngineModule,
    PaymentProviderModule,
    UsageTrackingModule,
    QuotaManagementModule,
    FeatureFlagsModule,
    LicenseManagementModule,
    AuthenticationModule,
    UsersModule,
    AuditLogsModule,
    TenantIsolationModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.SAAS_ADMINISTRATION_EVENTS,
    }),
  ],
  controllers: [SaasAdministrationController],
  providers: [
    SaasAdministrationService,
    SaasAdministrationRepository,
    SaasAdministrationEventQueue,
    SaasAdministrationEventWorker,
  ],
  exports: [SaasAdministrationService],
})
export class SaasAdministrationModule {}
