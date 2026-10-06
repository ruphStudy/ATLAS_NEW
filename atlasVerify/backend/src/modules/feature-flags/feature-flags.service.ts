import { Injectable, Logger } from '@nestjs/common';
import { PlanManagementService } from '@modules/plan-management/plan-management.service';
import { SubscriptionManagementService } from '@modules/subscription-management/subscription-management.service';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { FeatureFlagsRepository } from './feature-flags.repository';
import { FeatureFlagCacheService } from './feature-flag-cache.service';
import { FeatureFlagsEventQueue } from './jobs';
import { wouldCreateCycle, findDependencyConflict } from './dependency-graph.util';
import { evaluateRawFlag } from './feature-flag-evaluation.util';
import { buildFeatureFlagScopeKey, buildCandidateScopeKeys } from './scope-key.util';
import {
  CreateFeatureFlagDefinitionDto,
  UpdateFeatureFlagDefinitionDto,
  FeatureFlagDefinitionFilterDto,
  ActivateKillSwitchDto,
  CreateFeatureFlagOverrideDto,
  UpdateFeatureFlagOverrideDto,
  FeatureFlagOverrideFilterDto,
  FeatureFlagReasonDto,
  PaginatedFeatureFlagDefinitionResponseDto,
  PaginatedFeatureFlagOverrideResponseDto,
} from './dto';
import {
  FeatureFlagChangeType,
  FeatureFlagDefinitionStatus,
  FeatureFlagEvent,
  FeatureFlagHistoryEntityType,
  FeatureFlagOverrideStatus,
  FeatureFlagScopeType,
  IFeatureFlagDefinition,
  IFeatureFlagEvaluationContext,
  IFeatureFlagEvaluationResult,
  IFeatureFlagHistory,
  IFeatureFlagOverride,
} from './interfaces';
import { FEATURE_FLAG_MANAGE_ROLES, FEATURE_FLAG_SCOPE_PRECEDENCE, FEATURE_FLAGS_MODULE } from './constants';
import {
  FeatureFlagAccessDeniedException,
  FeatureFlagAlreadyExistsException,
  FeatureFlagCircularDependencyException,
  FeatureFlagConflictingRuleException,
  FeatureFlagInvalidStateTransitionException,
  FeatureFlagInvalidTargetingException,
  FeatureFlagNotFoundException,
  FeatureFlagOverrideAlreadyExistsException,
  FeatureFlagOverrideNotFoundException,
} from './exceptions/feature-flags.exceptions';

