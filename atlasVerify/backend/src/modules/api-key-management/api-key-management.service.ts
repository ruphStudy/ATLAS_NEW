import { Injectable, Logger } from '@nestjs/common';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { UsageTrackingService } from '@modules/usage-tracking/usage-tracking.service';
import { UsageRecordSource } from '@modules/usage-tracking/interfaces';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { ApiKeyManagementRepository } from './api-key-management.repository';
import { ApiKeyRateLimiterService } from './api-key-rate-limiter.service';
import { ApiKeyManagementEventQueue } from './jobs';
import { generateApiKey, hashApiKeySecret, parseApiKey } from './api-key-crypto.util';
import { buildApiKeyScopeKey } from './scope-key.util';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  RotateApiKeyDto,
  ApiKeyReasonDto,
  ApiKeyFilterDto,
  PaginatedApiKeyResponseDto,
} from './dto';
import {
  ApiKeyChangeType,
  ApiKeyManagementEvent,
  ApiKeyScopeType,
  ApiKeyStatus,
  IApiKey,
  IApiKeyCreatedSecret,
  IApiKeyHistory,
  IApiKeyValidationContext,
  IApiKeyValidationResult,
} from './interfaces';
import {
  API_KEY_MANAGEMENT_MODULE,
  API_KEY_MANAGE_ROLES,
  API_KEY_USAGE_RESOURCE_KEY,
  DEFAULT_GRACE_PERIOD_MS,
} from './constants';
import {
  ApiKeyAccessDeniedException,
  ApiKeyAlreadyExistsException,
  ApiKeyExpiredException,
  ApiKeyIpNotAllowedException,
  ApiKeyInactiveException,
  ApiKeyInvalidException,
  ApiKeyInvalidStateTransitionException,
  ApiKeyNotFoundException,
  ApiKeyPermissionDeniedException,
  ApiKeyRateLimitExceededException,
} from './exceptions/api-key-management.exceptions';

const ALLOWED_TRANSITIONS: Record<ApiKeyStatus, ApiKeyStatus[]> = {
  [ApiKeyStatus.ACTIVE]: [ApiKeyStatus.DISABLED, ApiKeyStatus.REVOKED, ApiKeyStatus.EXPIRED],
  [ApiKeyStatus.DISABLED]: [ApiKeyStatus.ACTIVE, ApiKeyStatus.REVOKED],
  [ApiKeyStatus.REVOKED]: [],
  [ApiKeyStatus.EXPIRED]: [],
};

@Injectable()
export class ApiKeyManagementService {
  private readonly logger = new Logger(ApiKeyManagementService.name);

  constructor(
    private readonly repository: ApiKeyManagementRepository,
    private readonly rateLimiter: ApiKeyRateLimiterService,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly usageTrackingService: UsageTrackingService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: ApiKeyManagementEventQueue,
  ) {}

  // ── Create ───────────────────────────────────────────────────────

