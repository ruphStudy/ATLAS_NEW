import { Injectable } from '@nestjs/common';
import { IStepExecutionContext, IStepExecutionResult, IWorkflowStepExecutor, WorkflowStepStatus } from '@modules/enterprise-workflow-engine/interfaces';
import { DisasterRecoveryValidator } from '../validator/disaster-recovery.validator';
import { DisasterRecoveryRepository } from '../disaster-recovery.repository';
import { DrCheckpointStatus } from '../interfaces';

/**
 * ValidateBackupStepExecutor — a VALIDATE_BACKUP step checks backup
 * freshness (vs. the policy RPO), integrity and restore eligibility for
 * `config.targetType` before any restore is attempted, and records a
 * checkpoint either way. Fails the step (and, absent an `onFailure`
 * branch, the whole execution) when no eligible backup exists — restore
 * eligibility is never bypassed.
 */
@Injectable()
export class ValidateBackupStepExecutor implements IWorkflowStepExecutor {
  readonly stepType = 'VALIDATE_BACKUP';

  constructor(
    private readonly validator: DisasterRecoveryValidator,
    private readonly repository: DisasterRecoveryRepository,
  ) {}

  async execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult> {
    const targetType = ctx.step.config.targetType as string;
    const workspaceId = (ctx.execution.variables.targetWorkspaceIds as string[] | undefined)?.[0] ?? null;

    const result = await this.validator.checkEligibility(workspaceId, targetType);
    const drExecution = await this.repository.findExecutionByWorkflowExecutionId(ctx.execution.id);

    if (drExecution) {
      const nextSequence = drExecution.currentCheckpointSequence + 1;
      await this.repository.createCheckpoint({
        executionId: drExecution.id,
        workspaceId: drExecution.workspaceId,
        sequence: nextSequence,
        targetType,
        status: result.eligible ? DrCheckpointStatus.VALIDATED : DrCheckpointStatus.FAILED,
        backupRecordId: result.backupRecordId ?? null,
        freshnessCheckedAt: new Date(),
        integrityCheckedAt: new Date(),
        notes: result.reason ?? null,
      });
      await this.repository.updateExecution(drExecution.id, { currentCheckpointSequence: nextSequence });
    }

    if (!result.eligible) {
      return {
        status: WorkflowStepStatus.FAILED,
        errorCode: 'BACKUP_NOT_ELIGIBLE',
        errorMessage: result.reason ?? `No eligible backup for target type '${targetType}'`,
        output: result as unknown as Record<string, unknown>,
      };
    }

    return { status: WorkflowStepStatus.COMPLETED, output: result as unknown as Record<string, unknown> };
  }
}
