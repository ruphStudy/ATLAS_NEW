import { Injectable } from '@nestjs/common';
import { evaluateConditionGroup } from '@modules/business-rules-engine/condition-evaluator.util';
import { IRuleConditionGroup } from '@modules/business-rules-engine/interfaces';
import { IStepExecutionContext, IStepExecutionResult, IWorkflowStepExecutor, WorkflowStepStatus, WorkflowStepType } from '../interfaces';

/**
 * ConditionStepExecutor — evaluates a `config.condition` (the same
 * `IRuleConditionGroup` shape used for step-level branch conditions)
 * against the execution's variables using Business Rules Engine's
 * `evaluateConditionGroup` utility — the condition DSL is never
 * re-implemented here.
 */
@Injectable()
export class ConditionStepExecutor implements IWorkflowStepExecutor {
  readonly stepType = WorkflowStepType.CONDITION;

  async execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult> {
    const { step, execution } = ctx;
    const group = step.config.condition as IRuleConditionGroup | undefined;

    const matched = group ? evaluateConditionGroup(group, execution.variables) : true;

    return {
      status: WorkflowStepStatus.COMPLETED,
      output: { matched },
    };
  }
}
