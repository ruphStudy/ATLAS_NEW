import { Injectable } from '@nestjs/common';
import { ApprovalWorkflowService } from '@modules/approval-workflow/approval-workflow.service';
import { StartApprovalRequestDto } from '@modules/approval-workflow/dto';
import { IRuleActionHandler, IRuleActionHandlerContext, RuleActionType } from '../interfaces';
import { SYSTEM_ACTOR_ID } from '../constants';

@Injectable()
export class RequireApprovalActionHandler implements IRuleActionHandler {
  readonly actionType = RuleActionType.REQUIRE_APPROVAL;

  constructor(private readonly approvalWorkflowService: ApprovalWorkflowService) {}

  async execute(context: IRuleActionHandlerContext): Promise<unknown> {
    const { rule, evaluation, action } = context;
    const config = action.config;

    const dto: StartApprovalRequestDto = {
      definitionKey: config.definitionKey as string,
      entityType: evaluation.entityType ?? rule.module,
      entityId: evaluation.entityId ?? rule.id,
      title: (config.title as string) ?? `${rule.name} requires approval`,
      amount: config.amount as number | undefined,
      riskLevel: config.riskLevel as string | undefined,
      metadata: { ruleId: rule.id, ruleKey: rule.key },
    };

    return this.approvalWorkflowService.startRequest(evaluation.workspaceId, evaluation.userId ?? SYSTEM_ACTOR_ID, dto);
  }
}
