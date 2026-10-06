import { Injectable } from '@nestjs/common';
import { PermissionResolverService } from '@modules/roles-permissions/permission-resolver.service';
import { PermissionAction } from '@modules/roles-permissions/interfaces';
import { TenantIsolationService } from '@modules/tenant-isolation/tenant-isolation.service';
import { ENTERPRISE_HEALTH_MODULE } from './constants';
import {
  EnterpriseHealthAccessDeniedException,
  EnterpriseHealthOrganizationBoundaryViolationException,
} from './exceptions/enterprise-health.exceptions';

/**
 * EnterpriseHealthValidator
 *
 * Permission enforcement via the existing `PermissionResolverService` and
 * organization-boundary enforcement via the existing
 * `TenantIsolationService` — no permission model or tenant-boundary logic
 * is re-implemented here (same pattern as `EnterpriseAuditValidator`).
 */
@Injectable()
export class EnterpriseHealthValidator {
  constructor(
    private readonly permissionResolver: PermissionResolverService,
    private readonly tenantIsolationService: TenantIsolationService,
  ) {}

  async assertPermission(userId: string, workspaceId: string, legacyRole: string, resource: string, action: PermissionAction): Promise<void> {
    const allowed = await this.permissionResolver.hasPermission({
      userId,
      workspaceId,
      legacyRole,
      module: ENTERPRISE_HEALTH_MODULE,
      resource,
      action,
    });
    if (!allowed) {
      throw new EnterpriseHealthAccessDeniedException(`${action} ${resource}`);
    }
  }

  async assertOrganizationBoundary(callerWorkspaceId: string, organizationId: string): Promise<void> {
    const workspace = await this.tenantIsolationService.getWorkspaceOrThrow(callerWorkspaceId);
    if (workspace.organizationId !== organizationId) {
      throw new EnterpriseHealthOrganizationBoundaryViolationException(organizationId);
    }
  }
}
