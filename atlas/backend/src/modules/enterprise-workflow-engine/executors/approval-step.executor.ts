import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ApprovalWorkflowService } from '@modules/approval-workflow/approval-workflow.service';
import { StartApprovalRequestDto } from '@modules/approval-workflow/dto';
import { IStepExecutionContext, IStepExecutionResult, IWorkflowStepExecutor, WorkflowStepStatus, WorkflowStepType } from '../interfaces';
import { SYSTEM_ACTOR_ID } from '../constants';

/**
 * ApprovalStepExecutor — an APPROVAL step starts an approval request and
 * pauses the workflow (human-in-the-loop) until the request is decided,
 * resumed via `resumeStepExecution`.
 */
@Injectable()
export class ApprovalStepExecutor implements IWorkflowStepExecutor {
  readonly stepType = WorkflowStepType.APPROVAL;

  constructor(
    @Inject(forwardRef(() => ApprovalWorkflowService))
    private readonly approvalWorkflowService: ApprovalWorkflowService,
  ) {}

  async execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult> {
    const { step, execution, userId } = ctx;
    const config = step.config;

    const dto: StartApprovalRequestDto = {
      definitionKey: config.definitionKey as string,
      entityType: (config.entityType as string) ?? 'workflow_step',
      entityId: (config.entityId as string) ?? step.id,
      title: (config.title as string) ?? `${step.name} requires approval`,
      amount: config.amount as number | undefined,
      riskLevel: config.riskLevel as string | undefined,
      metadata: { workflowDefinitionId: execution.definitionId, workflowExecutionId: execution.id, stepId: step.id },
    };

    const request = await this.approvalWorkflowService.startRequest(execution.workspaceId, userId ?? SYSTEM_ACTOR_ID, dto);

    return {
      status: WorkflowStepStatus.WAITING,
      output: { approvalRequestId: (request as unknown as { id: string }).id },
      externalRef: (request as unknown as { id: string }).id,
    };
  }
}
