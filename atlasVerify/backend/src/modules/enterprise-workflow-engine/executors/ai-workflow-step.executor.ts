import { Injectable } from '@nestjs/common';
import { AiWorkflowService } from '@modules/ai-workflow/ai-workflow.service';
import { ExecuteWorkflowDto as ExecuteAiWorkflowDto } from '@modules/ai-workflow/dto';
import { AiWorkflowTriggerType } from '@modules/ai-workflow/interfaces';
import { IStepExecutionContext, IStepExecutionResult, IWorkflowStepExecutor, WorkflowStepStatus, WorkflowStepType } from '../interfaces';

/**
 * AiWorkflowStepExecutor — an AI_WORKFLOW step delegates the entire step
 * to the existing AI Workflow Engine (`AiWorkflowService.executeWorkflow`).
 * This engine never re-implements agent/orchestrator execution, cost or
 * token tracking — all of that stays owned by the AI Workflow Engine.
 */
@Injectable()
export class AiWorkflowStepExecutor implements IWorkflowStepExecutor {
  readonly stepType = WorkflowStepType.AI_WORKFLOW;

  constructor(private readonly aiWorkflowService: AiWorkflowService) {}

  async execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult> {
    const { step, execution, userId } = ctx;
    const config = step.config;

    const dto: ExecuteAiWorkflowDto = {
      workspaceId: execution.workspaceId,
      workflowId: config.aiWorkflowId as string,
      input: { ...execution.variables, ...(config.input as Record<string, unknown> | undefined) },
      triggerType: AiWorkflowTriggerType.API,
      triggeredBy: userId ?? undefined,
      metadata: { workflowDefinitionId: execution.definitionId, workflowExecutionId: execution.id, stepId: step.id },
    };

    const result = await this.aiWorkflowService.executeWorkflow(dto);

    return {
      status: WorkflowStepStatus.COMPLETED,
      output: result as unknown as Record<string, unknown>,
    };
  }
}
