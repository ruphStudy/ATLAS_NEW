import { Injectable } from '@nestjs/common';
import { IStepExecutionContext, IStepExecutionResult, IWorkflowStepExecutor, WorkflowStepStatus } from '@modules/enterprise-workflow-engine/interfaces';
import { BackupProviderRegistry } from '@modules/backup-provider/registry/backup-provider.registry';
import { BackupTargetType, IBackupDescriptor } from '@modules/backup-provider/interfaces';
import { DisasterRecoveryValidator } from '../validator/disaster-recovery.validator';
import { DisasterRecoveryRepository } from '../disaster-recovery.repository';
import { DrCheckpointStatus } from '../interfaces';

/**
 * RestoreTargetStepExecutor — a RESTORE_TARGET step re-validates
 * eligibility, then either simulates (`variables.isDryRun`) or actually
 * invokes the owning `IBackupProviderAdapter.restore()` for
 * `config.targetType`. Provider-specific restore behavior always stays
 * behind the adapter — this executor only orchestrates.
 */
@Injectable()
export class RestoreTargetStepExecutor implements IWorkflowStepExecutor {
  readonly stepType = 'RESTORE_TARGET';

  constructor(
    private readonly validator: DisasterRecoveryValidator,
    private readonly repository: DisasterRecoveryRepository,
    private readonly backupProviderRegistry: BackupProviderRegistry,
  ) {}

  async execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult> {
    const targetType = ctx.step.config.targetType as string;
    const targetWorkspaceIds = (ctx.execution.variables.targetWorkspaceIds as string[] | undefined) ?? [];
    const workspaceId = targetWorkspaceIds[0] ?? null;
    const isDryRun = Boolean(ctx.execution.variables.isDryRun);

    const eligibility = await this.validator.checkEligibility(workspaceId, targetType);
    const drExecution = await this.repository.findExecutionByWorkflowExecutionId(ctx.execution.id);

    if (!eligibility.eligible || !eligibility.providerKey || !eligibility.externalRef) {
      await this.writeCheckpoint(drExecution, targetType, DrCheckpointStatus.FAILED, eligibility.backupRecordId, eligibility.reason);
      return {
        status: WorkflowStepStatus.FAILED,
        errorCode: 'BACKUP_NOT_ELIGIBLE',
        errorMessage: eligibility.reason ?? `No eligible backup for target type '${targetType}'`,
      };
    }

    if (!this.backupProviderRegistry.isRegistered(eligibility.providerKey)) {
      await this.writeCheckpoint(drExecution, targetType, DrCheckpointStatus.FAILED, eligibility.backupRecordId, 'Backup provider no longer registered');
      return { status: WorkflowStepStatus.FAILED, errorCode: 'PROVIDER_NOT_REGISTERED', errorMessage: `Backup provider '${eligibility.providerKey}' is not registered` };
    }

    if (isDryRun) {
      await this.writeCheckpoint(drExecution, targetType, DrCheckpointStatus.SIMULATED, eligibility.backupRecordId, 'Dry-run — restore simulated, no changes made');
      return { status: WorkflowStepStatus.COMPLETED, output: { simulated: true, targetType } };
    }

    const provider = this.backupProviderRegistry.get(eligibility.providerKey);
    const descriptor: IBackupDescriptor = {
      providerKey: eligibility.providerKey,
      targetType: targetType as BackupTargetType,
      externalRef: eligibility.externalRef,
      capturedAt: new Date(),
    };

    const result = await provider.restore(descriptor, { isDryRun: false, targetWorkspaceIds });
    await this.writeCheckpoint(
      drExecution,
      targetType,
      result.success ? DrCheckpointStatus.VALIDATED : DrCheckpointStatus.FAILED,
      eligibility.backupRecordId,
      result.message,
    );

    if (!result.success) {
      return { status: WorkflowStepStatus.FAILED, errorCode: 'RESTORE_FAILED', errorMessage: result.message ?? `Restore failed for target type '${targetType}'` };
    }

    return { status: WorkflowStepStatus.COMPLETED, output: { simulated: false, targetType, details: result.details ?? {} } };
  }

  private async writeCheckpoint(
    drExecution: Awaited<ReturnType<DisasterRecoveryRepository['findExecutionByWorkflowExecutionId']>>,
    targetType: string,
    status: DrCheckpointStatus,
    backupRecordId: string | undefined,
    notes: string | undefined,
  ): Promise<void> {
    if (!drExecution) return;
    const nextSequence = drExecution.currentCheckpointSequence + 1;
    await this.repository.createCheckpoint({
      executionId: drExecution.id,
      workspaceId: drExecution.workspaceId,
      sequence: nextSequence,
      targetType,
      status,
      backupRecordId: backupRecordId ?? null,
      notes: notes ?? null,
    });
    await this.repository.updateExecution(drExecution.id, { currentCheckpointSequence: nextSequence });
  }
}
