import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SettingsService } from '@modules/settings/settings.service';
import { SettingDefinitionAlreadyExistsException } from '@modules/settings/exceptions/settings.exceptions';
import { SettingScope, SettingValueType } from '@modules/settings/interfaces';
import { UserPreferencesService } from '@modules/user-preferences/user-preferences.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { ThemeManagementRepository } from './theme-management.repository';
import { ThemeCacheService } from './theme-cache.service';
import { ThemeManagementEventQueue } from './jobs';
import { buildThemeScopeKey } from './scope-key.util';
import { validateModeContrast } from './contrast.util';
import {
  CreateThemeDto,
  UpdateThemeDto,
  ThemeFilterDto,
  RollbackThemeDto,
  SetActiveThemeDto,
  ThemeTokensDto,
  PaginatedThemeResponseDto,
} from './dto';
import {
  ITheme,
  IThemeHistory,
  IThemeTokens,
  IContrastWarning,
  IEffectiveTheme,
  ThemeScope,
  ThemeStatus,
  ThemeManagementEvent,
} from './interfaces';
import {
  THEME_MANAGEMENT_MODULE,
  SYSTEM_THEME_SCOPE_KEY,
  SYSTEM_DEFAULT_THEME_KEY,
  THEME_GLOBAL_SCOPE_ROLES,
  THEME_WORKSPACE_SCOPE_ROLES,
  THEME_ALLOWED_TRANSITIONS,
  ACTIVE_THEME_KEY_SETTING,
  ACCENT_COLOR_OVERRIDE_SETTING,
  USER_THEME_MODE_SETTING,
  USER_THEME_DENSITY_SETTING,
} from './constants';
import {
  ThemeNotFoundException,
  ThemeAlreadyExistsException,
  ThemeIsSystemThemeException,
  ThemeInvalidStateTransitionException,
  ThemeAccessDeniedException,
} from './exceptions/theme-management.exceptions';

const DEFAULT_THEME_TOKENS: IThemeTokens = {
  light: {
    colors: {
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#1A1A1A',
      primary: '#2563EB',
      onPrimary: '#FFFFFF',
      secondary: '#64748B',
      onSecondary: '#FFFFFF',
      border: '#E2E8F0',
    },
  },
  dark: {
    colors: {
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F1F5F9',
      primary: '#3B82F6',
      onPrimary: '#0F172A',
      secondary: '#94A3B8',
      onSecondary: '#0F172A',
      border: '#334155',
    },
  },
};

@Injectable()
export class ThemeManagementService implements OnModuleInit {
  private readonly logger = new Logger(ThemeManagementService.name);

  constructor(
    private readonly repository: ThemeManagementRepository,
    private readonly cache: ThemeCacheService,
    private readonly settingsService: SettingsService,
    private readonly userPreferencesService: UserPreferencesService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: ThemeManagementEventQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const dto of [
      {
        key: ACTIVE_THEME_KEY_SETTING,
        category: 'THEME',
        label: 'Active theme',
        valueType: SettingValueType.STRING,
        defaultValue: SYSTEM_DEFAULT_THEME_KEY,
        allowedScopes: [SettingScope.ORGANIZATION, SettingScope.WORKSPACE],
        module: THEME_MANAGEMENT_MODULE,
      },
      {
        key: ACCENT_COLOR_OVERRIDE_SETTING,
        category: 'THEME',
        label: 'Accent color override',
        valueType: SettingValueType.STRING,
        allowedScopes: [SettingScope.ORGANIZATION, SettingScope.WORKSPACE],
        module: THEME_MANAGEMENT_MODULE,
      },
    ] as const) {
      try {
        await this.settingsService.createDefinition('OWNER', dto as any);
      } catch (error) {
        if (!(error instanceof SettingDefinitionAlreadyExistsException)) {
          this.logger.warn(`Failed to register theme-management setting '${dto.key}': ${(error as Error).message}`);
        }
      }
    }