  async createApiKey(workspaceId: string, userId: string, userRole: string, dto: CreateApiKeyDto): Promise<IApiKeyCreatedSecret> {
    const ownerUserId = dto.scopeType === ApiKeyScopeType.USER ? dto.ownerUserId ?? userId : dto.ownerUserId ?? null;
    await this.assertCanManageScope(workspaceId, userId, userRole, dto.scopeType, ownerUserId);

    const scopeKey = buildApiKeyScopeKey({
      scopeType: dto.scopeType,
      workspaceId,
      organizationId: dto.organizationId,
      ownerUserId,
      serviceAccountHandle: dto.serviceAccountHandle,
    });

    const existing = await this.repository.findByScopeKeyAndName(scopeKey, dto.name);
    if (existing) {
      throw new ApiKeyAlreadyExistsException(dto.name);
    }

    const generated = generateApiKey();

    const apiKey = await this.repository.create({
      workspaceId: dto.scopeType === ApiKeyScopeType.ORGANIZATION ? null : workspaceId,
      organizationId: dto.organizationId ?? null,
      scopeType: dto.scopeType,
      scopeKey,
      name: dto.name,
      description: dto.description ?? null,
      ownerUserId,
      serviceAccountHandle: dto.serviceAccountHandle ?? null,
      keyId: generated.keyId,
      secretHash: generated.secretHash,
      status: ApiKeyStatus.ACTIVE,
      scopes: dto.scopes ?? [],
      permissions: dto.permissions ?? [],
      environments: dto.environments ?? [],
      ipAllowlist: dto.ipAllowlist ?? [],
      rateLimitPerMinute: dto.rateLimitPerMinute ?? null,
      usageRestrictions: (dto.usageRestrictions ?? null) as any,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      usageCount: 0,
      createdBy: userId,
    });

    await this.repository.createHistory({
      apiKeyId: apiKey.id,
      workspaceId: apiKey.workspaceId,
      changeType: ApiKeyChangeType.CREATED,
      toStatus: ApiKeyStatus.ACTIVE,
      changedBy: userId,
      snapshot: this.sanitizeForHistory(apiKey),
    });

    await this.recordAudit(workspaceId, userId, 'api-key-management.api_key.created', AuditActionCategory.CREATE, apiKey.id);
    await this.publishEvent(ApiKeyManagementEvent.API_KEY_CREATED, apiKey, userId);

    return { apiKey, plaintextKey: generated.plaintextKey };
  }

