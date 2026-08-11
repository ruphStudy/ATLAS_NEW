import { Injectable, Logger } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';
import { SettingsCacheService } from './settings-cache.service';
import { SettingsEventQueue } from './jobs';
import { buildScopeKey } from './scope-key.util';
import {
  CreateSettingDefinitionDto,
  UpdateSettingDefinitionDto,
  SettingDefinitionFilterDto,
  CreateSettingValueDto,
  UpdateSettingValueDto,
  SettingValueFilterDto,
  RollbackSettingValueDto,
  ResolveSettingsQueryDto,
  BulkUpdateSettingsDto,
  PaginatedSettingDefinitionResponseDto,
  PaginatedSettingValueResponseDto,
} from './dto';
import {
  ISettingDefinition,
  ISettingValue,
  ISettingValueHistory,
  SettingScope,
  SettingValueType,
  SettingDefinitionStatus,
  SettingValueStatus,
  SettingsEvent,
  ISettingsResolutionContext,
  IResolvedSetting,
  SETTING_SCOPE_PRECEDENCE,
} from './interfaces';
import {
  SettingDefinitionNotFoundException,
  SettingDefinitionAlreadyExistsException,
  SettingValueNotFoundException,
  SettingValueAlreadyExistsException,
  SettingScopeNotAllowedException,
  SettingInvalidValueException,
  SettingInvalidStateTransitionException,
  SettingAccessDeniedException,
  SettingDependencyNotSatisfiedException,
  SettingHistoryNotFoundException,
} from './exceptions/settings.exceptions';
import {
  SETTINGS_DEFINITION_MANAGE_ROLES,
  SETTINGS_GLOBAL_SCOPE_ROLES,
  SETTINGS_WORKSPACE_SCOPE_ROLES,
  SETTING_VALUE_ALLOWED_TRANSITIONS,
} from './constants';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly repository: SettingsRepository,
    private readonly cache: SettingsCacheService,
    private readonly eventQueue: SettingsEventQueue,
  ) {}

  // ── Definitions ────────────────────────────────────────────────────

  async createDefinition(userRole: string, dto: CreateSettingDefinitionDto): Promise<ISettingDefinition> {
    this.assertCanManageDefinitions(userRole);

    const existing = await this.repository.findDefinitionByKey(dto.key);
    if (existing) {
      throw new SettingDefinitionAlreadyExistsException(dto.key);
    }

    if (dto.valueType === SettingValueType.ENUM && (!dto.enumOptions || dto.enumOptions.length === 0)) {
      throw new SettingInvalidValueException('enumOptions is required when valueType is ENUM');
    }

    const definition = await this.repository.createDefinition({
      key: dto.key,
      category: dto.category,
      label: dto.label,
      description: dto.description,
      valueType: dto.valueType,
      defaultValue: dto.defaultValue ?? null,
      enumOptions: dto.enumOptions ?? [],
      allowedScopes: dto.allowedScopes,
      validationRules: dto.validationRules ?? null,
      dependencies: dto.dependencies ?? null,
      module: dto.module,
      isSecretRef: dto.isSecretRef ?? dto.valueType === SettingValueType.SECRET_REF,
      visibilityCondition: dto.visibilityCondition ?? null,
      status: SettingDefinitionStatus.ACTIVE,
    });

    await this.publishEvent(SettingsEvent.DEFINITION_CREATED, definition.key);
    return definition;
  }

  async updateDefinition(
    key: string,
    userRole: string,
    dto: UpdateSettingDefinitionDto,
  ): Promise<ISettingDefinition> {
    this.assertCanManageDefinitions(userRole);
    await this.getDefinitionOrThrow(key);

    const updated = await this.repository.updateDefinition(key, {
      label: dto.label,
      description: dto.description,
      defaultValue: dto.defaultValue,
      enumOptions: dto.enumOptions,
      allowedScopes: dto.allowedScopes,
      validationRules: dto.validationRules,
      dependencies: dto.dependencies,
      visibilityCondition: dto.visibilityCondition,
    } as Partial<ISettingDefinition>);

    this.cache.invalidateAll();
    await this.publishEvent(SettingsEvent.DEFINITION_UPDATED, key);
    return updated;
  }

  async findDefinition(key: string): Promise<ISettingDefinition> {
    return this.getDefinitionOrThrow(key);
  }

  async findAllDefinitions(filter: SettingDefinitionFilterDto): Promise<PaginatedSettingDefinitionResponseDto> {
    const [data, total] = await this.repository.findAllDefinitions(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async deprecateDefinition(key: string, userRole: string): Promise<ISettingDefinition> {
    this.assertCanManageDefinitions(userRole);
    await this.getDefinitionOrThrow(key);

    const updated = await this.repository.updateDefinition(key, {
      status: SettingDefinitionStatus.DEPRECATED,
    } as Partial<ISettingDefinition>);

    await this.publishEvent(SettingsEvent.DEFINITION_DEPRECATED, key);
    return updated;
  }

  async archiveDefinition(key: string, userRole: string): Promise<ISettingDefinition> {
    this.assertCanManageDefinitions(userRole);
    await this.getDefinitionOrThrow(key);

    const updated = await this.repository.updateDefinition(key, {
      status: SettingDefinitionStatus.ARCHIVED,
    } as Partial<ISettingDefinition>);

    this.cache.invalidateAll();
    await this.publishEvent(SettingsEvent.DEFINITION_ARCHIVED, key);
    return updated;
  }

  // ── Values: create / read / update ──────────────────────────────────

  async createValue(
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: CreateSettingValueDto,
  ): Promise<ISettingValue> {
    const definition = await this.getDefinitionOrThrow(dto.definitionKey);

    if (!definition.allowedScopes.includes(dto.scope)) {
      throw new SettingScopeNotAllowedException(definition.key, dto.scope);
    }

    this.assertScopeRole(dto.scope, userRole);
    this.validateValue(definition, dto.value);

    const effectiveUserId = dto.scope === SettingScope.USER ? userId : undefined;
    const scopeWorkspaceId =
      dto.scope === SettingScope.GLOBAL || dto.scope === SettingScope.ORGANIZATION ? undefined : workspaceId;

    const scopeKey = buildScopeKey({
      scope: dto.scope,
      workspaceId: scopeWorkspaceId,
      organizationId: dto.organizationId,
      moduleKey: dto.moduleKey,
      userId: effectiveUserId,
    });

    const existing = await this.repository.findValueByScopeKey(dto.definitionKey, scopeKey);
    if (existing) {
      throw new SettingValueAlreadyExistsException();
    }

    const context: ISettingsResolutionContext = {
      workspaceId,
      organizationId: dto.organizationId,
      moduleKey: dto.moduleKey,
      userId: effectiveUserId,
    };
    await this.assertDependenciesSatisfied(definition, context);

    const value = await this.repository.createValue({
      definitionKey: dto.definitionKey,
      scope: dto.scope,
      workspaceId: scopeWorkspaceId ?? null,
      organizationId: dto.organizationId ?? null,
      moduleKey: dto.moduleKey ?? null,
      userId: effectiveUserId ?? null,
      scopeKey,
      value: dto.value,
      status: SettingValueStatus.DRAFT,
      version: 1,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      changeReason: dto.changeReason ?? 'Created',
      changedBy: userId,
    });

    await this.repository.createHistoryEntry({
      settingValueId: value.id,
      definitionKey: value.definitionKey,
      workspaceId: value.workspaceId,
      toValue: value.value,
      toStatus: value.status,
      version: value.version,
      changeReason: dto.changeReason ?? 'Created',
      changedBy: userId,
    });

    this.invalidateCacheForValue(value);
    await this.publishEvent(SettingsEvent.VALUE_CREATED, value.definitionKey, {
      workspaceId: value.workspaceId ?? undefined,
      scope: value.scope,
      moduleKey: value.moduleKey ?? undefined,
      userId: value.userId ?? undefined,
      actorId: userId,
    });

    return value;
  }

  async findById(id: string, workspaceId: string): Promise<ISettingValue> {
    return this.getValueOrThrow(id, workspaceId);
  }

  async findAll(workspaceId: string, filter: SettingValueFilterDto): Promise<PaginatedSettingValueResponseDto> {
    const [data, total] = await this.repository.findAll(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateValue(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: UpdateSettingValueDto,
  ): Promise<ISettingValue> {
    const value = await this.getValueOrThrow(id, workspaceId);
    this.assertCanWriteValue(value, userId, userRole);

    const definition = await this.getDefinitionOrThrow(value.definitionKey);
    if (dto.value !== undefined) {
      this.validateValue(definition, dto.value);
    }

    const newVersion = value.version + 1;
    const updated = await this.repository.updateValue(id, {
      value: dto.value ?? value.value,
      version: newVersion,
      effectiveFrom: dto.effectiveFrom !== undefined ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo !== undefined ? new Date(dto.effectiveTo) : undefined,
      changeReason: dto.changeReason ?? value.changeReason,
      changedBy: userId,
    } as Partial<ISettingValue>);

    await this.repository.createHistoryEntry({
      settingValueId: id,
      definitionKey: value.definitionKey,
      workspaceId: value.workspaceId,
      fromValue: value.value,
      toValue: updated.value,
      fromStatus: value.status,
      toStatus: updated.status,
      version: newVersion,
      changeReason: dto.changeReason,
      changedBy: userId,
    });

    this.invalidateCacheForValue(updated);
    await this.publishEvent(SettingsEvent.VALUE_UPDATED, value.definitionKey, {
      workspaceId: value.workspaceId ?? undefined,
      scope: value.scope,
      moduleKey: value.moduleKey ?? undefined,
      userId: value.userId ?? undefined,
      actorId: userId,
    });

    return updated;
  }

  // ── Values: lifecycle transitions ───────────────────────────────────

  async publishValue(id: string, workspaceId: string, userId: string, userRole: string): Promise<ISettingValue> {
    return this.transition(id, workspaceId, userId, userRole, SettingValueStatus.PUBLISHED, {
      event: SettingsEvent.VALUE_PUBLISHED,
      reason: 'Published',
    });
  }

  async enableValue(id: string, workspaceId: string, userId: string, userRole: string): Promise<ISettingValue> {
    return this.transition(id, workspaceId, userId, userRole, SettingValueStatus.PUBLISHED, {
      event: SettingsEvent.VALUE_ENABLED,
      reason: 'Enabled',
    });
  }

  async disableValue(id: string, workspaceId: string, userId: string, userRole: string): Promise<ISettingValue> {
    return this.transition(id, workspaceId, userId, userRole, SettingValueStatus.DISABLED, {
      event: SettingsEvent.VALUE_DISABLED,
      reason: 'Disabled',
    });
  }

  async archiveValue(id: string, workspaceId: string, userId: string, userRole: string): Promise<ISettingValue> {
    return this.transition(id, workspaceId, userId, userRole, SettingValueStatus.ARCHIVED, {
      event: SettingsEvent.VALUE_ARCHIVED,
      reason: 'Archived',
    });
  }

  /** "Reset" removes the override from resolution by archiving it — lower-precedence values or the definition default take over. */
  async resetValue(id: string, workspaceId: string, userId: string, userRole: string): Promise<ISettingValue> {
    return this.transition(id, workspaceId, userId, userRole, SettingValueStatus.ARCHIVED, {
      event: SettingsEvent.VALUE_RESET,
      reason: 'Reset to default',
    });
  }

  async rollbackValue(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: RollbackSettingValueDto,
  ): Promise<ISettingValue> {
    const value = await this.getValueOrThrow(id, workspaceId);
    this.assertCanWriteValue(value, userId, userRole);

    const historyEntry = await this.repository.findHistoryById(dto.historyId);
    if (!historyEntry || historyEntry.settingValueId !== id) {
      throw new SettingHistoryNotFoundException(dto.historyId);
    }

    const newVersion = value.version + 1;
    const updated = await this.repository.updateValue(id, {
      value: historyEntry.toValue,
      status: historyEntry.toStatus,
      version: newVersion,
      changeReason: dto.changeReason ?? `Rolled back to version ${historyEntry.version}`,
      changedBy: userId,
    } as Partial<ISettingValue>);

    await this.repository.createHistoryEntry({
      settingValueId: id,
      definitionKey: value.definitionKey,
      workspaceId: value.workspaceId,
      fromValue: value.value,
      toValue: updated.value,
      fromStatus: value.status,
      toStatus: updated.status,
      version: newVersion,
      changeReason: dto.changeReason ?? `Rolled back to version ${historyEntry.version}`,
      changedBy: userId,
    });

    this.invalidateCacheForValue(updated);
    await this.publishEvent(SettingsEvent.VALUE_ROLLED_BACK, value.definitionKey, {
      workspaceId: value.workspaceId ?? undefined,
      scope: value.scope,
      moduleKey: value.moduleKey ?? undefined,
      userId: value.userId ?? undefined,
      actorId: userId,
    });

    return updated;
  }

  async getHistory(id: string, workspaceId: string): Promise<ISettingValueHistory[]> {
    await this.getValueOrThrow(id, workspaceId);
    return this.repository.findHistory(id);
  }

  // ── Bulk ─────────────────────────────────────────────────────────────

  async bulkUpdate(
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: BulkUpdateSettingsDto,
  ): Promise<ISettingValue[]> {
    const results: ISettingValue[] = [];

    for (const item of dto.items) {
      const definition = await this.getDefinitionOrThrow(item.definitionKey);
      if (!definition.allowedScopes.includes(item.scope)) {
        throw new SettingScopeNotAllowedException(definition.key, item.scope);
      }
      this.assertScopeRole(item.scope, userRole);

      const effectiveUserId = item.scope === SettingScope.USER ? userId : undefined;
      const scopeWorkspaceId =
        item.scope === SettingScope.GLOBAL || item.scope === SettingScope.ORGANIZATION ? undefined : workspaceId;
      const scopeKey = buildScopeKey({
        scope: item.scope,
        workspaceId: scopeWorkspaceId,
        organizationId: item.organizationId,
        moduleKey: item.moduleKey,
        userId: effectiveUserId,
      });

      const existing = await this.repository.findValueByScopeKey(item.definitionKey, scopeKey);
      if (existing) {
        results.push(
          await this.updateValue(existing.id, workspaceId, userId, userRole, {
            value: item.value,
            effectiveFrom: item.effectiveFrom,
            effectiveTo: item.effectiveTo,
            changeReason: item.changeReason ?? 'Bulk update',
          }),
        );
      } else {
        results.push(await this.createValue(workspaceId, userId, userRole, item));
      }
    }

    return results;
  }

  // ── Resolution ─────────────────────────────────────────────────────

  async resolve(context: ISettingsResolutionContext, definitionKey: string): Promise<IResolvedSetting> {
    const cacheKey = this.cache.buildKey(context.workspaceId, context.moduleKey, context.userId, definitionKey);
    const cached = this.cache.get(cacheKey) as IResolvedSetting | undefined;
    if (cached) {
      return cached;
    }

    const definition = await this.getDefinitionOrThrow(definitionKey);
    const scopeKeys = this.buildResolutionScopeKeys(context);
    const candidates = await this.repository.findResolutionCandidates(definitionKey, scopeKeys, new Date());

    let winner: ISettingValue | undefined;
    let winnerRank = -1;
    for (const candidate of candidates) {
      const rank = SETTING_SCOPE_PRECEDENCE.indexOf(candidate.scope);
      if (rank > winnerRank) {
        winner = candidate;
        winnerRank = rank;
      }
    }

    const resolved: IResolvedSetting = winner
      ? { key: definitionKey, value: winner.value, source: winner.scope, valueType: definition.valueType }
      : { key: definitionKey, value: definition.defaultValue ?? null, source: 'DEFAULT', valueType: definition.valueType };

    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  async resolveMany(
    context: ISettingsResolutionContext,
    query: ResolveSettingsQueryDto,
  ): Promise<Record<string, IResolvedSetting>> {
    const definitions = query.keys?.length
      ? await this.repository.findDefinitionsByKeys(query.keys)
      : (
          await this.repository.findAllDefinitions({
            category: query.category,
            module: query.moduleKey,
            status: SettingDefinitionStatus.ACTIVE,
            limit: 200,
            page: 1,
          })
        )[0];

    const result: Record<string, IResolvedSetting> = {};
    for (const definition of definitions) {
      result[definition.key] = await this.resolve(context, definition.key);
    }
    return result;
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async getDefinitionOrThrow(key: string): Promise<ISettingDefinition> {
    const definition = await this.repository.findDefinitionByKey(key);
    if (!definition) {
      throw new SettingDefinitionNotFoundException(key);
    }
    return definition;
  }

  private async getValueOrThrow(id: string, workspaceId: string): Promise<ISettingValue> {
    const value = await this.repository.findValueById(id);
    if (!value || (value.workspaceId && value.workspaceId !== workspaceId)) {
      throw new SettingValueNotFoundException(id);
    }
    return value;
  }

  private async transition(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    to: SettingValueStatus,
    options: { event: SettingsEvent; reason: string },
  ): Promise<ISettingValue> {
    const value = await this.getValueOrThrow(id, workspaceId);
    this.assertCanWriteValue(value, userId, userRole);

    if (!SETTING_VALUE_ALLOWED_TRANSITIONS[value.status]?.includes(to)) {
      throw new SettingInvalidStateTransitionException(value.status, to);
    }

    const updated = await this.repository.updateValue(id, {
      status: to,
      changedBy: userId,
    } as Partial<ISettingValue>);

    await this.repository.createHistoryEntry({
      settingValueId: id,
      definitionKey: value.definitionKey,
      workspaceId: value.workspaceId,
      fromValue: value.value,
      toValue: value.value,
      fromStatus: value.status,
      toStatus: to,
      version: value.version,
      changeReason: options.reason,
      changedBy: userId,
    });

    this.invalidateCacheForValue(updated);
    await this.publishEvent(options.event, value.definitionKey, {
      workspaceId: value.workspaceId ?? undefined,
      scope: value.scope,
      moduleKey: value.moduleKey ?? undefined,
      userId: value.userId ?? undefined,
      actorId: userId,
    });

    return updated;
  }

  private assertCanManageDefinitions(userRole: string): void {
    if (!SETTINGS_DEFINITION_MANAGE_ROLES.includes(userRole)) {
      throw new SettingAccessDeniedException();
    }
  }

  private assertScopeRole(scope: SettingScope, userRole: string): void {
    if (scope === SettingScope.GLOBAL || scope === SettingScope.ORGANIZATION) {
      if (!SETTINGS_GLOBAL_SCOPE_ROLES.includes(userRole)) {
        throw new SettingAccessDeniedException();
      }
      return;
    }
    if (scope === SettingScope.WORKSPACE || scope === SettingScope.MODULE) {
      if (!SETTINGS_WORKSPACE_SCOPE_ROLES.includes(userRole)) {
        throw new SettingAccessDeniedException();
      }
    }
    // USER scope is always self-service — no role restriction.
  }

  private assertCanWriteValue(value: ISettingValue, userId: string, userRole: string): void {
    if (value.scope === SettingScope.GLOBAL || value.scope === SettingScope.ORGANIZATION) {
      if (!SETTINGS_GLOBAL_SCOPE_ROLES.includes(userRole)) {
        throw new SettingAccessDeniedException();
      }
      return;
    }
    if (value.scope === SettingScope.WORKSPACE || value.scope === SettingScope.MODULE) {
      if (!SETTINGS_WORKSPACE_SCOPE_ROLES.includes(userRole)) {
        throw new SettingAccessDeniedException();
      }
      return;
    }
    if (value.userId !== userId && !SETTINGS_WORKSPACE_SCOPE_ROLES.includes(userRole)) {
      throw new SettingAccessDeniedException();
    }
  }

  private validateValue(definition: ISettingDefinition, value: unknown): void {
    switch (definition.valueType) {
      case SettingValueType.STRING:
        if (typeof value !== 'string') throw new SettingInvalidValueException('expected a string');
        break;
      case SettingValueType.NUMBER:
        if (typeof value !== 'number' || Number.isNaN(value)) {
          throw new SettingInvalidValueException('expected a number');
        }
        break;
      case SettingValueType.BOOLEAN:
        if (typeof value !== 'boolean') throw new SettingInvalidValueException('expected a boolean');
        break;
      case SettingValueType.ENUM:
        if (typeof value !== 'string' || !definition.enumOptions.includes(value)) {
          throw new SettingInvalidValueException(`expected one of [${definition.enumOptions.join(', ')}]`);
        }
        break;
      case SettingValueType.LIST:
        if (!Array.isArray(value)) throw new SettingInvalidValueException('expected a list');
        break;
      case SettingValueType.SECRET_REF:
        if (typeof value !== 'string' || value.length === 0) {
          throw new SettingInvalidValueException(
            'a SECRET_REF value must be a non-empty string reference to an existing credential — never a raw secret',
          );
        }
        break;
      case SettingValueType.JSON:
        if (value === undefined) throw new SettingInvalidValueException('expected a JSON value');
        break;
    }

    const rules = definition.validationRules as Record<string, unknown> | undefined;
    if (!rules) {
      return;
    }
    if (typeof rules.min === 'number' && typeof value === 'number' && value < rules.min) {
      throw new SettingInvalidValueException(`must be >= ${rules.min}`);
    }
    if (typeof rules.max === 'number' && typeof value === 'number' && value > rules.max) {
      throw new SettingInvalidValueException(`must be <= ${rules.max}`);
    }
    if (typeof rules.pattern === 'string' && typeof value === 'string' && !new RegExp(rules.pattern).test(value)) {
      throw new SettingInvalidValueException(`must match pattern ${rules.pattern}`);
    }
    const lengthed = typeof value === 'string' || Array.isArray(value) ? value : undefined;
    if (lengthed && typeof rules.minLength === 'number' && lengthed.length < rules.minLength) {
      throw new SettingInvalidValueException(`must have at least ${rules.minLength} item(s)/character(s)`);
    }
    if (lengthed && typeof rules.maxLength === 'number' && lengthed.length > rules.maxLength) {
      throw new SettingInvalidValueException(`must have at most ${rules.maxLength} item(s)/character(s)`);
    }
  }

  private async assertDependenciesSatisfied(
    definition: ISettingDefinition,
    context: ISettingsResolutionContext,
  ): Promise<void> {
    const deps = definition.dependencies as Array<{ key: string; equals: unknown }> | undefined;
    if (!deps || deps.length === 0) {
      return;
    }
    for (const dep of deps) {
      const resolved = await this.resolve(context, dep.key);
      if (resolved.value !== dep.equals) {
        throw new SettingDependencyNotSatisfiedException(dep.key);
      }
    }
  }

  private buildResolutionScopeKeys(context: ISettingsResolutionContext): string[] {
    const keys = ['GLOBAL', `WORKSPACE:${context.workspaceId}`];
    if (context.organizationId) keys.push(`ORG:${context.organizationId}`);
    if (context.moduleKey) keys.push(`MODULE:${context.workspaceId}:${context.moduleKey}`);
    if (context.userId) keys.push(`USER:${context.workspaceId}:${context.userId}`);
    return keys;
  }

  private invalidateCacheForValue(value: ISettingValue): void {
    switch (value.scope) {
      case SettingScope.GLOBAL:
      case SettingScope.ORGANIZATION:
        this.cache.invalidateAll();
        break;
      case SettingScope.WORKSPACE:
        if (value.workspaceId) this.cache.invalidateWorkspace(value.workspaceId);
        break;
      case SettingScope.MODULE:
        if (value.workspaceId && value.moduleKey) this.cache.invalidateModule(value.workspaceId, value.moduleKey);
        break;
      case SettingScope.USER:
        if (value.workspaceId && value.userId) this.cache.invalidateUser(value.workspaceId, value.userId);
        break;
    }
  }

  private async publishEvent(
    event: SettingsEvent,
    definitionKey: string,
    opts?: {
      workspaceId?: string;
      scope?: SettingScope;
      moduleKey?: string;
      userId?: string;
      actorId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.publish({ event, definitionKey, ...opts });
  }
}
