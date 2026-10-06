import { Injectable } from '@nestjs/common';
import { BusinessRulesEngineEventQueue } from '../jobs';
import { IRuleActionHandler, IRuleActionHandlerContext, RuleActionType } from '../interfaces';

@Injectable()
export class EmitEventActionHandler implements IRuleActionHandler {
  readonly actionType = RuleActionType.EMIT_EVENT;

  constructor(private readonly eventQueue: BusinessRulesEngineEventQueue) {}

  async execute(context: IRuleActionHandlerContext): Promise<unknown> {
    const { rule, evaluation, action } = context;
    const eventName = action.config.eventName as string;

    const payload = {
      eventName,
      workspaceId: evaluation.workspaceId,
      module: rule.module,
      entityType: evaluation.entityType,
      entityId: evaluation.entityId,
      ruleId: rule.id,
      ruleKey: rule.key,
      data: action.config.payload ?? {},
    };

    await this.eventQueue.publishBusinessEvent(eventName, payload);
    return payload;
  }
}