  async updateApiKey(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateApiKeyDto): Promise<IApiKey> {
    const apiKey = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManageKey(apiKey, userId, userRole);

    const updated = await this.repository.update(id, {
      name: dto.name ?? apiKey.name,
      description: dto.description ?? apiKey.description,
      scopes: dto.scopes ?? apiKey.scopes,
      permissions: dto.permissions ?? apiKey.permissions,
      environments: dto.environments ?? apiKey.environments,
      ipAllowlist: dto.ipAllowlist ?? apiKey.ipAllowlist,
      rateLimitPerMinute: dto.rateLimitPerMinute ?? apiKey.rateLimitPerMinute,
      usageRestrictions: (dto.usageRestrictions ?? apiKey.usageRestrictions) as any,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : apiKey.expiresAt,
    });

    await this.recordAudit(workspaceId, userId, 'api-key-management.api_key.updated', AuditActionCategory.UPDATE, id);
    return updated;
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  async rotateApiKey(id: string, workspaceId: string, userId: string, userRole: string, dto: RotateApiKeyDto): Promise<IApiKeyCreatedSecret> {
    const oldKey = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManageKey(oldKey, userId, userRole);

    if (oldKey.status !== ApiKeyStatus.ACTIVE) {
      throw new ApiKeyInvalidStateTransitionException(oldKey.status, 'ROTATED');
    }

    const generated = generateApiKey();
    const gracePeriodMs = dto.gracePeriodMs ?? DEFAULT_GRACE_PERIOD_MS;

    const newKey = await this.repository.create({
      workspaceId: oldKey.workspaceId,
      organizationId: oldKey.organizationId,
      scopeType: oldKey.scopeType,
      scopeKey: oldKey.scopeKey,
      name: `${oldKey.name} (rotated ${new Date().toISOString()})`,
      description: oldKey.description,
      ownerUserId: oldKey.ownerUserId,
      serviceAccountHandle: oldKey.serviceAccountHandle,
      keyId: generated.keyId,
      secretHash: generated.secretHash,
      status: ApiKeyStatus.ACTIVE,
      scopes: oldKey.scopes,
      permissions: oldKey.permissions,
      environments: oldKey.environments,
      ipAllowlist: oldKey.ipAllowlist,
      rateLimitPerMinute: oldKey.rateLimitPerMinute,
      usageRestrictions: oldKey.usageRestrictions as any,
      expiresAt: oldKey.expiresAt,
      rotatedFromId: oldKey.id,
      usageCount: 0,
      createdBy: userId,
    });

    if (gracePeriodMs <= 0) {
      await this.repository.update(oldKey.id, {
        status: ApiKeyStatus.REVOKED,
        rotatedToId: newKey.id,
        revokedAt: new Date(),
        revokedReason: 'Rotated with zero grace period',
      });
    } else {
      await this.repository.update(oldKey.id, {
        rotatedToId: newKey.id,
        gracePeriodEndsAt: new Date(Date.now() + gracePeriodMs),
      });
    }

    await this.repository.createHistory({
      apiKeyId: newKey.id,
      workspaceId: newKey.workspaceId,
      changeType: ApiKeyChangeType.ROTATED,
      toStatus: ApiKeyStatus.ACTIVE,
      reason: `Rotated from '${oldKey.keyId}'`,
      changedBy: userId,
      snapshot: this.sanitizeForHistory(newKey),
    });

    await this.recordAudit(workspaceId, userId, 'api-key-management.api_key.rotated', AuditActionCategory.UPDATE, oldKey.id);
    await this.publishEvent(ApiKeyManagementEvent.API_KEY_ROTATED, newKey, userId, { rotatedFromId: oldKey.id, gracePeriodMs });

    return { apiKey: newKey, plaintextKey: generated.plaintextKey };
  }

  async revokeApiKey(id: string, workspaceId: string, userId: string, userRole: string, dto: ApiKeyReasonDto): Promise<IApiKey> {
    const apiKey = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManageKey(apiKey, userId, userRole);

    return this.transition(apiKey, ApiKeyStatus.REVOKED, userId, ApiKeyChangeType.REVOKED, ApiKeyManagementEvent.API_KEY_REVOKED, dto.reason, {
      revokedAt: new Date(),
      revokedReason: dto.reason ?? null,
    });
  }

  async disableApiKey(id: string, workspaceId: string, userId: string, userRole: string): Promise<IApiKey> {
    const apiKey = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManageKey(apiKey, userId, userRole);

    return this.transition(apiKey, ApiKeyStatus.DISABLED, userId, ApiKeyChangeType.DISABLED, ApiKeyManagementEvent.API_KEY_DISABLED, undefined, {
      disabledAt: new Date(),
    });
  }

  async enableApiKey(id: string, workspaceId: string, userId: string, userRole: string): Promise<IApiKey> {
    const apiKey = await this.getVisibleOrThrow(id, workspaceId);
    await this.assertCanManageKey(apiKey, userId, userRole);

    return this.transition(apiKey, ApiKeyStatus.ACTIVE, userId, ApiKeyChangeType.ENABLED, ApiKeyManagementEvent.API_KEY_ENABLED, undefined, {
      disabledAt: null,
    });
  }

  // ── Validation (the request-time hot path) ────────────────────────

  async validateApiKey(rawKey: string, context: IApiKeyValidationContext = {}): Promise<IApiKeyValidationResult> {
    const parsed = parseApiKey(rawKey);
    if (!parsed) {
      return { valid: false, reason: 'Malformed API key' };
    }

    const apiKey = await this.repository.findByKeyId(parsed.keyId);
    if (!apiKey || hashApiKeySecret(parsed.secret) !== apiKey.secretHash) {
      return { valid: false, reason: 'Invalid API key' };
    }

    if (apiKey.status === ApiKeyStatus.REVOKED) {
      return { valid: false, reason: 'This API key has been revoked' };
    }
    if (apiKey.status === ApiKeyStatus.DISABLED) {
      return { valid: false, reason: 'This API key is disabled' };
    }
    if (apiKey.status === ApiKeyStatus.EXPIRED || (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now())) {
      return { valid: false, reason: 'This API key has expired' };
    }

    if (context.ipAddress && apiKey.ipAllowlist.length > 0 && !apiKey.ipAllowlist.includes(context.ipAddress)) {
      return { valid: false, reason: 'Request IP is not allowed for this API key' };
    }

    if (context.requiredPermission && !apiKey.permissions.includes(context.requiredPermission)) {
      return { valid: false, reason: `Missing required permission '${context.requiredPermission}'` };
    }

    if (!this.rateLimiter.checkAndConsume(apiKey.id, apiKey.rateLimitPerMinute)) {
      return { valid: false, reason: 'Rate limit exceeded' };
    }

    this.recordSuccessfulUse(apiKey, context).catch((error) =>
      this.logger.warn(`Post-validation usage tracking failed for key '${apiKey.id}': ${(error as Error).message}`),
    );

    return {
      valid: true,
      apiKey,
      workspaceId: apiKey.workspaceId ?? undefined,
      organizationId: apiKey.organizationId ?? undefined,
    };
  }

  /** Throwing variant for guards/callers that want exceptions instead of a result object. */
  async assertValidApiKey(rawKey: string, context: IApiKeyValidationContext = {}): Promise<IApiKey> {
    const result = await this.validateApiKey(rawKey, context);
    if (!result.valid || !result.apiKey) {
      if (result.reason?.includes('expired')) throw new ApiKeyExpiredException();
      if (result.reason?.includes('disabled') || result.reason?.includes('revoked')) throw new ApiKeyInactiveException();
      if (result.reason?.includes('IP')) throw new ApiKeyIpNotAllowedException();
      if (result.reason?.includes('permission')) throw new ApiKeyPermissionDeniedException(context.requiredPermission ?? '');
      if (result.reason?.includes('Rate limit')) throw new ApiKeyRateLimitExceededException();
      throw new ApiKeyInvalidException(result.reason);
    }
    return result.apiKey;
  }

  // ── Scheduler-callable sweeps (no active scheduler wired — mirrors every other module this session) ──

  async processExpirySweep(): Promise<{ expired: number; graceExpired: number }> {
    const now = new Date();

    const expiring = await this.repository.findDueForExpiry(now);
    for (const apiKey of expiring) {
      await this.transition(apiKey, ApiKeyStatus.EXPIRED, 'system', ApiKeyChangeType.EXPIRED, ApiKeyManagementEvent.API_KEY_EXPIRED, 'Expiry date reached', {});
    }

    const graceExpired = await this.repository.findGracePeriodExpired(now);
    for (const apiKey of graceExpired) {
      await this.transition(apiKey, ApiKeyStatus.REVOKED, 'system', ApiKeyChangeType.REVOKED, ApiKeyManagementEvent.API_KEY_REVOKED, 'Rotation grace period ended', {
        revokedAt: now,
        revokedReason: 'Rotation grace period ended',
      });
    }

    this.logger.log(`API key expiry sweep: ${expiring.length} expired, ${graceExpired.length} grace-period-revoked`);
    return { expired: expiring.length, graceExpired: graceExpired.length };
  }

  // ── Reads ────────────────────────────────────────────────────────

  async getApiKey(id: string, workspaceId: string): Promise<IApiKey> {
    return this.getVisibleOrThrow(id, workspaceId);
  }

  async getHistory(id: string, workspaceId: string): Promise<IApiKeyHistory[]> {
    await this.getVisibleOrThrow(id, workspaceId);
    return this.repository.findHistory(id);
  }

  async findAllApiKeys(workspaceId: string, filter: ApiKeyFilterDto): Promise<PaginatedApiKeyResponseDto> {
    const [data, total] = await this.repository.findAll(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async recordSuccessfulUse(apiKey: IApiKey, context: IApiKeyValidationContext): Promise<void> {
    await this.repository.recordUsageTick(apiKey.id, context.ipAddress ?? null, context.requestMetadata ?? null);

    if (apiKey.workspaceId) {
      await this.usageTrackingService
        .recordUsage(apiKey.workspaceId, apiKey.ownerUserId ?? 'system', {
          module: API_KEY_MANAGEMENT_MODULE,
          resourceKey: API_KEY_USAGE_RESOURCE_KEY,
          quantity: 1,
          unit: 'COUNT',
          source: UsageRecordSource.EVENT_DRIVEN,
          correlationId: apiKey.id,
          metadata: { apiKeyId: apiKey.id, keyId: apiKey.keyId },
        })
        .catch((error) => this.logger.warn(`Usage Tracking recordUsage failed for key '${apiKey.id}': ${(error as Error).message}`));
    }

    await this.publishEvent(ApiKeyManagementEvent.API_KEY_USED, apiKey, apiKey.ownerUserId ?? undefined);
  }

  private async transition(
    apiKey: IApiKey,
    to: ApiKeyStatus,
    userId: string,
    changeType: ApiKeyChangeType,
    event: ApiKeyManagementEvent,
    reason: string | undefined,
    extraFields: Partial<IApiKey>,
  ): Promise<IApiKey> {
    if (!ALLOWED_TRANSITIONS[apiKey.status]?.includes(to)) {
      throw new ApiKeyInvalidStateTransitionException(apiKey.status, to);
    }

    const updated = await this.repository.update(apiKey.id, { status: to, ...extraFields });

    await this.repository.createHistory({
      apiKeyId: apiKey.id,
      workspaceId: apiKey.workspaceId,
      changeType,
      fromStatus: apiKey.status,
      toStatus: to,
      reason,
      changedBy: userId === 'system' ? null : userId,
      snapshot: this.sanitizeForHistory(updated),
    });

    await this.recordAudit(
      apiKey.workspaceId ?? apiKey.organizationId ?? 'unknown',
      userId,
      `api-key-management.api_key.${changeType.toLowerCase()}`,
      AuditActionCategory.UPDATE,
      apiKey.id,
      AuditRiskLevel.SUSPICIOUS,
    );
    await this.publishEvent(event, updated, userId === 'system' ? undefined : userId, reason ? { reason } : undefined);
    return updated;
  }

  private async assertCanManageScope(
    workspaceId: string,
    userId: string,
    userRole: string,
    scopeType: ApiKeyScopeType,
    ownerUserId: string | null,
  ): Promise<void> {
    if (scopeType === ApiKeyScopeType.USER && ownerUserId === userId) {
      return;
    }
    if (API_KEY_MANAGE_ROLES.includes(userRole)) {
      return;
    }
    const hasGranularRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'ADMIN');
    if (!hasGranularRole) {
      throw new ApiKeyAccessDeniedException();
    }
  }

  private async assertCanManageKey(apiKey: IApiKey, userId: string, userRole: string): Promise<void> {
    if (apiKey.scopeType === ApiKeyScopeType.USER && apiKey.ownerUserId === userId) {
      return;
    }
    if (API_KEY_MANAGE_ROLES.includes(userRole)) {
      return;
    }
    if (apiKey.workspaceId) {
      const hasGranularRole = await this.rolesPermissionsService.userHasActiveRole(apiKey.workspaceId, userId, 'ADMIN');
      if (hasGranularRole) return;
    }
    throw new ApiKeyAccessDeniedException();
  }

  private async getVisibleOrThrow(id: string, workspaceId: string): Promise<IApiKey> {
    const apiKey = await this.repository.findById(id);
    if (!apiKey || apiKey.workspaceId !== workspaceId) {
      throw new ApiKeyNotFoundException(id);
    }
    return apiKey;
  }

  /** Snapshots never include `secretHash` — history is inspectable by workspace admins and must never leak hash material either. */
  private sanitizeForHistory(apiKey: IApiKey): Record<string, unknown> {
    const { secretHash: _secretHash, ...safe } = apiKey;
    return safe;
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
      module: API_KEY_MANAGEMENT_MODULE,
      entityType: 'ApiKey',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
      riskLevel,
    });
  }

  private async publishEvent(event: ApiKeyManagementEvent, apiKey: IApiKey, actorId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.eventQueue.publish({
      event,
      apiKeyId: apiKey.id,
      workspaceId: apiKey.workspaceId,
      scopeKey: apiKey.scopeKey,
      actorId,
      metadata,
    });
  }
}
