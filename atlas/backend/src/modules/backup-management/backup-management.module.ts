import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@database/database.module';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { RolesPermissionsModule } from '@modules/roles-permissions/roles-permissions.module';
import { TenantIsolationModule } from '@modules/tenant-isolation/tenant-isolation.module';
import { BackupProviderModule } from '@modules/backup-provider/backup-provider.module';

import { BackupManagementController } from './backup-management.controller';
import { BackupManagementService } from './backup-management.service';
import { BackupManagementRepository } from './backup-management.repository';
import { BackupManagementValidator } from './validator/backup-management.validator';
import { BackupManagementAudit } from './audit/backup-management.audit';
import { BackupLockService } from './lock/backup-lock.service';
import { BackupManagementEventQueue, BackupManagementEventWorker } from './jobs';

/**
 * BackupManagementModule
 *
 * Owns backup CREATION and lifecycle — policies (environment/org/
 * workspace/service/data-type, retention, frequency, encryption/
 * compression config), jobs (manual/scheduled/event-triggered, with
 * locking/idempotency mirroring Disaster Recovery's
 * `DrRecoveryLockService`), and the `BackupRecord` creation ledger
 * (distinct from Disaster Recovery's `DrBackupRecord` restore-
 * eligibility cache). Interoperates with Disaster Recovery only through
 * the shared `BackupProviderRegistry`/`IBackupProviderAdapter`
 * foundation — a backup created here becomes discoverable by DR's own
 * discovery flow automatically, no direct module coupling. Storage
 * destinations, encryption and compression are configuration passed to
 * the adapter — never implemented in this module's core logic.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    RolesPermissionsModule,
    TenantIsolationModule,
    BackupProviderModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.BACKUP_MANAGEMENT_EVENTS }),
  ],
  controllers: [BackupManagementController],
  providers: [
    BackupManagementRepository,
    BackupManagementValidator,
    BackupManagementAudit,
    BackupLockService,
    BackupManagementEventQueue,
    BackupManagementEventWorker,
    BackupManagementService,
  ],
  exports: [BackupManagementService],
})
export class BackupManagementModule {}
