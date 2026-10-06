import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SettingsService } from '@modules/settings/settings.service';
import { SettingDefinitionAlreadyExistsException } from '@modules/settings/exceptions/settings.exceptions';
import { ISettingDefinition, ISettingValue, IResolvedSetting, SettingScope } from '@modules/settings/interfaces';
import {
  CreateSettingValueDto,
  SettingDefinitionFilterDto,
  PaginatedSettingDefinitionResponseDto,
} from '@modules/settings/dto';
import {
  USER_PREFERENCES_DEFINITIONS,
  USER_PREFERENCES_FIELD_KEY_MAP,
  USER_PREFERENCES_MODULE,
  UserPreferencesCategory,
} from './constants';
import { BulkUpdatePreferencesDto } from './dto';
import {
  UserPreferenceNotFoundException,
  UserPreferenceNotConfiguredException,
} from './exceptions/user-preferences.exceptions';

/**
 * UserPreferencesService — a domain-shaped facade over the shared Settings
 * Framework (`@modules/settings`), mirroring `OrganizationSettingsService`'s
 * approach. Owns the user-preferences catalog (registered on startup) and
 * translates friendly field names to framework definition keys. Every
 * definition here is USER-scope only — preferences are inherently personal,
 * so all reads/writes are pinned to the authenticated caller's own
 * workspace+user identity; nothing else can be addressed. All storage,
 * validation, versioning, precedence resolution, caching and lifecycle
 * events stay entirely inside `SettingsService`.
 */
@Injectable()
export class UserPreferencesService implements OnModuleInit {
  private readonly logger = new Logger(UserPreferencesService.name);

  constructor(private readonly settingsService: SettingsService) {}

  async onModuleInit(): Promise<void> {
    for (const spec of USER_PREFERENCES_DEFINITIONS) {
      try {
        await this.settingsService.createDefinition(UserRole.OWNER, spec);
      } catch (error) {
        if (!(error instanceof SettingDefinitionAlreadyExistsException)) {
          this.logger.warn(
            `Failed to register user-preferences definition '${spec.key}': ${(error as Error).message}`,
          );
        }
      }
    }
  }

  // ── Category read/write ──────────────────────────────────────────────

  async getCategory(
    workspaceId: string,
    userId: string,
    category: UserPreferencesCategory,
  ): Promise<Record<string, IResolvedSetting>> {
    return this.settingsService.resolveMany(
      { workspaceId, userId },
      { category, moduleKey: USER_PREFERENCES_MODULE },
    );
  }

  async updateCategory(
    workspaceId: string,
    userId: string,
    userRole: string,
    category: UserPreferencesCategory,
    fields: Record<string, unknown>,
  ): Promise<ISettingValue[]> {
    const fieldMap = USER_PREFERENCES_FIELD_KEY_MAP[category];
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
        scope: SettingScope.USER,
        value,
        changeReason,
      } as CreateSettingValueDto);
    }

    if (items.length === 0) {
      return [];
    }

    return this.settingsService.bulkUpdate(workspaceId, userId, userRole, { items });
  }

  /** Cross-category bulk update — "bulk preference changes". Each provided section is funneled through `updateCategory`. */
  async updateAll(
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: BulkUpdatePreferencesDto,
  ): Promise<ISettingValue[]> {
    const sections: Array<[UserPreferencesCategory, Record<string, unknown> | undefined]> = [
      [UserPreferencesCategory.DISPLAY, dto.display as unknown as Record<string, unknown>],
      [UserPreferencesCategory.NOTIFICATIONS, dto.notifications as unknown as Record<string, unknown>],
      [UserPreferencesCategory.WORKSPACE_VIEW, dto.workspaceView as unknown as Record<string, unknown>],
      [UserPreferencesCategory.DEFAULTS, dto.defaults as unknown as Record<string, unknown>],
      [UserPreferencesCategory.APPEARANCE, dto.appearance as unknown as Record<string, unknown>],
      [UserPreferencesCategory.AI, dto.ai as unknown as Record<string, unknown>],
    ];

    const results: ISettingValue[] = [];
    for (const [category, fields] of sections) {
      if (!fields) {
        continue;
      }
      results.push(...(await this.updateCategory(workspaceId, userId, userRole, category, fields)));
    }
    return results;
  }

  // ── Definitions (search/filter/retrieve, scoped to this module's namespace) ──

  async getDefinition(key: string): Promise<ISettingDefinition> {
    const definition = await this.settingsService.findDefinition(key);
    if (definition.module !== USER_PREFERENCES_MODULE) {
      throw new UserPreferenceNotFoundException(key);
    }
    return definition;
  }

  async listDefinitions(filter: SettingDefinitionFilterDto): Promise<PaginatedSettingDefinitionResponseDto> {
    return this.settingsService.findAllDefinitions({ ...filter, module: USER_PREFERENCES_MODULE });
  }

  // ── Single-key resolution ────────────────────────────────────────────

  async resolveKey(workspaceId: string, userId: string, key: string): Promise<IResolvedSetting> {
    await this.getDefinition(key);
    return this.settingsService.resolve({ workspaceId, userId }, key);
  }

  // ── Reset / history by key ───────────────────────────────────────────

  async resetByKey(workspaceId: string, userId: string, userRole: string, key: string): Promise<ISettingValue> {
    const value = await this.findValueForKey(workspaceId, userId, key);
    return this.settingsService.resetValue(value.id, workspaceId, userId, userRole);
  }

  async getHistoryByKey(workspaceId: string, userId: string, key: string): Promise<unknown[]> {
    const value = await this.findValueForKey(workspaceId, userId, key);
    return this.settingsService.getHistory(value.id, workspaceId);
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  /** USER-scope values from other users in the same workspace can share a scopeKey namespace only per-user, but `findAll` isn't userId-filterable, so isolation is enforced here. */
  private async findValueForKey(workspaceId: string, userId: string, key: string): Promise<ISettingValue> {
    await this.getDefinition(key);

    const { data } = await this.settingsService.findAll(workspaceId, {
      definitionKey: key,
      scope: SettingScope.USER,
      limit: 200,
      page: 1,
    });

    const match = (data as unknown as ISettingValue[]).find((v) => v.userId === userId);
    if (!match) {
      throw new UserPreferenceNotConfiguredException(key);
    }
    return match;
  }
}
