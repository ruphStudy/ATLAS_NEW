import { Injectable, Logger } from '@nestjs/common';
import { BackupManagementRepository } from '../backup-management.repository';
import { IBackupPolicy } from '../interfaces';

/**
 * BackupManagementAudit
 *
 * Writes version/status-change snapshots to the append-only
 * `BackupPolicyHistory` table — mirrors the versioned-history pattern
 * used across every framework module this session. Cross-cutting
 * compliance entries (backup started/completed/failed/expired/
 * verified) are written separately by `BackupManagementService` to the
 * central `AuditLogsService`, and `BackupJob`/`BackupRecord` rows
 * themselves form the immutable backup operation history.
 */
@Injectable()
export class BackupManagementAudit {
  private readonly logger = new Logger(BackupManagementAudit.name);

  constructor(private readonly repository: BackupManagementRepository) {}

  async logPolicyChange(policy: IBackupPolicy, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, version, status, deletedAt, createdBy, updatedBy, ...rest } = policy;
      await this.repository.createPolicyHistory({
        policyId: id,
        version,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for backup policy '${policy.id}': ${(err as Error).message}`);
    }
  }
}
