import { Injectable } from '@nestjs/common';
import { IStepExecutionContext, IStepExecutionResult, IWorkflowStepExecutor, WorkflowStepStatus } from '@modules/enterprise-workflow-engine/interfaces';
import { BackupProviderRegistry } from '@modules/backup-provider/registry/backup-provider.registry';
import { BackupTargetType } from '@modules/backup-provider/interfaces';

/**
 * RegionalFailoverStepExecutor — a REGIONAL_FAILOVER step delegates to
 * `IBackupProviderAdapter.failoverToRegion()` for `config.targetType`,
 * skipped gracefully (not failed) when the registered provider doesn't
 * support regional failover — "where infrastructure supports it".
 */
@Injectable()
export class RegionalFailoverStepExecutor implements IWorkflowStepExecutor {
  readonly stepType = 'REGIONAL_FAILOVER';

  constructor(private readonly backupProviderRegistry: BackupProviderRegistry) {}

  async execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult> {
    const targetType = ctx.step.config.targetType as string;
    const region = ctx.step.config.region as string;
    const targetWorkspaceIds = (ctx.execution.variables.targetWorkspaceIds as string[] | undefined) ?? [];
    const isDryRun = Boolean(ctx.execution.variables.isDryRun);

    const providers = this.backupProviderRegistry.getCapable(targetType as BackupTargetType).filter((p) => p.metadata.supportsRegionalFailover && typeof p.failoverToRegion === 'function');

    if (providers.length === 0) {
      return {
        status: WorkflowStepStatus.COMPLETED,
        output: { skipped: true, reason: `No registered provider for '${targetType}' supports regional failover` },
      };
    }

    const results = await Promise.all(providers.map((p) => p.failoverToRegion!(region, { isDryRun, targetWorkspaceIds })));
    const failed = results.find((r) => !r.success);

    return {
      status: failed ? WorkflowStepStatus.FAILED : WorkflowStepStatus.COMPLETED,
      errorMessage: failed?.message,
      output: { region, results } as unknown as Record<string, unknown>,
    };
  }
}
