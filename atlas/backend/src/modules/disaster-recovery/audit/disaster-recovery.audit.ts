import { Injectable, Logger } from '@nestjs/common';
import { DisasterRecoveryRepository } from '../disaster-recovery.repository';
import { IDrPolicy, IDrRecoveryPlan } from '../interfaces';

/**
 * DisasterRecoveryAudit
 *
 * Writes version/status-change snapshots to the append-only
 * `DrPolicyHistory`/`DrRecoveryPlanHistory` tables — mirrors the
 * versioned-history pattern used across every framework module this
 * session. Cross-cutting compliance entries (recovery execution
 * lifecycle, disaster detection, overrides) are written separately by
 * `DisasterRecoveryService` to the central `AuditLogsService`, and
 * `DrRecoveryCheckpoint` rows themselves form the immutable execution
 * audit trail.
 */
@Injectable()
export class DisasterRecoveryAudit {
  private readonly logger = new Logger(DisasterRecoveryAudit.name);

  constructor(private readonly repository: DisasterRecoveryRepository) {}

  async logPolicyChange(policy: IDrPolicy, changeReason: string, changedBy?: string): Promise<void> {
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
      this.logger.warn(`Audit log write failed for DR policy '${policy.id}': ${(err as Error).message}`);
    }
  }

  async logPlanChange(plan: IDrRecoveryPlan, changeReason: string, changedBy?: string): Promise<void> {
    try {
      const { id, version, status, deletedAt, createdBy, updatedBy, ...rest } = plan;
      await this.repository.createPlanHistory({
        planId: id,
        version,
        status,
        snapshot: rest as unknown as Record<string, unknown>,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.warn(`Audit log write failed for DR plan '${plan.id}': ${(err as Error).message}`);
    }
  }
}
