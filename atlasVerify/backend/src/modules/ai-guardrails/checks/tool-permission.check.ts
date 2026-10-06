import { Injectable } from '@nestjs/common';
import {
  GuardrailCheckType,
  IAiGuardrailRule,
  IGuardrailCheck,
  IGuardrailCheckContext,
  IGuardrailCheckOutcome,
} from '../interfaces';

interface IToolPermissionConfig {
  allowedTools?: string[];
  deniedTools?: string[];
  allowedActions?: string[];
  deniedActions?: string[];
}

/**
 * Gates which tools/actions an execution may invoke, independent of the
 * ALLOWLIST/BLOCKLIST content checks (which operate on free-text content).
 */
@Injectable()
export class ToolPermissionCheck implements IGuardrailCheck {
  readonly checkType = GuardrailCheckType.TOOL_PERMISSION;

  evaluate(
    rule: IAiGuardrailRule,
    context: IGuardrailCheckContext,
  ): IGuardrailCheckOutcome {
    const config = (rule.config ?? {}) as IToolPermissionConfig;

    if (context.toolName) {
      const denied = config.deniedTools ?? [];
      if (denied.some((t) => t.toLowerCase() === context.toolName!.toLowerCase())) {
        return { matched: true, reason: `Tool '${context.toolName}' is explicitly denied` };
      }

      const allowed = config.allowedTools ?? [];
      if (
        allowed.length > 0 &&
        !allowed.some((t) => t.toLowerCase() === context.toolName!.toLowerCase())
      ) {
        return {
          matched: true,
          reason: `Tool '${context.toolName}' is not in the configured allowed tools`,
        };
      }
    }

    if (context.actionName) {
      const denied = config.deniedActions ?? [];
      if (denied.some((a) => a.toLowerCase() === context.actionName!.toLowerCase())) {
        return { matched: true, reason: `Action '${context.actionName}' is explicitly denied` };
      }

      const allowed = config.allowedActions ?? [];
      if (
        allowed.length > 0 &&
        !allowed.some((a) => a.toLowerCase() === context.actionName!.toLowerCase())
      ) {
        return {
          matched: true,
          reason: `Action '${context.actionName}' is not in the configured allowed actions`,
        };
      }
    }

    return { matched: false, reason: 'Tool/action permitted' };
  }
}
