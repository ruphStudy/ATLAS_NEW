import { Injectable } from '@nestjs/common';
import { PermissionResolverService } from '@modules/roles-permissions/permission-resolver.service';
import { PermissionAction } from '@modules/roles-permissions/interfaces';
import { TenantIsolationService } from '@modules/tenant-isolation/tenant-isolation.service';
import { ENTERPRISE_AUDIT_MODULE } from './constants';
import {
  EnterpriseAuditAccessDeniedException,
  EnterpriseAuditOrganizationBoundaryViolationException,
} from './exceptions/enterprise-audit.exceptions';

/**
 * EnterpriseAuditValidator
 *
 * Permission enforcement via the existing `PermissionResolverService` and
 * organization-boundary enforcement via the existing
 * `TenantIsolationService` — no permission model or tenant-boundary logic
 * is re-implemented here. Deliberately NOT `PlatformAdminGuard` (SaaS
 * Audit's platform-staff gate): Enterprise Audit is a tenant-side
 * enterprise-admin surface, so every call must resolve to a caller whose
 * own workspace genuinely belongs to the organization being viewed.
 */
@Injectable()
export class EnterpriseAuditValidator {
  constructor(
    private readonly permissionResolver: PermissionResolverService,
    private readonly tenantIsolationService: TenantIsolationService,
  ) {}

  async assertPermission(userId: string, workspaceId: string, legacyRole: string, resource: string, action: PermissionAction): Promise<void> {
    const allowed = await this.permissionResolver.hasPermission({
      userId,
      workspaceId,
      legacyRole,
      module: ENTERPRISE_AUDIT_MODULE,
      resource,
      action,
    });
    if (!allowed) {
      throw new EnterpriseAuditAccessDeniedException(`${action} ${resource}`);
    }
  }

  /** The caller's own workspace must actually belong to the organization they're asking to view — the explicit cross-tenant/business authorization boundary this module's scope requires. */
  async assertOrganizationBoundary(callerWorkspaceId: string, organizationId: string): Promise<void> {
    const workspace = await this.tenantIsolationService.getWorkspaceOrThrow(callerWorkspaceId);
    if (workspace.organizationId !== organizationId) {
      throw new EnterpriseAuditOrganizationBoundaryViolationException(organizationId);
    }
  }
}
