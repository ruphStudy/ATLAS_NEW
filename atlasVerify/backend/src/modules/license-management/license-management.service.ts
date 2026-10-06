import { Injectable, Logger } from '@nestjs/common';
import { PlanManagementService } from '@modules/plan-management/plan-management.service';
import { UsageTrackingService } from '@modules/usage-tracking/usage-tracking.service';
import { UsageRecordSource } from '@modules/usage-tracking/interfaces';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { LicenseManagementRepository } from './license-management.repository';
import { LicenseCredentialEncryptor } from './license-credential.encryptor';
import { LicenseCredentialDecryptor } from './license-credential.decryptor';
import { LicenseManagementEventQueue } from './jobs';
import { generateLicenseKeyId, generateLicenseKeyPair, signLicenseToken, verifyLicenseTokenOffline } from './license-token.util';
import { buildLicenseScopeKey } from './scope-key.util';
import {
  CreateLicenseDto,
  UpdateLicenseDto,
  LicenseFilterDto,
  ActivateLicenseDto,
  RenewLicenseDto,
  TransferLicenseDto,
  ValidateLicenseDto,
  VerifyLicenseTokenOfflineDto,
  LicenseReasonDto,
  PaginatedLicenseResponseDto,
} from './dto';
import {
  LicenseChangeType,
  LicenseManagementEvent,
  LicenseScopeType,
  LicenseStatus,
  ILicense,
  ILicenseHistory,
  ILicenseIssuedToken,
  ILicenseOfflineVerificationResult,
  ILicenseTokenPayload,
  ILicenseValidationResult,
} from './interfaces';
import { LICENSE_ACTIVATION_RESOURCE_KEY, LICENSE_MANAGE_ROLES, LICENSE_MANAGEMENT_MODULE } from './constants';
import {
  LicenseAccessDeniedException,
  LicenseActivationLimitReachedException,
  LicenseAlreadyExistsException,
  LicenseInvalidDefinitionException,
  LicenseInvalidStateTransitionException,
  LicenseNotFoundException,
} from './exceptions/license-management.exceptions';

const TRANSITIONS: Record<LicenseStatus, LicenseStatus[]> = {
  [LicenseStatus.DRAFT]: [LicenseStatus.ISSUED],
  [LicenseStatus.ISSUED]: [LicenseStatus.ACTIVE, LicenseStatus.REVOKED],
  [LicenseStatus.ACTIVE]: [LicenseStatus.SUSPENDED, LicenseStatus.EXPIRED, LicenseStatus.REVOKED],
  [LicenseStatus.SUSPENDED]: [LicenseStatus.ACTIVE, LicenseStatus.REVOKED],
  [LicenseStatus.EXPIRED]: [LicenseStatus.ACTIVE, LicenseStatus.REVOKED],
  [LicenseStatus.REVOKED]: [],
};

@Injectable()
export class LicenseManagementService {
  private readonly logger = new Logger(LicenseManagementService.name);