const DEFINITION_TRANSITIONS: Record<FeatureFlagDefinitionStatus, FeatureFlagDefinitionStatus[]> = {
  [FeatureFlagDefinitionStatus.DRAFT]: [FeatureFlagDefinitionStatus.ACTIVE, FeatureFlagDefinitionStatus.ARCHIVED],
  [FeatureFlagDefinitionStatus.ACTIVE]: [FeatureFlagDefinitionStatus.DISABLED, FeatureFlagDefinitionStatus.ARCHIVED],
  [FeatureFlagDefinitionStatus.DISABLED]: [FeatureFlagDefinitionStatus.ACTIVE, FeatureFlagDefinitionStatus.ARCHIVED],
  [FeatureFlagDefinitionStatus.ARCHIVED]: [FeatureFlagDefinitionStatus.DISABLED],
};

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(
    private readonly repository: FeatureFlagsRepository,
    private readonly cache: FeatureFlagCacheService,
    private readonly planManagementService: PlanManagementService,
    private readonly subscriptionManagementService: SubscriptionManagementService,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: FeatureFlagsEventQueue,
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // Definitions
  // ══════════════════════════════════════════════════════════════════

  async createDefinition(workspaceId: string, userId: string, userRole: string, dto: CreateFeatureFlagDefinitionDto): Promise<IFeatureFlagDefinition> {
    await this.assertCanManage(workspaceId, userId, userRole);

    const existing = await this.repository.findDefinitionByKey(dto.key);
    if (existing) {
      throw new FeatureFlagAlreadyExistsException(dto.key);
    }

    const dependencies = dto.dependencies ?? [];
    const mutuallyExclusiveWith = dto.mutuallyExclusiveWith ?? [];
    await this.assertValidGraph(dto.key, dependencies, mutuallyExclusiveWith);

    const definition = await this.repository.createDefinition({
      key: dto.key,
      name: dto.name,
      description: dto.description ?? null,
      type: dto.type,
      status: FeatureFlagDefinitionStatus.DRAFT,
      defaultEnabled: dto.defaultEnabled ?? false,
      rolloutPercentage: dto.rolloutPercentage ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      dependencies,
      mutuallyExclusiveWith,
      priority: dto.priority ?? 0,
      killSwitchEnabled: false,
      owner: dto.owner ?? null,
      version: 1,
      createdBy: userId,
    });

    await this.recordHistory(FeatureFlagHistoryEntityType.DEFINITION, definition.id, definition.key, null, FeatureFlagChangeType.DEFINITION_CREATED, null, FeatureFlagDefinitionStatus.DRAFT, userId, this.sanitizeDefinition(definition));
    await this.recordAudit(workspaceId, userId, 'feature-flags.definition.created', AuditActionCategory.CREATE, definition.key);
    await this.publishEvent(FeatureFlagEvent.DEFINITION_CREATED, definition.key, definition.id, null, userId);

    return definition;
  }

  async updateDefinition(key: string, workspaceId: string, userId: string, userRole: string, dto: UpdateFeatureFlagDefinitionDto): Promise<IFeatureFlagDefinition> {
    const definition = await this.getDefinitionOrThrow(key);
    await this.assertCanManage(workspaceId, userId, userRole);

    const dependencies = dto.dependencies ?? definition.dependencies;
    const mutuallyExclusiveWith = dto.mutuallyExclusiveWith ?? definition.mutuallyExclusiveWith;
    if (dto.dependencies || dto.mutuallyExclusiveWith) {
      await this.assertValidGraph(key, dependencies, mutuallyExclusiveWith);
    }

    const updated = await this.repository.updateDefinition(key, {
      name: dto.name ?? definition.name,
      description: dto.description ?? definition.description,
      defaultEnabled: dto.defaultEnabled ?? definition.defaultEnabled,
      rolloutPercentage: dto.rolloutPercentage ?? definition.rolloutPercentage,
      startDate: dto.startDate ? new Date(dto.startDate) : definition.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : definition.endDate,
      dependencies,
      mutuallyExclusiveWith,
      priority: dto.priority ?? definition.priority,
      owner: dto.owner ?? definition.owner,
      version: definition.version + 1,
    });

    await this.recordHistory(FeatureFlagHistoryEntityType.DEFINITION, updated.id, key, null, FeatureFlagChangeType.DEFINITION_UPDATED, null, null, userId, this.sanitizeDefinition(updated));
    await this.recordAudit(workspaceId, userId, 'feature-flags.definition.updated', AuditActionCategory.UPDATE, key);
    await this.publishEvent(FeatureFlagEvent.DEFINITION_UPDATED, key, updated.id, null, userId);
    return updated;
  }

  async enableDefinition(key: string, workspaceId: string, userId: string, userRole: string): Promise<IFeatureFlagDefinition> {
    const definition = await this.getDefinitionOrThrow(key);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionDefinition(definition, FeatureFlagDefinitionStatus.ACTIVE, userId, FeatureFlagChangeType.DEFINITION_ENABLED, FeatureFlagEvent.DEFINITION_ENABLED, undefined, workspaceId);
  }

  async disableDefinition(key: string, workspaceId: string, userId: string, userRole: string): Promise<IFeatureFlagDefinition> {
    const definition = await this.getDefinitionOrThrow(key);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionDefinition(definition, FeatureFlagDefinitionStatus.DISABLED, userId, FeatureFlagChangeType.DEFINITION_DISABLED, FeatureFlagEvent.DEFINITION_DISABLED, undefined, workspaceId);
  }

  async archiveDefinition(key: string, workspaceId: string, userId: string, userRole: string): Promise<IFeatureFlagDefinition> {
    const definition = await this.getDefinitionOrThrow(key);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionDefinition(definition, FeatureFlagDefinitionStatus.ARCHIVED, userId, FeatureFlagChangeType.DEFINITION_ARCHIVED, FeatureFlagEvent.DEFINITION_ARCHIVED, undefined, workspaceId);
  }

  async restoreDefinition(key: string, workspaceId: string, userId: string, userRole: string): Promise<IFeatureFlagDefinition> {
    const definition = await this.getDefinitionOrThrow(key);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionDefinition(definition, FeatureFlagDefinitionStatus.DISABLED, userId, FeatureFlagChangeType.DEFINITION_RESTORED, FeatureFlagEvent.DEFINITION_RESTORED, undefined, workspaceId);
  }

  /** Emergency break-glass — bypasses the normal status machine entirely and forces the flag off for every context, instantly, on the next evaluation (cache invalidated immediately). */
  async activateKillSwitch(key: string, workspaceId: string, userId: string, userRole: string, dto: ActivateKillSwitchDto): Promise<IFeatureFlagDefinition> {
    const definition = await this.getDefinitionOrThrow(key);
    await this.assertCanManage(workspaceId, userId, userRole);

    const updated = await this.repository.updateDefinition(key, { killSwitchEnabled: true, killSwitchReason: dto.reason });
    this.cache.invalidateFlag(key);

    await this.recordHistory(FeatureFlagHistoryEntityType.DEFINITION, updated.id, key, null, FeatureFlagChangeType.KILL_SWITCH_ACTIVATED, null, null, userId, this.sanitizeDefinition(updated), dto.reason);
    await this.recordAudit(workspaceId, userId, 'feature-flags.definition.kill_switch_activated', AuditActionCategory.UPDATE, key, AuditRiskLevel.HIGH_RISK);
    await this.publishEvent(FeatureFlagEvent.KILL_SWITCH_ACTIVATED, key, updated.id, null, userId, { reason: dto.reason });
    return updated;
  }

  async deactivateKillSwitch(key: string, workspaceId: string, userId: string, userRole: string): Promise<IFeatureFlagDefinition> {
    const definition = await this.getDefinitionOrThrow(key);
    await this.assertCanManage(workspaceId, userId, userRole);

    const updated = await this.repository.updateDefinition(key, { killSwitchEnabled: false, killSwitchReason: null });
    this.cache.invalidateFlag(key);

    await this.recordHistory(FeatureFlagHistoryEntityType.DEFINITION, updated.id, key, null, FeatureFlagChangeType.KILL_SWITCH_DEACTIVATED, null, null, userId, this.sanitizeDefinition(updated));
    await this.recordAudit(workspaceId, userId, 'feature-flags.definition.kill_switch_deactivated', AuditActionCategory.UPDATE, key, AuditRiskLevel.SUSPICIOUS);
    await this.publishEvent(FeatureFlagEvent.KILL_SWITCH_DEACTIVATED, key, updated.id, null, userId);
    return updated;
  }

  async getDefinition(key: string): Promise<IFeatureFlagDefinition> {
    return this.getDefinitionOrThrow(key);
  }

  async getDefinitionHistory(key: string): Promise<IFeatureFlagHistory[]> {
    const definition = await this.getDefinitionOrThrow(key);
    return this.repository.findHistory(definition.id);
  }

  async findAllDefinitions(filter: FeatureFlagDefinitionFilterDto): Promise<PaginatedFeatureFlagDefinitionResponseDto> {
    const [data, total] = await this.repository.findAllDefinitions(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════
  // Overrides
  // ══════════════════════════════════════════════════════════════════

  async createOverride(flagKey: string, workspaceId: string, userId: string, userRole: string, dto: CreateFeatureFlagOverrideDto): Promise<IFeatureFlagOverride> {
    await this.getDefinitionOrThrow(flagKey);
    await this.assertCanManage(workspaceId, userId, userRole);
    this.assertValidOverrideDefinition(dto);

    const scopeKey = buildFeatureFlagScopeKey({
      scope: dto.scope,
      workspaceId,
      organizationId: dto.organizationId,
      userId: dto.targetUserId,
      planKey: dto.planKey,
      environment: dto.environment,
    });

    const existing = await this.repository.findOverrideByFlagAndScopeKey(flagKey, scopeKey);
    if (existing) {
      throw new FeatureFlagOverrideAlreadyExistsException();
    }

    const override = await this.repository.createOverride({
      flagKey,
      scope: dto.scope,
      scopeKey,
      workspaceId: dto.scope === FeatureFlagScopeType.ORGANIZATION ? null : workspaceId,
      organizationId: dto.organizationId ?? null,
      status: FeatureFlagOverrideStatus.ACTIVE,
      enabled: dto.enabled ?? true,
      rolloutPercentage: dto.rolloutPercentage ?? null,
      rules: (dto.rules ?? null) as any,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      version: 1,
      reason: dto.reason ?? null,
      changedBy: userId,
    });

    this.cache.invalidateFlag(flagKey);
    await this.recordHistory(FeatureFlagHistoryEntityType.OVERRIDE, override.id, flagKey, override.workspaceId, FeatureFlagChangeType.OVERRIDE_CREATED, null, FeatureFlagOverrideStatus.ACTIVE, userId, this.sanitizeOverride(override), dto.reason);
    await this.recordAudit(workspaceId, userId, 'feature-flags.override.created', AuditActionCategory.CREATE, override.id);
    await this.publishEvent(FeatureFlagEvent.OVERRIDE_CREATED, flagKey, override.id, override.workspaceId, userId);

    return override;
  }

  async updateOverride(overrideId: string, workspaceId: string, userId: string, userRole: string, dto: UpdateFeatureFlagOverrideDto): Promise<IFeatureFlagOverride> {
    const override = await this.getVisibleOverrideOrThrow(overrideId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const updated = await this.repository.updateOverride(overrideId, {
      enabled: dto.enabled ?? override.enabled,
      rolloutPercentage: dto.rolloutPercentage ?? override.rolloutPercentage,
      rules: (dto.rules ?? override.rules) as any,
      startDate: dto.startDate ? new Date(dto.startDate) : override.startDate,
      endDate: dto.endDate ? new Date(dto.endDate) : override.endDate,
      version: override.version + 1,
      reason: dto.reason ?? override.reason,
      changedBy: userId,
    });

    this.cache.invalidateFlag(override.flagKey);
    await this.recordHistory(FeatureFlagHistoryEntityType.OVERRIDE, overrideId, override.flagKey, override.workspaceId, FeatureFlagChangeType.OVERRIDE_UPDATED, null, null, userId, this.sanitizeOverride(updated), dto.reason);
    await this.recordAudit(workspaceId, userId, 'feature-flags.override.updated', AuditActionCategory.UPDATE, overrideId);
    await this.publishEvent(FeatureFlagEvent.OVERRIDE_UPDATED, override.flagKey, overrideId, override.workspaceId, userId);
    return updated;
  }

  async enableOverride(overrideId: string, workspaceId: string, userId: string, userRole: string): Promise<IFeatureFlagOverride> {
    const override = await this.getVisibleOverrideOrThrow(overrideId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionOverride(override, FeatureFlagOverrideStatus.ACTIVE, userId, FeatureFlagChangeType.OVERRIDE_ENABLED, FeatureFlagEvent.OVERRIDE_ENABLED);
  }

  async disableOverride(overrideId: string, workspaceId: string, userId: string, userRole: string): Promise<IFeatureFlagOverride> {
    const override = await this.getVisibleOverrideOrThrow(overrideId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionOverride(override, FeatureFlagOverrideStatus.DISABLED, userId, FeatureFlagChangeType.OVERRIDE_DISABLED, FeatureFlagEvent.OVERRIDE_DISABLED);
  }

  async archiveOverride(overrideId: string, workspaceId: string, userId: string, userRole: string, dto: FeatureFlagReasonDto): Promise<IFeatureFlagOverride> {
    const override = await this.getVisibleOverrideOrThrow(overrideId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionOverride(override, FeatureFlagOverrideStatus.ARCHIVED, userId, FeatureFlagChangeType.OVERRIDE_ARCHIVED, FeatureFlagEvent.OVERRIDE_ARCHIVED, dto.reason);
  }

  async getOverride(overrideId: string, workspaceId: string): Promise<IFeatureFlagOverride> {
    return this.getVisibleOverrideOrThrow(overrideId, workspaceId);
  }

  async listOverridesForFlag(flagKey: string): Promise<IFeatureFlagOverride[]> {
    await this.getDefinitionOrThrow(flagKey);
    return this.repository.findOverridesForFlag(flagKey);
  }

  async findAllOverrides(workspaceId: string, filter: FeatureFlagOverrideFilterDto): Promise<PaginatedFeatureFlagOverrideResponseDto> {
    const [data, total] = await this.repository.findAllOverrides(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════
  // Evaluation (centralized, configuration-driven — the only place resolution logic lives)
  // ══════════════════════════════════════════════════════════════════

  async evaluate(flagKey: string, context: IFeatureFlagEvaluationContext): Promise<IFeatureFlagEvaluationResult> {
    const cacheKey = this.cache.buildKey(flagKey, context);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { planKey, tierRank } = await this.resolvePlanContext(context);
    const result = await this.resolveFlag(flagKey, context, planKey, tierRank, new Set(), new Set());

    this.cache.set(cacheKey, result);
    this.publishEvent(FeatureFlagEvent.FLAG_EVALUATED, flagKey, undefined, context.workspaceId ?? null, context.userId, { enabled: result.enabled, source: result.source }).catch(() => undefined);
    return result;
  }

  async evaluateMany(flagKeys: string[], context: IFeatureFlagEvaluationContext): Promise<Record<string, IFeatureFlagEvaluationResult>> {
    const entries = await Promise.all(flagKeys.map(async (key) => [key, await this.evaluate(key, context)] as const));
    return Object.fromEntries(entries);
  }

  // ══════════════════════════════════════════════════════════════════
  // Scheduler-callable sweep (no active scheduler wired — mirrors every other module this session)
  // ══════════════════════════════════════════════════════════════════

  async processScheduleSweep(): Promise<{ definitionsDisabled: number; overridesDisabled: number }> {
    const now = new Date();

    const definitions = await this.repository.findActiveDefinitionsPastEndDate(now);
    for (const definition of definitions) {
      await this.transitionDefinition(definition, FeatureFlagDefinitionStatus.DISABLED, 'system', FeatureFlagChangeType.DEFINITION_DISABLED, FeatureFlagEvent.DEFINITION_DISABLED, 'Scheduled end date reached');
    }

    const overrides = await this.repository.findActiveOverridesPastEndDate(now);
    for (const override of overrides) {
      await this.transitionOverride(override, FeatureFlagOverrideStatus.DISABLED, 'system', FeatureFlagChangeType.OVERRIDE_DISABLED, FeatureFlagEvent.OVERRIDE_DISABLED, 'Scheduled end date reached');
    }

    this.logger.log(`Feature flag schedule sweep: ${definitions.length} definitions disabled, ${overrides.length} overrides disabled`);
    return { definitionsDisabled: definitions.length, overridesDisabled: overrides.length };
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — evaluation core
  // ══════════════════════════════════════════════════════════════════

  private async resolveFlag(
    flagKey: string,
    context: IFeatureFlagEvaluationContext,
    planKey: string | null,
    tierRank: number | null,
    dependencyVisited: Set<string>,
    exclusivityVisited: Set<string>,
  ): Promise<IFeatureFlagEvaluationResult> {
    const definition = await this.repository.findDefinitionByKey(flagKey);
    if (!definition) {
      return { key: flagKey, enabled: false, source: 'DEFAULT', reason: 'Flag is not defined' };
    }
    if (definition.status !== FeatureFlagDefinitionStatus.ACTIVE) {
      return { key: flagKey, enabled: false, source: 'INACTIVE', reason: `Flag status is '${definition.status}'` };
    }
    if (definition.killSwitchEnabled) {
      return { key: flagKey, enabled: false, source: 'KILL_SWITCH', reason: definition.killSwitchReason ?? 'Kill switch is active' };
    }

    for (const dependencyKey of definition.dependencies) {
      if (dependencyVisited.has(dependencyKey)) continue;
      const dependencyResult = await this.resolveFlag(dependencyKey, context, planKey, tierRank, new Set([...dependencyVisited, flagKey]), exclusivityVisited);
      if (!dependencyResult.enabled) {
        return { key: flagKey, enabled: false, source: 'DEPENDENCY', reason: `Dependency '${dependencyKey}' is not enabled` };
      }
    }

    const scopeKeys = buildCandidateScopeKeys(context, planKey);
    const candidates = await this.repository.findOverrideCandidates(flagKey, scopeKeys);
    let winner: IFeatureFlagOverride | undefined;
    let winnerRank = -1;
    for (const candidate of candidates) {
      const rank = FEATURE_FLAG_SCOPE_PRECEDENCE.indexOf(candidate.scope);
      if (rank > winnerRank) {
        winner = candidate;
        winnerRank = rank;
      }
    }

    const raw = evaluateRawFlag(definition, winner ?? null, context, planKey, tierRank);
    let enabled = raw.enabled;
    let source: IFeatureFlagEvaluationResult['source'] = winner ? winner.scope : 'DEFAULT';
    let reason = raw.reason;

    if (enabled && definition.mutuallyExclusiveWith.length > 0 && !exclusivityVisited.has(flagKey)) {
      const nextExclusivityVisited = new Set([...exclusivityVisited, flagKey]);
      for (const conflictKey of definition.mutuallyExclusiveWith) {
        if (nextExclusivityVisited.has(conflictKey)) continue;
        const conflictResult = await this.resolveFlag(conflictKey, context, planKey, tierRank, dependencyVisited, nextExclusivityVisited);
        if (!conflictResult.enabled) continue;

        const conflictDefinition = await this.repository.findDefinitionByKey(conflictKey);
        const loses = conflictDefinition && (conflictDefinition.priority < definition.priority || (conflictDefinition.priority === definition.priority && conflictKey < flagKey));
        if (loses) {
          enabled = false;
          source = 'MUTUAL_EXCLUSION';
          reason = `Mutually exclusive with '${conflictKey}', which takes precedence`;
          break;
        }
      }
    }

    return { key: flagKey, enabled, source, reason };
  }

  private async resolvePlanContext(context: IFeatureFlagEvaluationContext): Promise<{ planKey: string | null; tierRank: number | null }> {
    if (!context.workspaceId) {
      return { planKey: null, tierRank: null };
    }
    try {
      const reference = await this.subscriptionManagementService.getEntitlementReference(context.workspaceId);
      if (!reference) {
        return { planKey: null, tierRank: null };
      }
      let tierRank: number | null = null;
      try {
        const snapshot = await this.planManagementService.getEntitlementSnapshot(reference.planKey);
        tierRank = snapshot.tierRank;
      } catch {
        // Plan lookup is best-effort — targeting rules keyed on tier simply won't match if unavailable.
      }
      return { planKey: reference.planKey, tierRank };
    } catch (error) {
      this.logger.warn(`Failed to resolve plan context for workspace '${context.workspaceId}': ${(error as Error).message}`);
      return { planKey: null, tierRank: null };
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — shared helpers
  // ══════════════════════════════════════════════════════════════════

  private async transitionDefinition(
    definition: IFeatureFlagDefinition,
    to: FeatureFlagDefinitionStatus,
    userId: string,
    changeType: FeatureFlagChangeType,
    event: FeatureFlagEvent,
    reason?: string,
    workspaceId?: string,
  ): Promise<IFeatureFlagDefinition> {
    if (!DEFINITION_TRANSITIONS[definition.status]?.includes(to)) {
      throw new FeatureFlagInvalidStateTransitionException(definition.status, to);
    }

    const updated = await this.repository.updateDefinition(definition.key, { status: to });
    this.cache.invalidateFlag(definition.key);

    await this.recordHistory(FeatureFlagHistoryEntityType.DEFINITION, updated.id, definition.key, null, changeType, definition.status, to, userId === 'system' ? null : userId, this.sanitizeDefinition(updated), reason);
    await this.recordAudit(
      workspaceId ?? 'system',
      userId,
      `feature-flags.definition.${changeType.toLowerCase()}`,
      AuditActionCategory.UPDATE,
      definition.key,
      AuditRiskLevel.SUSPICIOUS,
    );
    await this.publishEvent(event, definition.key, updated.id, null, userId === 'system' ? undefined : userId, reason ? { reason } : undefined);
    return updated;
  }

  private async transitionOverride(
    override: IFeatureFlagOverride,
    to: FeatureFlagOverrideStatus,
    userId: string,
    changeType: FeatureFlagChangeType,
    event: FeatureFlagEvent,
    reason?: string,
  ): Promise<IFeatureFlagOverride> {
    const allowed: Record<FeatureFlagOverrideStatus, FeatureFlagOverrideStatus[]> = {
      [FeatureFlagOverrideStatus.ACTIVE]: [FeatureFlagOverrideStatus.DISABLED, FeatureFlagOverrideStatus.ARCHIVED],
      [FeatureFlagOverrideStatus.DISABLED]: [FeatureFlagOverrideStatus.ACTIVE, FeatureFlagOverrideStatus.ARCHIVED],
      [FeatureFlagOverrideStatus.ARCHIVED]: [],
    };
    if (!allowed[override.status]?.includes(to)) {
      throw new FeatureFlagInvalidStateTransitionException(override.status, to);
    }

    const updated = await this.repository.updateOverride(override.id, { status: to });
    this.cache.invalidateFlag(override.flagKey);

    await this.recordHistory(FeatureFlagHistoryEntityType.OVERRIDE, override.id, override.flagKey, override.workspaceId, changeType, override.status, to, userId === 'system' ? null : userId, this.sanitizeOverride(updated), reason);
    await this.recordAudit(
      override.workspaceId ?? override.organizationId ?? 'unknown',
      userId,
      `feature-flags.override.${changeType.toLowerCase()}`,
      AuditActionCategory.UPDATE,
      override.id,
      AuditRiskLevel.SUSPICIOUS,
    );
    await this.publishEvent(event, override.flagKey, override.id, override.workspaceId, userId === 'system' ? undefined : userId, reason ? { reason } : undefined);
    return updated;
  }

  private async assertValidGraph(key: string, dependencies: string[], mutuallyExclusiveWith: string[]): Promise<void> {
    const conflict = findDependencyConflict(dependencies, mutuallyExclusiveWith);
    if (conflict) {
      throw new FeatureFlagConflictingRuleException(`Flag cannot both depend on and be mutually exclusive with '${conflict}'`);
    }
    if (dependencies.length === 0) {
      return;
    }
    const allNodes = await this.repository.findAllDefinitionKeysAndDependencies();
    if (wouldCreateCycle(key, dependencies, allNodes)) {
      throw new FeatureFlagCircularDependencyException(key);
    }
  }

  private assertValidOverrideDefinition(dto: CreateFeatureFlagOverrideDto): void {
    if (dto.scope === FeatureFlagScopeType.ORGANIZATION && !dto.organizationId) {
      throw new FeatureFlagInvalidTargetingException('ORGANIZATION-scoped overrides require organizationId');
    }
    if (dto.scope === FeatureFlagScopeType.PLAN && !dto.planKey) {
      throw new FeatureFlagInvalidTargetingException('PLAN-scoped overrides require planKey');
    }
    if (dto.scope === FeatureFlagScopeType.ENVIRONMENT && !dto.environment) {
      throw new FeatureFlagInvalidTargetingException('ENVIRONMENT-scoped overrides require environment');
    }
    if (dto.scope === FeatureFlagScopeType.USER && !dto.targetUserId) {
      throw new FeatureFlagInvalidTargetingException('USER-scoped overrides require targetUserId');
    }
  }

  private async assertCanManage(workspaceId: string, userId: string, userRole: string): Promise<void> {
    if (FEATURE_FLAG_MANAGE_ROLES.includes(userRole)) {
      return;
    }
    const hasGranularRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'ADMIN');
    if (!hasGranularRole) {
      throw new FeatureFlagAccessDeniedException();
    }
  }

  private async getDefinitionOrThrow(key: string): Promise<IFeatureFlagDefinition> {
    const definition = await this.repository.findDefinitionByKey(key);
    if (!definition) {
      throw new FeatureFlagNotFoundException(key);
    }
    return definition;
  }

  private async getVisibleOverrideOrThrow(id: string, workspaceId: string, organizationId?: string): Promise<IFeatureFlagOverride> {
    const override = await this.repository.findOverrideById(id);
    const visible = !!override && (override.workspaceId === workspaceId || (!!organizationId && override.organizationId === organizationId));
    if (!override || !visible) {
      throw new FeatureFlagOverrideNotFoundException(id);
    }
    return override;
  }

  /** Definition snapshots have no secret material, but stay consistent with this codebase's "sanitize before history" convention. */
  private sanitizeDefinition(definition: IFeatureFlagDefinition): Record<string, unknown> {
    return { ...definition };
  }

  private sanitizeOverride(override: IFeatureFlagOverride): Record<string, unknown> {
    return { ...override };
  }

  private async recordHistory(
    entityType: FeatureFlagHistoryEntityType,
    entityId: string,
    flagKey: string,
    workspaceId: string | null,
    changeType: FeatureFlagChangeType,
    fromStatus: string | null,
    toStatus: string | null,
    changedBy: string | null,
    snapshot: Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    await this.repository.createHistory({ entityType, entityId, flagKey, workspaceId, changeType, fromStatus, toStatus, reason: reason ?? null, changedBy, snapshot: snapshot as any });
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
      module: FEATURE_FLAGS_MODULE,
      entityType: 'FeatureFlag',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
      riskLevel,
    });
  }

  private async publishEvent(
    event: FeatureFlagEvent,
    flagKey: string,
    entityId?: string,
    workspaceId?: string | null,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({ event, flagKey, entityId, workspaceId, actorId, metadata });
  }
}
