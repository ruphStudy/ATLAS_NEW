import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { BusinessRulesEngineService } from '@modules/business-rules-engine/business-rules-engine.service';
import { RuleTriggerType } from '@modules/business-rules-engine/interfaces';
import { IStepExecutionContext, IStepExecutionResult, IWorkflowStepExecutor, WorkflowStepStatus, WorkflowStepType } from '../interfaces';

/**
 * RuleEvaluationStepExecutor — a RULE_EVALUATION step delegates to
 * `BusinessRulesEngineService.evaluate()` with `RuleTriggerType.WORKFLOW`
 * (a trigger type the rules engine already declares specifically for
 * this integration) — condition/action logic is never re-implemented
 * here.
 */
@Injectable()
export class RuleEvaluationStepExecutor implements IWorkflowStepExecutor {
  readonly stepType = WorkflowStepType.RULE_EVALUATION;

  constructor(
    @Inject(forwardRef(() => BusinessRulesEngineService))
    private readonly businessRulesEngineService: BusinessRulesEngineService,
  ) {}

  async execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult> {
    const { step, execution, userId } = ctx;
    const config = step.config;

    const result = await this.businessRulesEngineService.evaluate({
      workspaceId: execution.workspaceId,
      module: (config.module as string) ?? 'enterprise-workflow-engine',
      triggerType: RuleTriggerType.WORKFLOW,
      triggerRef: execution.id,
      entityType: config.entityType as string | undefined,
      entityId: config.entityId as string | undefined,
      input: { ...execution.variables, ...(config.input as Record<string, unknown> | undefined) },
      userId: userId ?? undefined,
    });

    if (result.blocked) {
      return {
        status: WorkflowStepStatus.FAILED,
        output: result as unknown as Record<string, unknown>,
        errorCode: 'RULE_BLOCKED',
        errorMessage: result.blockReason ?? 'Blocked by business rule',
      };
    }

    return {
      status: WorkflowStepStatus.COMPLETED,
      output: result as unknown as Record<string, unknown>,
    };
  }
}