  constructor(
    private readonly repository: LicenseManagementRepository,
    private readonly encryptor: LicenseCredentialEncryptor,
    private readonly decryptor: LicenseCredentialDecryptor,
    private readonly planManagementService: PlanManagementService,
    private readonly usageTrackingService: UsageTrackingService,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: LicenseManagementEventQueue,
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // Create / Update
  // ══════════════════════════════════════════════════════════════════

  async createLicense(workspaceId: string, userId: string, userRole: string, dto: CreateLicenseDto): Promise<ILicense> {
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertValidScopeDefinition(dto);

    const scopeKey = buildLicenseScopeKey({
      scopeType: dto.scopeType,
      workspaceId,
      organizationId: dto.organizationId,
      ownerUserId: dto.ownerUserId,
      environment: dto.environment,
      deploymentId: dto.deploymentId,
    });

    const existing = await this.repository.findActiveByScopeKeyAndPlan(scopeKey, dto.planKey);
    if (existing) {
      throw new LicenseAlreadyExistsException();
    }

    const entitlementsSnapshot = await this.fetchEntitlementsSnapshot(dto.planKey);

    const license = await this.repository.create({
      workspaceId: dto.scopeType === LicenseScopeType.ORGANIZATION ? null : workspaceId,
      organizationId: dto.organizationId ?? null,
      scopeType: dto.scopeType,
      scopeKey,
      ownerUserId: dto.ownerUserId ?? null,
      environment: dto.environment ?? null,
      deploymentId: dto.deploymentId ?? null,
      type: dto.type,
      status: LicenseStatus.DRAFT,
      planKey: dto.planKey,
      subscriptionId: dto.subscriptionId ?? null,
      entitlementsSnapshot: entitlementsSnapshot as any,
      entitlementsSnapshotAt: entitlementsSnapshot ? new Date() : null,
      featureFlagKeys: dto.featureFlagKeys ?? [],
      licenseKeyId: generateLicenseKeyId(),
      encryptedPrivateKey: '',
      publicKey: '',
      maxActivations: dto.maxActivations ?? null,
      activationCount: 0,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      gracePeriodDays: dto.gracePeriodDays ?? 0,
      externalReference: dto.externalReference ?? null,
      version: 1,
      createdBy: userId,
    });

    await this.recordHistory(license.id, license.workspaceId, LicenseChangeType.CREATED, null, LicenseStatus.DRAFT, userId, this.sanitize(license));
    await this.recordAudit(workspaceId, userId, 'license-management.license.created', AuditActionCategory.CREATE, license.id);
    await this.publishEvent(LicenseManagementEvent.LICENSE_CREATED, license, userId);

    return license;
  }

  async updateLicense(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateLicenseDto): Promise<ILicense> {
    const license = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const updated = await this.repository.update(id, {
      featureFlagKeys: dto.featureFlagKeys ?? license.featureFlagKeys,
      maxActivations: dto.maxActivations ?? license.maxActivations,
      gracePeriodDays: dto.gracePeriodDays ?? license.gracePeriodDays,
      externalReference: dto.externalReference ?? license.externalReference,
      version: license.version + 1,
    });

    await this.recordAudit(workspaceId, userId, 'license-management.license.updated', AuditActionCategory.UPDATE, id);
    return updated;
  }

  // ══════════════════════════════════════════════════════════════════
  // Lifecycle
  // ══════════════════════════════════════════════════════════════════

  async issueLicense(id: string, workspaceId: string, userId: string, userRole: string): Promise<ILicenseIssuedToken> {
    const license = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertTransition(license.status, LicenseStatus.ISSUED);

    const { token, publicKey, updated } = await this.signNewToken(license);
    const issued = await this.repository.update(id, { status: LicenseStatus.ISSUED, issuedAt: new Date(), encryptedPrivateKey: updated.encryptedPrivateKey, publicKey: updated.publicKey });

    await this.recordHistory(id, license.workspaceId, LicenseChangeType.ISSUED, license.status, LicenseStatus.ISSUED, userId, this.sanitize(issued));
    await this.recordAudit(workspaceId, userId, 'license-management.license.issued', AuditActionCategory.UPDATE, id);
    await this.publishEvent(LicenseManagementEvent.LICENSE_ISSUED, issued, userId);

    return { license: issued, token, publicKey };
  }

  async activateLicense(id: string, workspaceId: string, userId: string, userRole: string, dto: ActivateLicenseDto): Promise<ILicense> {
    const license = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertTransition(license.status, LicenseStatus.ACTIVE);

    if (license.maxActivations !== null && license.activationCount >= license.maxActivations) {
      throw new LicenseActivationLimitReachedException();
    }

    const updated = await this.repository.update(id, {
      status: LicenseStatus.ACTIVE,
      activatedAt: license.activatedAt ?? new Date(),
      activationCount: license.activationCount + 1,
      environment: dto.environment ?? license.environment,
      deploymentId: dto.deploymentId ?? license.deploymentId,
    });

    await this.recordHistory(id, license.workspaceId, LicenseChangeType.ACTIVATED, license.status, LicenseStatus.ACTIVE, userId, this.sanitize(updated));
    await this.recordAudit(workspaceId, userId, 'license-management.license.activated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(LicenseManagementEvent.LICENSE_ACTIVATED, updated, userId);

    this.recordActivationUsage(updated, userId).catch((error) => this.logger.warn(`Usage Tracking recordUsage failed for license '${id}': ${(error as Error).message}`));

    return updated;
  }

  async suspendLicense(id: string, workspaceId: string, userId: string, userRole: string, dto: LicenseReasonDto): Promise<ILicense> {
    const license = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertTransition(license.status, LicenseStatus.SUSPENDED);

    const updated = await this.repository.update(id, { status: LicenseStatus.SUSPENDED, suspendedAt: new Date(), suspendedReason: dto.reason ?? null });

    await this.recordHistory(id, license.workspaceId, LicenseChangeType.SUSPENDED, license.status, LicenseStatus.SUSPENDED, userId, this.sanitize(updated), dto.reason);
    await this.recordAudit(workspaceId, userId, 'license-management.license.suspended', AuditActionCategory.UPDATE, id, AuditRiskLevel.SUSPICIOUS);
    await this.publishEvent(LicenseManagementEvent.LICENSE_SUSPENDED, updated, userId, dto.reason ? { reason: dto.reason } : undefined);
    return updated;
  }

  async reactivateLicense(id: string, workspaceId: string, userId: string, userRole: string): Promise<ILicense> {
    const license = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertTransition(license.status, LicenseStatus.ACTIVE);

    const updated = await this.repository.update(id, { status: LicenseStatus.ACTIVE, suspendedAt: null, suspendedReason: null });

    await this.recordHistory(id, license.workspaceId, LicenseChangeType.REACTIVATED, license.status, LicenseStatus.ACTIVE, userId, this.sanitize(updated));
    await this.recordAudit(workspaceId, userId, 'license-management.license.reactivated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(LicenseManagementEvent.LICENSE_REACTIVATED, updated, userId);
    return updated;
  }

  async revokeLicense(id: string, workspaceId: string, userId: string, userRole: string, dto: LicenseReasonDto): Promise<ILicense> {
    const license = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertTransition(license.status, LicenseStatus.REVOKED);

    const updated = await this.repository.update(id, { status: LicenseStatus.REVOKED, revokedAt: new Date(), revokedReason: dto.reason ?? null });

    await this.recordHistory(id, license.workspaceId, LicenseChangeType.REVOKED, license.status, LicenseStatus.REVOKED, userId, this.sanitize(updated), dto.reason);
    await this.recordAudit(workspaceId, userId, 'license-management.license.revoked', AuditActionCategory.UPDATE, id, AuditRiskLevel.HIGH_RISK);
    await this.publishEvent(LicenseManagementEvent.LICENSE_REVOKED, updated, userId, dto.reason ? { reason: dto.reason } : undefined);
    return updated;
  }

  async renewLicense(id: string, workspaceId: string, userId: string, userRole: string, dto: RenewLicenseDto): Promise<ILicense> {
    const license = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertTransition(license.status, LicenseStatus.ACTIVE);

    const updated = await this.repository.update(id, {
      status: LicenseStatus.ACTIVE,
      expiresAt: new Date(dto.expiresAt),
      gracePeriodDays: dto.gracePeriodDays ?? license.gracePeriodDays,
      gracePeriodEndsAt: null,
      version: license.version + 1,
    });

    await this.recordHistory(id, license.workspaceId, LicenseChangeType.RENEWED, license.status, LicenseStatus.ACTIVE, userId, this.sanitize(updated));
    await this.recordAudit(workspaceId, userId, 'license-management.license.renewed', AuditActionCategory.UPDATE, id);
    await this.publishEvent(LicenseManagementEvent.LICENSE_RENEWED, updated, userId);
    return updated;
  }

  /** Moves a license to a different scope/tenant — dedup-checked at the new scope, always audited at HIGH_RISK since ownership transfer is a security-significant action ("prevent... unauthorized tenant linking"-style concern). */
  async transferLicense(id: string, workspaceId: string, userId: string, userRole: string, dto: TransferLicenseDto): Promise<ILicense> {
    const license = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const targetWorkspaceId = dto.targetWorkspaceId ?? workspaceId;
    const newScopeKey = buildLicenseScopeKey({
      scopeType: dto.scopeType,
      workspaceId: targetWorkspaceId,
      organizationId: dto.organizationId,
      ownerUserId: dto.ownerUserId,
      environment: dto.environment,
      deploymentId: dto.deploymentId,
    });

    if (newScopeKey !== license.scopeKey) {
      const existing = await this.repository.findActiveByScopeKeyAndPlan(newScopeKey, license.planKey);
      if (existing) {
        throw new LicenseAlreadyExistsException();
      }
    }

    const updated = await this.repository.update(id, {
      scopeType: dto.scopeType,
      scopeKey: newScopeKey,
      workspaceId: dto.scopeType === LicenseScopeType.ORGANIZATION ? null : targetWorkspaceId,
      organizationId: dto.organizationId ?? null,
      ownerUserId: dto.ownerUserId ?? null,
      environment: dto.environment ?? null,
      deploymentId: dto.deploymentId ?? null,
      version: license.version + 1,
    });

    await this.recordHistory(id, updated.workspaceId, LicenseChangeType.TRANSFERRED, null, null, userId, this.sanitize(updated), dto.reason);
    await this.recordAudit(workspaceId, userId, 'license-management.license.transferred', AuditActionCategory.UPDATE, id, AuditRiskLevel.HIGH_RISK);
    await this.publishEvent(LicenseManagementEvent.LICENSE_TRANSFERRED, updated, userId, { reason: dto.reason, fromScopeKey: license.scopeKey, toScopeKey: newScopeKey });
    return updated;
  }

  /** Generates a fresh RSA keypair and re-signs the token in place (same `licenseKeyId`) — tokens signed under the old keypair silently fail offline verification against the new public key, which is the intended revoke-by-rotation effect. */
  async rotateKey(id: string, workspaceId: string, userId: string, userRole: string): Promise<ILicenseIssuedToken> {
    const license = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const { token, publicKey, updated } = await this.signNewToken(license);
    const rotated = await this.repository.update(id, { encryptedPrivateKey: updated.encryptedPrivateKey, publicKey: updated.publicKey });

    await this.recordHistory(id, license.workspaceId, LicenseChangeType.KEY_ROTATED, null, null, userId, this.sanitize(rotated));
    await this.recordAudit(workspaceId, userId, 'license-management.license.key_rotated', AuditActionCategory.UPDATE, id, AuditRiskLevel.SUSPICIOUS);
    await this.publishEvent(LicenseManagementEvent.LICENSE_KEY_ROTATED, rotated, userId);

    return { license: rotated, token, publicKey };
  }

  /** Best-effort re-sync of the cached entitlement snapshot from Plan Management — never re-derives entitlement rules itself. */
  async refreshEntitlements(id: string, workspaceId: string, userId: string, userRole: string): Promise<ILicense> {
    const license = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const snapshot = await this.fetchEntitlementsSnapshot(license.planKey);
    const updated = await this.repository.update(id, { entitlementsSnapshot: snapshot as any, entitlementsSnapshotAt: new Date() });

    await this.recordHistory(id, license.workspaceId, LicenseChangeType.ENTITLEMENTS_REFRESHED, null, null, userId, this.sanitize(updated));
    await this.publishEvent(LicenseManagementEvent.LICENSE_ENTITLEMENTS_REFRESHED, updated, userId);
    return updated;
  }

  async getLicense(id: string, workspaceId: string): Promise<ILicense> {
    return this.getVisibleOrThrow(id, workspaceId);
  }

  async getHistory(id: string, workspaceId: string): Promise<ILicenseHistory[]> {
    await this.getVisibleOrThrow(id, workspaceId);
    return this.repository.findHistory(id);
  }

  async findAllLicenses(workspaceId: string, filter: LicenseFilterDto): Promise<PaginatedLicenseResponseDto> {
    const [data, total] = await this.repository.findAll(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════
  // Validation
  // ══════════════════════════════════════════════════════════════════

  /** Online path — DB-backed, real-time-accurate (knows about revocation/suspension immediately, unlike offline verification). Never throws; failures are reported in the result. */
  async validateLicense(dto: ValidateLicenseDto): Promise<ILicenseValidationResult> {
    const license = await this.repository.findByLicenseKeyId(dto.licenseKeyId);
    if (!license) {
      return { valid: false, reason: 'License not found' };
    }

    const result = this.checkLicenseUsable(license, dto);
    await this.repository.update(license.id, { lastValidatedAt: new Date(), lastValidationResult: result.valid ? 'VALID' : (result.reason ?? 'INVALID') });

    if (result.valid) {
      await this.publishEvent(LicenseManagementEvent.LICENSE_VALIDATED, license);
    } else {
      await this.recordAudit(license.workspaceId ?? license.organizationId ?? 'unknown', 'system', 'license-management.license.validation_failed', AuditActionCategory.OTHER, license.id, AuditRiskLevel.SUSPICIOUS);
      await this.publishEvent(LicenseManagementEvent.LICENSE_VALIDATION_FAILED, license, undefined, { reason: result.reason });
    }

    return { ...result, license };
  }

  /** Offline path — pure signature/expiry check against the license's public key, no database access at all. */
  verifyTokenOffline(dto: VerifyLicenseTokenOfflineDto): ILicenseOfflineVerificationResult {
    return verifyLicenseTokenOffline(dto.token, dto.publicKey);
  }

  // ══════════════════════════════════════════════════════════════════
  // Entitlement / limit checks — thin consumers of the cached snapshot, never a re-implementation
  // ══════════════════════════════════════════════════════════════════

  async hasFeature(licenseId: string, workspaceId: string, featureKey: string): Promise<boolean> {
    const license = await this.getVisibleOrThrow(licenseId, workspaceId);
    if (license.featureFlagKeys.includes(featureKey)) {
      return true;
    }
    const snapshot = license.entitlementsSnapshot as { entitlementsByKey?: Record<string, { included?: boolean }> } | null;
    return !!snapshot?.entitlementsByKey?.[featureKey]?.included;
  }

  async getLimit(licenseId: string, workspaceId: string, resourceKey: string): Promise<unknown> {
    const license = await this.getVisibleOrThrow(licenseId, workspaceId);
    const snapshot = license.entitlementsSnapshot as { limitsByKey?: Record<string, { value?: unknown }> } | null;
    return snapshot?.limitsByKey?.[resourceKey]?.value ?? null;
  }

  // ══════════════════════════════════════════════════════════════════
  // Scheduler-callable sweep (no active scheduler wired — mirrors every other module this session)
  // ══════════════════════════════════════════════════════════════════

  async processExpirySweep(): Promise<{ expired: number }> {
    const now = new Date();
    const due = await this.repository.findActiveDueForExpiry(now);

    for (const license of due) {
      const gracePeriodEndsAt = license.gracePeriodDays > 0 ? new Date(now.getTime() + license.gracePeriodDays * 24 * 60 * 60 * 1000) : null;
      const updated = await this.repository.update(license.id, { status: LicenseStatus.EXPIRED, gracePeriodEndsAt });
      await this.recordHistory(license.id, license.workspaceId, LicenseChangeType.EXPIRED, license.status, LicenseStatus.EXPIRED, 'system', this.sanitize(updated), 'Expiry date reached');
      await this.recordAudit(license.workspaceId ?? license.organizationId ?? 'unknown', 'system', 'license-management.license.expired', AuditActionCategory.UPDATE, license.id);
      await this.publishEvent(LicenseManagementEvent.LICENSE_EXPIRED, updated);
    }

    this.logger.log(`License expiry sweep: ${due.length} licenses expired`);
    return { expired: due.length };
  }

  // ══════════════════════════════════════════════════════════════════
  // Private helpers
  // ══════════════════════════════════════════════════════════════════

  private checkLicenseUsable(license: ILicense, context: ValidateLicenseDto): { valid: boolean; reason?: string } {
    if (license.status === LicenseStatus.REVOKED) {
      return { valid: false, reason: 'License has been revoked' };
    }
    if (license.status === LicenseStatus.SUSPENDED) {
      return { valid: false, reason: 'License is suspended' };
    }
    if (license.status === LicenseStatus.DRAFT) {
      return { valid: false, reason: 'License has not been issued' };
    }
    if (license.status === LicenseStatus.EXPIRED) {
      const withinGrace = license.gracePeriodEndsAt ? license.gracePeriodEndsAt.getTime() > Date.now() : false;
      if (!withinGrace) {
        return { valid: false, reason: 'License has expired' };
      }
    }
    if (license.status === LicenseStatus.ACTIVE && license.expiresAt && license.expiresAt.getTime() <= Date.now()) {
      return { valid: false, reason: 'License has expired' };
    }
    if (context.environment && license.environment && context.environment !== license.environment) {
      return { valid: false, reason: 'License is not valid for this environment' };
    }
    if (context.deploymentId && license.deploymentId && context.deploymentId !== license.deploymentId) {
      return { valid: false, reason: 'License is not valid for this deployment' };
    }
    return { valid: true };
  }

  private async signNewToken(license: ILicense): Promise<{ token: string; publicKey: string; updated: { encryptedPrivateKey: string; publicKey: string } }> {
    const { privateKey, publicKey } = generateLicenseKeyPair();
    const encryptedPrivateKey = this.encryptor.encryptValue(privateKey, license.scopeKey);

    const payload: ILicenseTokenPayload = {
      licenseKeyId: license.licenseKeyId,
      scopeKey: license.scopeKey,
      planKey: license.planKey,
      type: license.type,
      entitlementKeys: this.extractEntitlementKeys(license),
      featureFlagKeys: license.featureFlagKeys,
      issuedAt: Date.now(),
      expiresAt: license.expiresAt ? license.expiresAt.getTime() : null,
    };
    const token = signLicenseToken(payload, privateKey);

    return { token, publicKey, updated: { encryptedPrivateKey, publicKey } };
  }

  private extractEntitlementKeys(license: ILicense): string[] {
    const snapshot = license.entitlementsSnapshot as { entitlementsByKey?: Record<string, { included?: boolean }> } | null;
    if (!snapshot?.entitlementsByKey) return [];
    return Object.entries(snapshot.entitlementsByKey)
      .filter(([, entitlement]) => entitlement.included)
      .map(([key]) => key);
  }

  private async fetchEntitlementsSnapshot(planKey: string): Promise<unknown | null> {
    try {
      return await this.planManagementService.getEntitlementSnapshot(planKey);
    } catch (error) {
      this.logger.warn(`Failed to fetch entitlement snapshot for plan '${planKey}': ${(error as Error).message}`);
      return null;
    }
  }

  private async recordActivationUsage(license: ILicense, userId: string): Promise<void> {
    if (!license.workspaceId) return;
    await this.usageTrackingService.recordUsage(license.workspaceId, userId, {
      module: LICENSE_MANAGEMENT_MODULE,
      resourceKey: LICENSE_ACTIVATION_RESOURCE_KEY,
      quantity: 1,
      unit: 'COUNT',
      source: UsageRecordSource.EVENT_DRIVEN,
      correlationId: license.id,
      metadata: { licenseId: license.id, licenseKeyId: license.licenseKeyId },
    });
  }

  private assertTransition(from: LicenseStatus, to: LicenseStatus): void {
    if (!TRANSITIONS[from]?.includes(to)) {
      throw new LicenseInvalidStateTransitionException(from, to);
    }
  }

  private assertValidScopeDefinition(dto: CreateLicenseDto): void {
    if (dto.scopeType === LicenseScopeType.ORGANIZATION && !dto.organizationId) {
      throw new LicenseInvalidDefinitionException('ORGANIZATION-scoped licenses require organizationId');
    }
    if (dto.scopeType === LicenseScopeType.USER && !dto.ownerUserId) {
      throw new LicenseInvalidDefinitionException('USER-scoped licenses require ownerUserId');
    }
    if (dto.scopeType === LicenseScopeType.ENVIRONMENT && !dto.environment) {
      throw new LicenseInvalidDefinitionException('ENVIRONMENT-scoped licenses require environment');
    }
    if (dto.scopeType === LicenseScopeType.DEPLOYMENT && !dto.deploymentId) {
      throw new LicenseInvalidDefinitionException('DEPLOYMENT-scoped licenses require deploymentId');
    }
  }

  private async assertCanManage(workspaceId: string, userId: string, userRole: string): Promise<void> {
    if (LICENSE_MANAGE_ROLES.includes(userRole)) {
      return;
    }
    const hasGranularRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'ADMIN');
    if (!hasGranularRole) {
      throw new LicenseAccessDeniedException();
    }
  }

  private async getVisibleOrThrow(id: string, workspaceId: string, organizationId?: string): Promise<ILicense> {
    const license = await this.repository.findById(id);
    const visible = !!license && (license.workspaceId === workspaceId || (!!organizationId && license.organizationId === organizationId));
    if (!license || !visible) {
      throw new LicenseNotFoundException(id);
    }
    return license;
  }

  /** Snapshots never include `encryptedPrivateKey` — history is inspectable by workspace admins and must never leak signing material either. */
  private sanitize(license: ILicense): Record<string, unknown> {
    const { encryptedPrivateKey: _encryptedPrivateKey, ...safe } = license;
    return safe;
  }

  private async recordHistory(
    licenseId: string,
    workspaceId: string | null,
    changeType: LicenseChangeType,
    fromStatus: LicenseStatus | null,
    toStatus: LicenseStatus | null,
    changedBy: string | null,
    snapshot: Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    await this.repository.createHistory({ licenseId, workspaceId, changeType, fromStatus, toStatus, reason: reason ?? null, changedBy: changedBy === 'system' ? null : changedBy, snapshot: snapshot as any });
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string,
    action: string,
    actionCategory: AuditActionCategory,
    entityId: string,
    riskLevel?: AuditRiskLevel,
  ): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: actorId === 'system' ? ActivityActorType.SYSTEM : ActivityActorType.USER,
      actorId: actorId === 'system' ? undefined : actorId,
      action,
      actionCategory,
      module: LICENSE_MANAGEMENT_MODULE,
      entityType: 'License',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
      riskLevel,
    });
  }

  private async publishEvent(event: LicenseManagementEvent, license: ILicense, actorId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.eventQueue.publish({ event, licenseId: license.id, workspaceId: license.workspaceId, scopeKey: license.scopeKey, actorId, metadata });
  }
}
