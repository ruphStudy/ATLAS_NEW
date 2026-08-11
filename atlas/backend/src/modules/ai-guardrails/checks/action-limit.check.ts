import { Injectable } from '@nestjs/common';
import {
  GuardrailCheckType,
  IAiGuardrailRule,
  IGuardrailCheck,
  IGuardrailCheckContext,
  IGuardrailCheckOutcome,
} from '../interfaces';

interface IActionLimitConfig {
  maxActionsPerExecution?: number;
}

/**
 * Caps how many automated actions/tool-calls a single execution may perform,
 * to bound risky automation (e.g. runaway agent loops).
 */
@Injectable()
export class ActionLimitCheck implements IGuardrailCheck {
  readonly checkType = GuardrailCheckType.ACTION_LIMIT;

  evaluate(
    rule: IAiGuardrailRule,
    context: IGuardrailCheckContext,
  ): IGuardrailCheckOutcome {
    const config = (rule.config ?? {}) as IActionLimitConfig;
    const limit = config.maxActionsPerExecution;

    if (limit === undefined || context.actionCount === undefined) {
      return { matched: false, reason: 'No action limit configured or no action count present' };
    }

    if (context.actionCount <= limit) {
      return { matched: false, reason: 'Action count within configured limit' };
    }

    return {
      matched: true,
      reason: `Action count ${context.actionCount} exceeds configured limit of ${limit}`,
    };
  }
}
