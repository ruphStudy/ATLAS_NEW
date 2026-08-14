import { Injectable } from '@nestjs/common';
import { PermissionResolverService } from '@modules/roles-permissions/permission-resolver.service';
import { PermissionAction } from '@modules/roles-permissions/interfaces';
import { TenantIsolationService } from '@modules/tenant-isolation/tenant-isolation.service';
import { BackupProviderRegistry } from '@modules/backup-provider/registry/backup-provider.registry';
import { BackupTargetType, IBackupDescriptor } from '@modules/backup-provider/interfaces';
import { IBackupValidationResult } from '../interfaces';
import { BACKUP_MANAGEMENT_MODULE } from '../constants';
import { BackupAccessDeniedException, BackupTenantIsolationViolationException } from '../exceptions/backup-management.exceptions';

/**
 * BackupManagementValidator
 *
 * Structural validation of backup policies, permission enforcement via
 * the existing `PermissionResolverService`, and tenant-isolation
 * boundary checks via the existing `TenantIsolationService` — no
 * permission model or tenant boundary is re-implemented here.
 */
@Injectable()
export class BackupManagementValidator {
  constructor(
    private readonly permissionResolver: PermissionResolverService,
    private readonly tenantIsolationService: TenantIsolationService,
    private readonly backupProviderRegistry: BackupProviderRegistry,
  ) {}

  validatePolicy(dataType: string, backupType: string): IBackupValidationResult {
    const issues: IBackupValidationResult['issues'] = [];
    const warnings: string[] = [];

    if (!Object.values(BackupTargetType).includes(dataType as BackupTargetType)) {
      issues.push({ field: 'dataType', message: `Unknown data type '${dataType}'` });
    } else if (this.backupProviderRegistry.getCapable(dataType as BackupTargetType).filter((a) => typeof a.createBackup === 'function').length === 0) {
      warnings.push(`No registered backup provider for data type '${dataType}' currently supports creating backups — this policy can stay DRAFT until one does`);
    }

    if (!['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'SNAPSHOT'].includes(backupType)) {
      issues.push({ field: 'backupType', message: `Unknown backup type '${backupType}'` });
    }

    return { valid: issues.length === 0, issues, warnings };
  }

  async assertPermission(userId: string, workspaceId: string, legacyRole: string, resource: string, action: PermissionAction): Promise<void> {
    const allowed = await this.permissionResolver.hasPermission({
      userId,
      workspaceId,
      legacyRole,
      module: BACKUP_MANAGEMENT_MODULE,
      resource,
      action,
    });
    if (!allowed) {
      throw new BackupAccessDeniedException(`${action} ${resource}`);
    }
  }

  async assertTenantBoundary(workspaceId: string | undefined): Promise<void> {
    if (!workspaceId) return;
    try {
      await this.tenantIsolationService.getWorkspaceOrThrow(workspaceId);
    } catch {
      throw new BackupTenantIsolationViolationException(workspaceId);
    }
  }

  resolveProvider(dataType: string, preferredProviderKey?: string | null) {
    if (preferredProviderKey && this.backupProviderRegistry.isRegistered(preferredProviderKey)) {
      const adapter = this.backupProviderRegistry.get(preferredProviderKey);
      if (adapter.supportsTargetType(dataType as BackupTargetType) && typeof adapter.createBackup === 'function') {
        return adapter;
      }
    }
    return this.backupProviderRegistry.getCapable(dataType as BackupTargetType).find((a) => typeof a.createBackup === 'function');
  }

  async validateIntegrity(descriptor: IBackupDescriptor): Promise<{ valid: boolean; message?: string }> {
    if (!this.backupProviderRegistry.isRegistered(descriptor.providerKey)) {
      return { valid: false, message: `Provider '${descriptor.providerKey}' is no longer registered` };
    }
    const provider = this.backupProviderRegistry.get(descriptor.providerKey);
    return provider.validateIntegrity(descriptor);
  }
}
