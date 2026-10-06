import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { SettingsModule } from '@modules/settings/settings.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { SaasMonitoringModule } from '@modules/saas-monitoring/saas-monitoring.module';
import { TenantAnalyticsModule } from '@modules/tenant-analytics/tenant-analytics.module';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { UsersModule } from '@modules/users/users.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { SaasHealthController } from './saas-health.controller';
import { SaasHealthService } from './saas-health.service';
import { SaasHealthRepository } from './saas-health.repository';
import { SaasHealthEventQueue, SaasHealthEventWorker } from './jobs';

/**
 * SaasHealthModule — the consolidated platform/organization/tenant health
 * view for the SaaS module family, built entirely on top of SaaS
 * Monitoring's already-computed per-module snapshots and Tenant Analytics'
 * already-computed business health score. It never re-gathers a raw queue/
 * audit signal itself (`SaasMonitoringModule` owns that) and never
 * recomputes a business metric (`TenantAnalyticsModule` owns that) —
 * `SaasHealthService.evaluateTenant()` asks `SaasMonitoringService` to
 * refresh, reads the result back, and layers exactly three new concerns on
 * top: a composite 0-100 health score, cascading-dependency-impact
 * detection over a static module graph, and maintenance windows (the
 * source of the extra OFFLINE/MAINTENANCE states neither Operations
 * Health nor SaaS Monitoring track). `EVENT_DRIVEN` is a first-class
 * evaluation trigger any importing module can invoke via the exported
 * `SaasHealthService.evaluateTenant()` directly — deliberately NOT wired
 * as a second BullMQ consumer on SaaS Monitoring's own event queue, since
 * multiple `@Processor` workers on the same queue name COMPETE for jobs
 * rather than each seeing every event, which would silently drop most
 * transitions instead of reliably re-evaluating on every one.
 */
@Module({
  imports: [
    DatabaseModule,
    SettingsModule,
    AuditLogsModule,
    SaasMonitoringModule,
    TenantAnalyticsModule,
    WorkspaceModule,
    UsersModule,
    TenantIsolationModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.SAAS_HEALTH_EVENTS }),
  ],
  controllers: [SaasHealthController],
  providers: [SaasHealthService, SaasHealthRepository, SaasHealthEventQueue, SaasHealthEventWorker],
  exports: [SaasHealthService],
})
export class SaasHealthModule {}
