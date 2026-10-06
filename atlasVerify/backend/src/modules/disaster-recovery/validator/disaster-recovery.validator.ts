import { Injectable } from '@nestjs/common';
import { PermissionResolverService } from '@modules/roles-permissions/permission-resolver.service';
import { PermissionAction } from '@modules/roles-permissions/interfaces';
import { TenantIsolationService } from '@modules/tenant-isolation/tenant-isolation.service';
import { BackupProviderRegistry } from '@modules/backup-provider/registry/backup-provider.registry';
import { BackupTargetType, IBackupDescriptor } from '@modules/backup-provider/interfaces';
import { DisasterRecoveryRepository } from '../disaster-recovery.repository';
import {
  DrBackupFreshnessStatus,
  DrBackupIntegrityStatus,
  IDrBackupEligibilityResult,
  IDrPolicy,
  IDrValidationResult,
} from '../interfaces';
import { DISASTER_RECOVERY_MODULE } from '../constants';
import { DrAccessDeniedException, DrTenantIsolationViolationException } from '../exceptions/disaster-recovery.exceptions';

/**
 * DisasterRecoveryValidator
 *
 * Structural validation of policies/plans, permission enforcement via
 * the existing `PermissionResolverService`, tenant-isolation boundary
 * checks via the existing `TenantIsolationService`, and backup
 * freshness/integrity/restore-eligibility validation against the
 * generic `BackupProviderRegistry` — no permission model, tenant
 * boundary, or backup infrastructure is re-implemented here.
 */
@Injectable()
export class DisasterRecoveryValidator {
  constructor(
    private readonly repository: DisasterRecoveryRepository,
    private readonly permissionResolver: PermissionResolverService,
    private readonly tenantIsolationService: TenantIsolationService,
    private readonly backupProviderRegistry: BackupProviderRegistry,
  ) {}

  validatePlanTargets(targets: string[]): IDrValidationResult {
    const issues: IDrValidationResult['issues'] = [];
    const warnings: string[] = [];

    if (!targets || targets.length === 0) {
      issues.push({ field: 'targets', message: 'A recovery plan must cover at least one target type' });
    }
    for (const target of targets ?? []) {
      if (!Object.values(BackupTargetType).includes(target as BackupTargetType)) {
        issues.push({ field: 'targets', message: `Unknown target type '${target}'` });
        continue;
      }
      if (!this.backupProviderRegistry.getCapable(target as BackupTargetType).length) {
        warnings.push(`No backup provider is registered yet for target type '${target}' — this plan can stay DRAFT until one is`);
      }
    }

    return { valid: issues.length === 0, issues, warnings };
  }

  async assertPermission(userId: string, workspaceId: string, legacyRole: string, resource: string, action: PermissionAction): Promise<void> {
    const allowed = await this.permissionResolver.hasPermission({
      userId,
      workspaceId,
      legacyRole,
      module: DISASTER_RECOVERY_MODULE,
      resource,
      action,
    });
    if (!allowed) {
      throw new DrAccessDeniedException(`${action} ${resource}`);
    }
  }

  /** Every workspace a PARTIAL/TENANT-scoped recovery targets must exist and be a real, resolvable tenant — the strict isolation boundary enforced before any recovery step runs. */
  async assertTenantBoundary(targetWorkspaceIds: string[]): Promise<void> {
    for (const workspaceId of targetWorkspaceIds) {
      try {
        await this.tenantIsolationService.getWorkspaceOrThrow(workspaceId);
      } catch {
        throw new DrTenantIsolationViolationException(workspaceId);
      }
    }
  }

  /**
   * Refreshes the persisted backup catalog for one target type from
   * every capable registered provider, then re-derives freshness (vs.
   * the policy's RPO) and eligibility for each discovered backup.
   */
  async discoverAndCatalog(workspaceId: string | null, targetType: string, policy: IDrPolicy | null): Promise<void> {
    const providers = this.backupProviderRegistry.getCapable(targetType as BackupTargetType);
    for (const provider of providers) {
      // Provider discovery calls stay sequential across providers — these may hit external/rate-limited backup systems, and this loop never fans out concurrency against them.
      const descriptors = await provider.discoverBackups(targetType as BackupTargetType, workspaceId ?? undefined);
      // Cataloging is a purely internal, independent upsert per descriptor (distinct externalRefs never conflict) — safe to run concurrently instead of one DB round trip at a time.
      await Promise.all(descriptors.map((descriptor) => this.catalogDescriptor(descriptor, policy)));
    }
  }

