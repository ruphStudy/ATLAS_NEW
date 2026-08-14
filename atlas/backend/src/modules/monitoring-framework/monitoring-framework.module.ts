import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { SaasHealthModule } from '@modules/saas-health/saas-health.module';
import { OperationsHealthModule } from '@modules/operations-health/operations-health.module';
import { AiMonitoringHealthModule } from '@modules/ai-monitoring-health/ai-monitoring-health.module';
import { AnalyticsHealthModule } from '@modules/analytics-health/analytics-health.module';
import { MarketplaceHealthModule } from '@modules/marketplace-health/marketplace-health.module';
import { DisasterRecoveryModule } from '@modules/disaster-recovery/disaster-recovery.module';
import { BackupManagementModule } from '@modules/backup-management/backup-management.module';

import { MonitoringFrameworkController } from './monitoring-framework.controller';
import { MonitoringFrameworkService } from './monitoring-framework.service';
import { MonitoringFrameworkRepository } from './monitoring-framework.repository';
import { MonitoringFrameworkValidator } from './validator/monitoring-framework.validator';
import { MonitoringFrameworkAudit } from './audit/monitoring-framework.audit';
import { MonitoringSourceRegistry } from './registry/monitoring-source.registry';
import {
  AiMonitoringHealthSourceAdapter,
  AnalyticsHealthSourceAdapter,
  BackupManagementSourceAdapter,
  DisasterRecoverySourceAdapter,
  MarketplaceHealthSourceAdapter,
  OperationsHealthSourceAdapter,
  SaasHealthSourceAdapter,
} from './sources';
import { MonitoringFrameworkEventQueue, MonitoringFrameworkEventWorker } from './jobs';

/**
 * MonitoringFrameworkModule
 *
 * A central, normalizing aggregation layer over every existing health/
 * monitoring module. `MonitoringSourceRegistry` holds one thin adapter
 * per aggregated module (SaaS Health, Operations Health, AI Monitoring
 * Health, Analytics Health, Marketplace Health, Disaster Recovery,
 * Backup Management) — each adapter only reads that module's own
 * already-computed summary and maps its status vocabulary into the
 * common `MonitoringHealthLevel`. This module never re-gathers
 * underlying signals or duplicates any source module's business logic.
 * What's genuinely new and owned only here: SLI/SLO/alert-rule
 * configuration (condition evaluation reused directly from Business
 * Rules Engine's `evaluateCondition`), cross-source incident
 * correlation and cascading-failure detection, and a correlation-id
 * event ledger. Alerts are delivered through the existing
 * `NotificationsService` — no notification infrastructure is
 * duplicated.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    RolesPermissionsModule,
    TenantIsolationModule,
    NotificationsModule,
    SaasHealthModule,
    OperationsHealthModule,
    AiMonitoringHealthModule,
    AnalyticsHealthModule,
    MarketplaceHealthModule,
    DisasterRecoveryModule,
    BackupManagementModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.MONITORING_FRAMEWORK_EVENTS }),
  ],
  controllers: [MonitoringFrameworkController],
  providers: [
    MonitoringFrameworkRepository,
    MonitoringFrameworkValidator,
    MonitoringFrameworkAudit,
    MonitoringSourceRegistry,
    SaasHealthSourceAdapter,
    OperationsHealthSourceAdapter,
    AiMonitoringHealthSourceAdapter,
    AnalyticsHealthSourceAdapter,
    MarketplaceHealthSourceAdapter,
    DisasterRecoverySourceAdapter,
    BackupManagementSourceAdapter,
    MonitoringFrameworkEventQueue,
    MonitoringFrameworkEventWorker,
    MonitoringFrameworkService,
  ],
  exports: [MonitoringFrameworkService],
})
export class MonitoringFrameworkModule {}
