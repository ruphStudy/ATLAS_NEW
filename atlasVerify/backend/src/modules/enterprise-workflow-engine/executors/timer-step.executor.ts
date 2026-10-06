import { Injectable } from '@nestjs/common';
import { IStepExecutionContext, IStepExecutionResult, IWorkflowStepExecutor, WorkflowStepStatus, WorkflowStepType } from '../interfaces';

/**
 * TimerStepExecutor — a TIMER step waits `config.delayMs` before
 * resuming. It does not block the event loop: it marks the step WAITING
 * with a `dueAt`, and `EnterpriseWorkflowEngineService.processDueTimers()`
 * (invoked periodically, same polling pattern as
 * `TaskManagementService.processRemindersAndEscalations()` /
 * `BusinessRulesEngineService.processDueScheduledRules()`) resumes it.
 */
@Injectable()
export class TimerStepExecutor implements IWorkflowStepExecutor {
  readonly stepType = WorkflowStepType.TIMER;

  async execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult> {
    const delayMs = Math.max(0, Number(ctx.step.config.delayMs ?? 0));
    return {
      status: WorkflowStepStatus.WAITING,
      output: { dueAt: new Date(Date.now() + delayMs).toISOString() },
    };
  }
}