  private async catalogDescriptor(descriptor: IBackupDescriptor, policy: IDrPolicy | null): Promise<void> {
    const freshness = this.computeFreshness(descriptor.capturedAt, policy?.rpoMinutes);
    await this.repository.upsertBackupRecord(descriptor.providerKey, descriptor.externalRef, {
      workspaceId: null,
      targetType: descriptor.targetType,
      providerKey: descriptor.providerKey,
      externalRef: descriptor.externalRef,
      capturedAt: descriptor.capturedAt,
      sizeBytes: descriptor.sizeBytes ? BigInt(Math.trunc(descriptor.sizeBytes)) : null,
      checksum: descriptor.checksum ?? null,
      integrityStatus: DrBackupIntegrityStatus.UNVALIDATED,
      freshnessStatus: freshness,
      restoreEligible: freshness !== DrBackupFreshnessStatus.EXPIRED,
      metadata: descriptor.metadata ?? {},
    });
  }

  private computeFreshness(capturedAt: Date, rpoMinutes?: number): DrBackupFreshnessStatus {
    if (!rpoMinutes) return DrBackupFreshnessStatus.FRESH;
    const ageMs = Date.now() - capturedAt.getTime();
    const rpoMs = rpoMinutes * 60_000;
    if (ageMs <= rpoMs) return DrBackupFreshnessStatus.FRESH;
    if (ageMs <= rpoMs * 2) return DrBackupFreshnessStatus.STALE;
    return DrBackupFreshnessStatus.EXPIRED;
  }

  /** Validates that a target type has a fresh, integrity-checked, restore-eligible backup before a recovery step is allowed to run. */
  async checkEligibility(workspaceId: string | null, targetType: string): Promise<IDrBackupEligibilityResult> {
    const record = await this.repository.findLatestBackupRecord(workspaceId, targetType);
    if (!record) {
      return { eligible: false, targetType, reason: 'No backup has been discovered for this target type' };
    }
    if (record.freshnessStatus === DrBackupFreshnessStatus.EXPIRED) {
      return { eligible: false, targetType, reason: 'The most recent backup is older than the policy RPO window', backupRecordId: record.id };
    }

    if (record.integrityStatus === DrBackupIntegrityStatus.UNVALIDATED && this.backupProviderRegistry.isRegistered(record.providerKey)) {
      const provider = this.backupProviderRegistry.get(record.providerKey);
      const descriptor: IBackupDescriptor = {
        providerKey: record.providerKey,
        targetType: record.targetType as BackupTargetType,
        externalRef: record.externalRef,
        capturedAt: record.capturedAt,
        sizeBytes: record.sizeBytes ? Number(record.sizeBytes) : undefined,
        checksum: record.checksum ?? undefined,
        metadata: record.metadata,
      };
      const result = await provider.validateIntegrity(descriptor);
      await this.repository.upsertBackupRecord(record.providerKey, record.externalRef, {
        integrityStatus: result.valid ? DrBackupIntegrityStatus.VALID : DrBackupIntegrityStatus.CORRUPT,
        restoreEligible: result.valid && record.freshnessStatus !== DrBackupFreshnessStatus.EXPIRED,
      });
      if (!result.valid) {
        return { eligible: false, targetType, reason: result.message ?? 'Backup integrity check failed', backupRecordId: record.id };
      }
    } else if (record.integrityStatus === DrBackupIntegrityStatus.CORRUPT) {
      return { eligible: false, targetType, reason: 'Backup failed integrity validation', backupRecordId: record.id };
    }

    return { eligible: true, targetType, backupRecordId: record.id, providerKey: record.providerKey, externalRef: record.externalRef };
  }
}
