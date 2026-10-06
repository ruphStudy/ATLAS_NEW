import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { SettingsModule } from '@modules/settings/settings.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { SaasAdministrationModule } from '@modules/saas-administration/saas-administration.module';
import { PluginFrameworkModule } from '@modules/plugin-framework/plugin-framework.module';
import { WebhookFrameworkModule } from '@modules/webhook-framework/webhook-framework.module';
import { PaymentProviderModule } from '@modules/payment-provider/payment-provider.module';
import { UsersModule } from '@modules/users/users.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { SaasMonitoringController } from './saas-monitoring.controller';
import { SaasMonitoringService } from './saas-monitoring.service';
import { SaasMonitoringSignalService } from './saas-monitoring-signal.service';
import { SaasMonitoringRepository } from './saas-monitoring.repository';
import { SaasMonitoringEventQueue, SaasMonitoringEventWorker } from './jobs';

/**
 * SaasMonitoringModule — a read-only monitor over the SaaS/platform-admin
 * module family (Subscription, Billing, Payments, Usage, Quota, Feature
 * Flags, License, API Key, OAuth, SSO, Webhook Framework, App Store, Plugin
 * Framework, SaaS Administration, SaaS Audit). Mirrors `OperationsHealthModule`
 * almost exactly — it never imports a monitored module's repository, only
 * its already-registered BullMQ queue (job counts, pause state) and Audit
 * Logs' existing `findAll()` for a windowed failure count, so it cannot
 * duplicate that module's business logic. The one deliberate exception is a
 * small, read-only business-signal overlay sourced entirely from each
 * owning module's own already-exported aggregate reads
 * (`SaasAdministrationService.getTenantOverview()`,
 * `PluginFrameworkService.findAllActivations()`,
 * `WebhookFrameworkService.findAllWebhooks()`,
 * `PaymentProviderService.checkAllHealth()`) — never a monitored module's
 * repository, never recomputed business logic. Thresholds are
 * configuration-driven via the Settings Framework (registered in
 * `SaasMonitoringService.onModuleInit`). Tenant-scoped routes rely on the
 * already-global tenant-isolation guard; only the cross-tenant
 * platform-summary/incident routes add `PlatformAdminGuard`.
 */
@Module({
  imports: [
    DatabaseModule,
    SettingsModule,
    AuditLogsModule,
    SaasAdministrationModule,
    PluginFrameworkModule,
    WebhookFrameworkModule,
    PaymentProviderModule,
    UsersModule,
    TenantIsolationModule,
    BullModule.registerQueue(
      { name: QUEUE_NAMES.SAAS_MONITORING_EVENTS },
      { name: QUEUE_NAMES.SUBSCRIPTION_MANAGEMENT_EVENTS },
      { name: QUEUE_NAMES.BILLING_ENGINE_EVENTS },
      { name: QUEUE_NAMES.PAYMENT_PROVIDER_EVENTS },
      { name: QUEUE_NAMES.USAGE_TRACKING_EVENTS },
      { name: QUEUE_NAMES.QUOTA_MANAGEMENT_EVENTS },
      { name: QUEUE_NAMES.FEATURE_FLAGS_EVENTS },
      { name: QUEUE_NAMES.LICENSE_MANAGEMENT_EVENTS },
      { name: QUEUE_NAMES.API_KEY_MANAGEMENT_EVENTS },
      { name: QUEUE_NAMES.OAUTH_MANAGEMENT_EVENTS },
      { name: QUEUE_NAMES.SSO_FRAMEWORK_EVENTS },
      { name: QUEUE_NAMES.WEBHOOK_FRAMEWORK_EVENTS },
      { name: QUEUE_NAMES.APP_STORE_EVENTS },
      { name: QUEUE_NAMES.PLUGIN_FRAMEWORK_EVENTS },
      { name: QUEUE_NAMES.SAAS_ADMINISTRATION_EVENTS },
      { name: QUEUE_NAMES.SAAS_AUDIT_EVENTS },
    ),
  ],
  controllers: [SaasMonitoringController],
  providers: [SaasMonitoringService, SaasMonitoringSignalService, SaasMonitoringRepository, SaasMonitoringEventQueue, SaasMonitoringEventWorker],
  exports: [SaasMonitoringService],
})
export class SaasMonitoringModule {}
