import { Injectable } from '@nestjs/common';
import { IStepExecutionContext, IStepExecutionResult, IWorkflowStepExecutor, WorkflowStepStatus } from '@modules/enterprise-workflow-engine/interfaces';
import { SaasHealthService } from '@modules/saas-health/saas-health.service';
import { SaasHealthEvaluationTrigger, SaasHealthLevel } from '@modules/saas-health/interfaces';

/**
 * HealthCheckStepExecutor — a HEALTH_CHECK step confirms recovery
 * readiness (before restoring) or post-restore health (after) by
 * reading SaaS Monitoring's already-computed aggregate health via
 * `SaasHealthService` — never re-gathering the underlying signals
 * itself. Fails the step when the target is UNHEALTHY/OFFLINE.
 */
@Injectable()
export class HealthCheckStepExecutor implements IWorkflowStepExecutor {
  readonly stepType = 'HEALTH_CHECK';

  constructor(private readonly saasHealthService: SaasHealthService) {}

  async execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult> {
    const targetWorkspaceIds = (ctx.execution.variables.targetWorkspaceIds as string[] | undefined) ?? [];

    if (targetWorkspaceIds.length === 0) {
      const platform = await this.saasHealthService.getPlatformSummary();
      const failing = platform.level === SaasHealthLevel.UNHEALTHY || platform.level === SaasHealthLevel.OFFLINE;
      return {
        status: failing ? WorkflowStepStatus.FAILED : WorkflowStepStatus.COMPLETED,
        errorMessage: failing ? `Platform health is '${platform.level}'` : undefined,
        output: platform as unknown as Record<string, unknown>,
      };
    }

    const results = await Promise.all(
      targetWorkspaceIds.map((workspaceId) => this.saasHealthService.evaluateTenant(workspaceId, SaasHealthEvaluationTrigger.EVENT_DRIVEN)),
    );
    const failing = results.find((r) => r.level === SaasHealthLevel.UNHEALTHY || r.level === SaasHealthLevel.OFFLINE);

    return {
      status: failing ? WorkflowStepStatus.FAILED : WorkflowStepStatus.COMPLETED,
      errorMessage: failing ? `Workspace '${failing.workspaceId}' health is '${failing.level}'` : undefined,
      output: { results } as unknown as Record<string, unknown>,
    };
  }
}
