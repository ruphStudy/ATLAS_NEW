import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { MultiBusinessModule } from '@modules/multi-business/multi-business.module';
import { MonitoringFrameworkModule } from '@modules/monitoring-framework/monitoring-framework.module';
import { EnterpriseAuditModule } from '@modules/enterprise-audit/enterprise-audit.module';
import { EnterpriseWorkflowEngineModule } from '@modules/enterprise-workflow-engine/enterprise-workflow-engine.module';
import { EnterpriseHealthController } from './enterprise-health.controller';
import { EnterpriseHealthService } from './enterprise-health.service';
import { EnterpriseHealthRepository } from './enterprise-health.repository';
import { EnterpriseHealthValidator } from './enterprise-health.validator';
import { EnterpriseHealthEventQueue, EnterpriseHealthEventWorker } from './jobs';

/**
 * EnterpriseHealthModule
 *
 * The organization-admin, cross-business/cross-workspace/cross-region/
 * cross-provider health surface. Never re-collects health signals:
 * `MonitoringFrameworkService.getWorkspaceDashboard()`/`getPlatformDashboard()`
 * stay the one source of already-aggregated `IMonitoringSignal`s, security
 * posture is read from `EnterpriseAuditService`'s already-existing incident
 * visibility, and recovery readiness is read off the already-aggregated
 * `DISASTER_RECOVERY`/`BACKUP_MANAGEMENT` signals. What's genuinely new and
 * owned only here: the composite enterprise health score, organization/
 * business/region/provider dashboards and their append-only
 * `EnterpriseHealthSnapshot` history, and `EnterpriseHealthIncident` —
 * correlated incidents spanning more than one workspace, optionally
 * triggering an already-published Enterprise Workflow Engine execution
 * (configuration-driven, never a hardcoded workflow reference).
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    RolesPermissionsModule,
    TenantIsolationModule,
    WorkspaceModule,
    NotificationsModule,
    MultiBusinessModule,
    MonitoringFrameworkModule,
    EnterpriseAuditModule,
    EnterpriseWorkflowEngineModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.ENTERPRISE_HEALTH_EVENTS }),
  ],
  controllers: [EnterpriseHealthController],
  providers: [EnterpriseHealthRepository, EnterpriseHealthValidator, EnterpriseHealthEventQueue, EnterpriseHealthEventWorker, EnterpriseHealthService],
  exports: [EnterpriseHealthService],
})
export class EnterpriseHealthModule {}