    const existingDefault = await this.repository.findByScopeKeyAndKey(SYSTEM_THEME_SCOPE_KEY, SYSTEM_DEFAULT_THEME_KEY);
    if (!existingDefault) {
      await this.repository.create({
        workspaceId: null,
        organizationId: null,
        scopeKey: SYSTEM_THEME_SCOPE_KEY,
        scope: ThemeScope.GLOBAL,
        key: SYSTEM_DEFAULT_THEME_KEY,
        name: 'ATLAS Default',
        description: 'The built-in system default theme.',
        isSystem: true,
        isBranded: false,
        tokens: DEFAULT_THEME_TOKENS as any,
        version: 1,
        status: ThemeStatus.PUBLISHED,
        publishedAt: new Date(),
      });
    }
  }

  // ── Themes ───────────────────────────────────────────────────────

  async createTheme(workspaceId: string, userId: string, userRole: string, dto: CreateThemeDto): Promise<ITheme> {
    const scope = dto.scope ?? ThemeScope.WORKSPACE;
    this.assertScopeRole(scope, userRole);

    const scopeWorkspaceId = scope === ThemeScope.WORKSPACE ? workspaceId : undefined;
    const scopeKey = buildThemeScopeKey({ scope, workspaceId: scopeWorkspaceId, organizationId: dto.organizationId });

    const existing = await this.repository.findByScopeKeyAndKey(scopeKey, dto.key);
    if (existing) {
      throw new ThemeAlreadyExistsException(dto.key);
    }

    const theme = await this.repository.create({
      workspaceId: scopeWorkspaceId ?? null,
      organizationId: scope === ThemeScope.ORGANIZATION ? dto.organizationId : null,
      scopeKey,
      scope,
      key: dto.key,
      name: dto.name,
      description: dto.description,
      isSystem: false,
      isBranded: dto.isBranded ?? false,
      logoUrl: dto.logoUrl,
      faviconUrl: dto.faviconUrl,
      accentColor: dto.accentColor,
      tokens: dto.tokens as any,
      version: 1,
      status: ThemeStatus.DRAFT,
      createdBy: userId,
    });

    await this.repository.createHistory({
      themeId: theme.id,
      workspaceId: theme.workspaceId,
      toStatus: ThemeStatus.DRAFT,
      version: 1,
      changeReason: 'Created',
      changedBy: userId,
      snapshot: theme as any,
    });

    await this.recordAudit(workspaceId, userId, 'theme-management.theme.created', AuditActionCategory.CREATE, theme.id);
    await this.publishEvent(ThemeManagementEvent.THEME_CREATED, { workspaceId, themeId: theme.id, actorId: userId });
    return theme;
  }

  async updateTheme(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateThemeDto): Promise<ITheme> {
    const theme = await this.getThemeOrThrow(id);
    this.assertCanManage(theme, workspaceId, userRole);

    const newVersion = theme.version + 1;
    const updated = await this.repository.update(id, {
      name: dto.name,
      description: dto.description,
      isBranded: dto.isBranded,
      logoUrl: dto.logoUrl,
      faviconUrl: dto.faviconUrl,
      accentColor: dto.accentColor,
      tokens: dto.tokens as any,
      version: newVersion,
    } as Partial<ITheme>);

    await this.repository.createHistory({
      themeId: id,
      workspaceId: theme.workspaceId,
      fromStatus: theme.status,
      toStatus: updated.status,
      version: newVersion,
      changeReason: dto.changeReason ?? 'Updated',
      changedBy: userId,
      snapshot: updated as any,
    });

    await this.recordAudit(workspaceId, userId, 'theme-management.theme.updated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(ThemeManagementEvent.THEME_UPDATED, { workspaceId, themeId: id, actorId: userId });
    return updated;
  }

  async publishTheme(id: string, workspaceId: string, userId: string, userRole: string): Promise<ITheme> {
    return this.transition(id, workspaceId, userId, userRole, ThemeStatus.PUBLISHED, {
      event: ThemeManagementEvent.THEME_PUBLISHED,
      reason: 'Published',
      extraFields: { publishedAt: new Date() },
    });
  }

  async archiveTheme(id: string, workspaceId: string, userId: string, userRole: string): Promise<ITheme> {
    return this.transition(id, workspaceId, userId, userRole, ThemeStatus.ARCHIVED, {
      event: ThemeManagementEvent.THEME_ARCHIVED,
      reason: 'Archived',
    });
  }

  async restoreTheme(id: string, workspaceId: string, userId: string, userRole: string): Promise<ITheme> {
    return this.transition(id, workspaceId, userId, userRole, ThemeStatus.DRAFT, {
      event: ThemeManagementEvent.THEME_RESTORED,
      reason: 'Restored',
    });
  }

  async rollbackTheme(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: RollbackThemeDto,
  ): Promise<ITheme> {
    const theme = await this.getThemeOrThrow(id);
    this.assertCanManage(theme, workspaceId, userRole);

    const historyEntry = await this.repository.findHistoryById(dto.historyId);
    if (!historyEntry || historyEntry.themeId !== id) {
      throw new ThemeNotFoundException(dto.historyId);
    }

    const snapshot = historyEntry.snapshot as Partial<ITheme>;
    const newVersion = theme.version + 1;
    const updated = await this.repository.update(id, {
      tokens: snapshot.tokens as any,
      name: snapshot.name,
      description: snapshot.description,
      isBranded: snapshot.isBranded,
      logoUrl: snapshot.logoUrl,
      faviconUrl: snapshot.faviconUrl,
      accentColor: snapshot.accentColor,
      status: historyEntry.toStatus,
      version: newVersion,
    } as Partial<ITheme>);

    await this.repository.createHistory({
      themeId: id,
      workspaceId: theme.workspaceId,
      fromStatus: theme.status,
      toStatus: updated.status,
      version: newVersion,
      changeReason: dto.changeReason ?? `Rolled back to version ${historyEntry.version}`,
      changedBy: userId,
      snapshot: updated as any,
    });

    await this.recordAudit(workspaceId, userId, 'theme-management.theme.rolled_back', AuditActionCategory.UPDATE, id);
    await this.publishEvent(ThemeManagementEvent.THEME_ROLLED_BACK, { workspaceId, themeId: id, actorId: userId });
    return updated;
  }

  async findAllThemes(workspaceId: string, filter: ThemeFilterDto): Promise<PaginatedThemeResponseDto> {
    const visibleScopeKeys = [SYSTEM_THEME_SCOPE_KEY, `WORKSPACE:${workspaceId}`];
    const [data, total] = await this.repository.findAll(visibleScopeKeys, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTheme(id: string): Promise<ITheme> {
    return this.getThemeOrThrow(id);
  }

  async getThemeHistory(id: string): Promise<IThemeHistory[]> {
    await this.getThemeOrThrow(id);
    return this.repository.findHistory(id);
  }

  // ── Validation (advisory, non-blocking) ─────────────────────────

  validateTokens(tokens: ThemeTokensDto): IContrastWarning[] {
    return [...validateModeContrast('light', tokens.light), ...validateModeContrast('dark', tokens.dark)];
  }

  // ── Active theme (ties into the Settings Framework) ──────────────

  async setActiveTheme(workspaceId: string, userId: string, userRole: string, dto: SetActiveThemeDto): Promise<void> {
    const scope = dto.scope ?? ThemeScope.WORKSPACE;
    this.assertScopeRole(scope, userRole);

    const theme = await this.findVisibleThemeByKey(workspaceId, dto.themeKey);
    if (!theme || theme.status !== ThemeStatus.PUBLISHED) {
      throw new ThemeNotFoundException(dto.themeKey);
    }

    await this.settingsService.bulkUpdate(workspaceId, userId, userRole, {
      items: [
        {
          definitionKey: ACTIVE_THEME_KEY_SETTING,
          scope: scope === ThemeScope.ORGANIZATION ? SettingScope.ORGANIZATION : SettingScope.WORKSPACE,
          organizationId: dto.organizationId,
          value: dto.themeKey,
          changeReason: 'Active theme changed',
        } as any,
      ],
    });

    this.cache.invalidateWorkspace(workspaceId);
    await this.recordAudit(workspaceId, userId, 'theme-management.active_theme.changed', AuditActionCategory.CONFIGURATION, theme.id);
    await this.publishEvent(ThemeManagementEvent.ACTIVE_THEME_CHANGED, { workspaceId, themeId: theme.id, actorId: userId });
  }

  async resolveEffectiveTheme(workspaceId: string, userId: string): Promise<IEffectiveTheme> {
    const cacheKey = this.cache.buildKey(workspaceId, userId);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const [activeThemeKeySetting, modeSetting, densitySetting] = await Promise.all([
      this.settingsService.resolve({ workspaceId, userId }, ACTIVE_THEME_KEY_SETTING),
      this.userPreferencesService.resolveKey(workspaceId, userId, USER_THEME_MODE_SETTING),
      this.userPreferencesService.resolveKey(workspaceId, userId, USER_THEME_DENSITY_SETTING),
    ]);

    const themeKey = typeof activeThemeKeySetting.value === 'string' && activeThemeKeySetting.value
      ? activeThemeKeySetting.value
      : SYSTEM_DEFAULT_THEME_KEY;

    const theme =
      (await this.findVisibleThemeByKey(workspaceId, themeKey, ThemeStatus.PUBLISHED)) ??
      (await this.findVisibleThemeByKey(workspaceId, SYSTEM_DEFAULT_THEME_KEY, ThemeStatus.PUBLISHED));
    if (!theme) {
      throw new ThemeNotFoundException(themeKey);
    }

    const result: IEffectiveTheme = {
      theme,
      mode: typeof modeSetting.value === 'string' ? modeSetting.value : 'SYSTEM',
      density: typeof densitySetting.value === 'string' ? densitySetting.value : 'COMFORTABLE',
      source: String(activeThemeKeySetting.source),
    };
    this.cache.set(cacheKey, result);
    return result;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async findVisibleThemeByKey(workspaceId: string, key: string, requireStatus?: ThemeStatus): Promise<ITheme | null> {
    for (const scopeKey of [`WORKSPACE:${workspaceId}`, SYSTEM_THEME_SCOPE_KEY]) {
      const theme = await this.repository.findByScopeKeyAndKey(scopeKey, key);
      if (theme && (!requireStatus || theme.status === requireStatus)) {
        return theme;
      }
    }
    return null;
  }

  private async getThemeOrThrow(id: string): Promise<ITheme> {
    const theme = await this.repository.findById(id);
    if (!theme) {
      throw new ThemeNotFoundException(id);
    }
    return theme;
  }

  private async transition(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    to: ThemeStatus,
    options: { event: ThemeManagementEvent; reason: string; extraFields?: Partial<ITheme> },
  ): Promise<ITheme> {
    const theme = await this.getThemeOrThrow(id);
    this.assertCanManage(theme, workspaceId, userRole);

    if (!THEME_ALLOWED_TRANSITIONS[theme.status]?.includes(to)) {
      throw new ThemeInvalidStateTransitionException(theme.status, to);
    }

    const updated = await this.repository.update(id, {
      status: to,
      ...options.extraFields,
    } as Partial<ITheme>);

    await this.repository.createHistory({
      themeId: id,
      workspaceId: theme.workspaceId,
      fromStatus: theme.status,
      toStatus: to,
      version: theme.version,
      changeReason: options.reason,
      changedBy: userId,
      snapshot: updated as any,
    });

    await this.recordAudit(workspaceId, userId, `theme-management.theme.${options.reason.toLowerCase()}`, AuditActionCategory.UPDATE, id);
    await this.publishEvent(options.event, { workspaceId, themeId: id, actorId: userId });
    return updated;
  }

  private assertScopeRole(scope: ThemeScope, userRole: string): void {
    if (scope === ThemeScope.GLOBAL || scope === ThemeScope.ORGANIZATION) {
      if (!THEME_GLOBAL_SCOPE_ROLES.includes(userRole)) {
        throw new ThemeAccessDeniedException();
      }
      return;
    }
    if (!THEME_WORKSPACE_SCOPE_ROLES.includes(userRole)) {
      throw new ThemeAccessDeniedException();
    }
  }

  private assertCanManage(theme: ITheme, workspaceId: string, userRole: string): void {
    if (theme.isSystem) {
      throw new ThemeIsSystemThemeException(theme.key);
    }
    if (theme.workspaceId && theme.workspaceId !== workspaceId) {
      throw new ThemeNotFoundException(theme.key);
    }
    this.assertScopeRole(theme.scope, userRole);
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string,
    action: string,
    actionCategory: AuditActionCategory,
    entityId: string,
  ): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory,
      module: THEME_MANAGEMENT_MODULE,
      entityType: 'Theme',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(
    event: ThemeManagementEvent,
    opts: { workspaceId?: string; themeId?: string; actorId?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    await this.eventQueue.publish({ event, ...opts });
  }
}
