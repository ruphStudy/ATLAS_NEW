import { Injectable } from '@nestjs/common';
import {
  GuardrailCheckType,
  IAiGuardrailRule,
  IGuardrailCheck,
  IGuardrailCheckContext,
  IGuardrailCheckOutcome,
} from '../interfaces';

interface IRolePermissionConfig {
  allowedRoles?: string[];
  deniedRoles?: string[];
}

/**
 * Enforces per-role access to a capability/tool/action. Config-driven so the
 * same rule engine works regardless of how the caller's role model is named.
 */
@Injectable()
export class RolePermissionCheck implements IGuardrailCheck {
  readonly checkType = GuardrailCheckType.ROLE_PERMISSION;

  evaluate(
    rule: IAiGuardrailRule,
    context: IGuardrailCheckContext,
  ): IGuardrailCheckOutcome {
    const config = (rule.config ?? {}) as IRolePermissionConfig;
    const role = context.userRole;

    if (!role) {
      return { matched: false, reason: 'No user role present to evaluate' };
    }

    const deniedRoles = config.deniedRoles ?? [];
    if (deniedRoles.some((r) => r.toLowerCase() === role.toLowerCase())) {
      return { matched: true, reason: `Role '${role}' is explicitly denied` };
    }

    const allowedRoles = config.allowedRoles ?? [];
    if (
      allowedRoles.length > 0 &&
      !allowedRoles.some((r) => r.toLowerCase() === role.toLowerCase())
    ) {
      return {
        matched: true,
        reason: `Role '${role}' is not in the configured allowed roles`,
      };
    }

    return { matched: false, reason: 'Role permitted' };
  }
}
