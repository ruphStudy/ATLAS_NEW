import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SettingsService } from '@modules/settings/settings.service';
import { SettingDefinitionAlreadyExistsException } from '@modules/settings/exceptions/settings.exceptions';
import {
  ISettingDefinition,
  ISettingValue,
  IResolvedSetting,
  SettingScope,
} from '@modules/settings/interfaces';
import {
  CreateSettingValueDto,
  SettingDefinitionFilterDto,
  RollbackSettingValueDto,
  PaginatedSettingDefinitionResponseDto,
} from '@modules/settings/dto';
import {
  ORGANIZATION_SETTINGS_DEFINITIONS,
  ORGANIZATION_SETTINGS_FIELD_KEY_MAP,
  ORGANIZATION_SETTINGS_MODULE,
  OrganizationSettingsCategory,
} from './constants';
import {
  OrganizationSettingNotFoundException,
  OrganizationSettingNotConfiguredException,
} from './exceptions/organization-settings.exceptions';

/**
 * OrganizationSettingsService — a domain-shaped facade over the shared
 * Settings Framework (`@modules/settings`). Owns the organization-settings
 * catalog (registered on startup) and translates friendly field names
 * (name, timezone, approvalThreshold, ...) to framework definition keys.
 * All storage, validation, versioning, precedence resolution and caching
 * stay entirely inside `SettingsService` — nothing is duplicated here.
 */
@Injectable()
export class OrganizationSettingsService implements OnModuleInit {
  private readonly logger = new Logger(OrganizationSettingsService.name);

  constructor(private readonly settingsService: SettingsService) {}

  async onModuleInit(): Promise<void> {
    for (const spec of ORGANIZATION_SETTINGS_DEFINITIONS) {
      try {
        await this.settingsService.createDefinition(UserRole.OWNER, spec);
      } catch (error) {
        if (!(error instanceof SettingDefinitionAlreadyExistsException)) {
          this.logger.warn(
            `Failed to register organization-settings definition '${spec.key}': ${(error as Error).message}`,
          );
        }
      }
    }
  }

  // ── Category read/write ──────────────────────────────────────────────

  async getCategory(
    workspaceId: string,
    userId: string,
    category: OrganizationSettingsCategory,
  ): Promise<Record<string, IResolvedSetting>> {
    return this.settingsService.resolveMany(
      { workspaceId, userId },
      { category, moduleKey: ORGANIZATION_SETTINGS_MODULE },
    );
  }

  async updateCategory(
    workspaceId: string,
    userId: string,
    userRole: string,
    category: OrganizationSettingsCategory,
    fields: Record<string, unknown>,
    scope: SettingScope = SettingScope.WORKSPACE,
    organizationId?: string,
  ): Promise<ISettingValue[]> {
    const fieldMap = ORGANIZATION_SETTINGS_FIELD_KEY_MAP[category];
    const changeReason = fields.changeReason as string | undefined;

    const items: CreateSettingValueDto[] = [];
    for (const [field, value] of Object.entries(fields)) {
      if (field === 'changeReason' || value === undefined) {
        continue;
      }
      const definitionKey = fieldMap[field];
      if (!definitionKey) {
        continue;
      }
      items.push({
        definitionKey,
        scope,
        organizationId: scope === SettingScope.ORGANIZATION ? organizationId : undefined,
        value,
        changeReason,
      } as CreateSettingValueDto);
    }

    if (items.length === 0) {
      return [];
    }

    return this.settingsService.bulkUpdate(workspaceId, userId, userRole, { items });
  }

  // ── Definitions (search/filter/retrieve, scoped to this module's namespace) ──

  async getDefinition(key: string): Promise<ISettingDefinition> {
    const definition = await this.settingsService.findDefinition(key);
    if (definition.module !== ORGANIZATION_SETTINGS_MODULE) {
      throw new OrganizationSettingNotFoundException(key);
    }
    return definition;
  }

  async listDefinitions(filter: SettingDefinitionFilterDto): Promise<PaginatedSettingDefinitionResponseDto> {
    return this.settingsService.findAllDefinitions({ ...filter, module: ORGANIZATION_SETTINGS_MODULE });
  }

  // ── Single-key resolution ────────────────────────────────────────────

  async resolveKey(workspaceId: string, userId: string, key: string): Promise<IResolvedSetting> {
    await this.getDefinition(key);
    return this.settingsService.resolve({ workspaceId, userId }, key);
  }

  // ── Lifecycle by key (looks up the underlying value id, then delegates) ──

  async publishByKey(
    workspaceId: string,
    userId: string,
    userRole: string,
    key: string,
    scope: SettingScope,
    organizationId?: string,
  ): Promise<ISettingValue> {
    const value = await this.findValueForKey(workspaceId, key, scope, organizationId);
    return this.settingsService.publishValue(value.id, workspaceId, userId, userRole);
  }

  async resetByKey(
    workspaceId: string,
    userId: string,
    userRole: string,
    key: string,
    scope: SettingScope,
    organizationId?: string,
  ): Promise<ISettingValue> {
    const value = await this.findValueForKey(workspaceId, key, scope, organizationId);
    return this.settingsService.resetValue(value.id, workspaceId, userId, userRole);
  }

  async rollbackByKey(
    workspaceId: string,
    userId: string,
    userRole: string,
    key: string,
    scope: SettingScope,
    organizationId: string | undefined,
    dto: RollbackSettingValueDto,
  ): Promise<ISettingValue> {
    const value = await this.findValueForKey(workspaceId, key, scope, organizationId);
    return this.settingsService.rollbackValue(value.id, workspaceId, userId, userRole, dto);
  }

  async getHistoryByKey(
    workspaceId: string,
    key: string,
    scope: SettingScope,
    organizationId?: string,
  ): Promise<unknown[]> {
    const value = await this.findValueForKey(workspaceId, key, scope, organizationId);
    return this.settingsService.getHistory(value.id, workspaceId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async findValueForKey(
    workspaceId: string,
    key: string,
    scope: SettingScope,
    organizationId?: string,
  ): Promise<ISettingValue> {
    await this.getDefinition(key);

    const { data } = await this.settingsService.findAll(workspaceId, {
      definitionKey: key,
      scope,
      limit: 50,
      page: 1,
    });

    const match = (data as unknown as ISettingValue[]).find(
      (v) => scope !== SettingScope.ORGANIZATION || !organizationId || v.organizationId === organizationId,
    );

    if (!match) {
      throw new OrganizationSettingNotConfiguredException(key);
    }
    return match;
  }
}
