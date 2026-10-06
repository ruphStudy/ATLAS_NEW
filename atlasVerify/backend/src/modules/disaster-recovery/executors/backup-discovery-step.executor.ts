import { Injectable } from '@nestjs/common';
import { IStepExecutionContext, IStepExecutionResult, IWorkflowStepExecutor, WorkflowStepStatus } from '@modules/enterprise-workflow-engine/interfaces';
import { DisasterRecoveryValidator } from '../validator/disaster-recovery.validator';
import { DisasterRecoveryRepository } from '../disaster-recovery.repository';

/**
 * BackupDiscoveryStepExecutor — a BACKUP_DISCOVERY step refreshes the
 * persisted backup catalog for `config.targetType` from every capable
 * registered `IBackupProviderAdapter`, then completes immediately.
 * Discovery never touches the backup payload itself, only metadata.
 */
@Injectable()
export class BackupDiscoveryStepExecutor implements IWorkflowStepExecutor {
  readonly stepType = 'BACKUP_DISCOVERY';

  constructor(
    private readonly validator: DisasterRecoveryValidator,
    private readonly repository: DisasterRecoveryRepository,
  ) {}

  async execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult> {
    const targetType = ctx.step.config.targetType as string;
    const workspaceId = (ctx.execution.variables.targetWorkspaceIds as string[] | undefined)?.[0] ?? null;

    let policy = null;
    const drExecution = await this.repository.findExecutionByWorkflowExecutionId(ctx.execution.id);
    if (drExecution?.policyId) {
      policy = await this.repository.findPolicyById(drExecution.policyId);
    }

    await this.validator.discoverAndCatalog(workspaceId, targetType, policy);

    return {
      status: WorkflowStepStatus.COMPLETED,
      output: { targetType, discoveredAt: new Date().toISOString() },
    };
  }
}
