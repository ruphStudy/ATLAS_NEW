import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { SaasHealthModule } from '@modules/saas-health/saas-health.module';
import { BackupProviderModule } from '@modules/backup-provider/backup-provider.module';
import { EnterpriseWorkflowEngineModule } from '@modules/enterprise-workflow-engine/enterprise-workflow-engine.module';

import { DisasterRecoveryController } from './disaster-recovery.controller';
import { DisasterRecoveryService } from './disaster-recovery.service';
import { DisasterRecoveryRepository } from './disaster-recovery.repository';
import { DisasterRecoveryValidator } from './validator/disaster-recovery.validator';
import { DisasterRecoveryAudit } from './audit/disaster-recovery.audit';
import { DrRecoveryLockService } from './lock/dr-recovery-lock.service';
import {
  BackupDiscoveryStepExecutor,
  HealthCheckStepExecutor,
  RegionalFailoverStepExecutor,
  RestoreTargetStepExecutor,
  ValidateBackupStepExecutor,
} from './executors';
import { DisasterRecoveryEventQueue, DisasterRecoveryEventWorker } from './jobs';

/**
 * DisasterRecoveryModule
 *
 * A policy/plan/execution layer over already-generic infrastructure —
 * never a second execution engine, approval flow or health-check
 * system. A recovery plan's runbook IS a `WorkflowDefinition`
 * (Enterprise Workflow Engine); approval gating is a plain APPROVAL
 * step in that runbook (Enterprise Approval Engine, via the engine's
 * built-in executor); readiness/post-restore health reads SaaS
 * Monitoring's aggregate view (`SaasHealthService`); tenant boundaries
 * are enforced via `TenantIsolationService`. This module registers five
 * new step executors (BACKUP_DISCOVERY/VALIDATE_BACKUP/RESTORE_TARGET/
 * HEALTH_CHECK/REGIONAL_FAILOVER) into the Enterprise Workflow Engine's
 * own `WorkflowStepExecutorRegistry` extension point — the same pattern
 * Business Rules Engine and Enterprise Workflow Engine's own built-ins
 * already use. Backup discovery/restore/integrity is entirely behind
 * `BackupProviderRegistry` — no infrastructure/provider is hardcoded.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    RolesPermissionsModule,
    TenantIsolationModule,
    SaasHealthModule,
    BackupProviderModule,
    EnterpriseWorkflowEngineModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.DISASTER_RECOVERY_EVENTS }),
  ],
  controllers: [DisasterRecoveryController],
  providers: [
    DisasterRecoveryRepository,
    DisasterRecoveryValidator,
    DisasterRecoveryAudit,
    DrRecoveryLockService,
    BackupDiscoveryStepExecutor,
    ValidateBackupStepExecutor,
    RestoreTargetStepExecutor,
    HealthCheckStepExecutor,
    RegionalFailoverStepExecutor,
    DisasterRecoveryEventQueue,
    DisasterRecoveryEventWorker,
    DisasterRecoveryService,
  ],
  exports: [DisasterRecoveryService],
})
export class DisasterRecoveryModule {}
