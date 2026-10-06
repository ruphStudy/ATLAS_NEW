import { SetMetadata } from '@nestjs/common';
import { PermissionAction, AssignmentScopeType } from '../interfaces';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

export interface IRequirePermissionMetadata {
  module: string;
  resource: string;
  action: PermissionAction;
  scopeType?: AssignmentScopeType;
  /** Route param name to read the scopeId from (e.g. 'warehouseId') — omit for workspace-wide checks. */
  scopeIdParam?: string;
}

/**
 * @RequirePermission(module, resource, action, options?)
 *
 * Opt-in, centralized granular permission check — apply alongside
 * `@UseGuards(PermissionsGuard)`. Does NOT replace the global `JwtAuthGuard`
 * or the legacy `@UserRole()` checks already used across the codebase;
 * existing routes that don't add this decorator keep behaving exactly as
 * before. Legacy OWNER/ADMIN always pass (preserves current access).
 *
 * Usage:
 *   @UseGuards(PermissionsGuard)
 *   @RequirePermission('inventory', 'item', PermissionAction.APPROVE)
 *   approve(...) {}
 */
export const RequirePermission = (
  module: string,
  resource: string,
  action: PermissionAction,
  options?: { scopeType?: AssignmentScopeType; scopeIdParam?: string },
) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, {
    module,
    resource,
    action,
    scopeType: options?.scopeType,
    scopeIdParam: options?.scopeIdParam,
  } as IRequirePermissionMetadata);
