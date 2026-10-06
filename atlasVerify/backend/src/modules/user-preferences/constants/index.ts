import { SettingValueType, SettingScope } from '@modules/settings/interfaces';
import type { CreateSettingDefinitionDto } from '@modules/settings/dto';

/** The `module` tag every User Preferences definition is registered under in the shared Settings Framework catalog. */
export const USER_PREFERENCES_MODULE = 'user-preferences';

export enum UserPreferencesCategory {
  DISPLAY = 'DISPLAY',
  NOTIFICATIONS = 'NOTIFICATIONS',
  WORKSPACE_VIEW = 'WORKSPACE_VIEW',
  DEFAULTS = 'DEFAULTS',
  APPEARANCE = 'APPEARANCE',
  AI = 'AI',
}

/**
 * The catalog this module owns. Registered into the shared Settings
 * Framework on startup (idempotent — see `UserPreferencesService.onModuleInit`).
 * Every definition is USER-scope only: preferences are inherently personal,
 * so there is no organization/workspace default tier to fall back through
 * beyond the definition's own `defaultValue`. All storage, validation,
 * versioning, precedence and caching live in the framework.
 */
export const USER_PREFERENCES_DEFINITIONS: CreateSettingDefinitionDto[] = [
  // ── Display ──────────────────────────────────────────────────────
  {
    key: 'user.display.language',
    category: UserPreferencesCategory.DISPLAY,
    label: 'Language',
    valueType: SettingValueType.STRING,
    defaultValue: 'en',
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.display.timezone',
    category: UserPreferencesCategory.DISPLAY,
    label: 'Timezone',
    valueType: SettingValueType.STRING,
    defaultValue: 'UTC',
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.display.date-format',
    category: UserPreferencesCategory.DISPLAY,
    label: 'Date format',
    valueType: SettingValueType.STRING,
    defaultValue: 'YYYY-MM-DD',
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.display.number-format',
    category: UserPreferencesCategory.DISPLAY,
    label: 'Number format',
    valueType: SettingValueType.STRING,
    defaultValue: 'en-US',
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.display.currency',
    category: UserPreferencesCategory.DISPLAY,
    label: 'Currency',
    valueType: SettingValueType.STRING,
    defaultValue: 'USD',
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
    validationRules: { pattern: '^[A-Z]{3}$' },
  },
  {
    key: 'user.display.measurement-system',
    category: UserPreferencesCategory.DISPLAY,
    label: 'Measurement system',
    valueType: SettingValueType.STRING,
    defaultValue: 'METRIC',
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.display.preferred-languages',
    category: UserPreferencesCategory.DISPLAY,
    label: 'Preferred languages',
    valueType: SettingValueType.JSON,
    defaultValue: [],
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },

  // ── Notifications ────────────────────────────────────────────────
  {
    key: 'user.notifications.channels',
    category: UserPreferencesCategory.NOTIFICATIONS,
    label: 'Notification channels',
    valueType: SettingValueType.JSON,
    defaultValue: { email: true, sms: false, push: true, inApp: true },
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.notifications.categories',
    category: UserPreferencesCategory.NOTIFICATIONS,
    label: 'Notification category subscriptions',
    valueType: SettingValueType.JSON,
    defaultValue: {},
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.notifications.priority-threshold',
    category: UserPreferencesCategory.NOTIFICATIONS,
    label: 'Minimum notification priority',
    valueType: SettingValueType.ENUM,
    enumOptions: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    defaultValue: 'LOW',
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.notifications.quiet-hours',
    category: UserPreferencesCategory.NOTIFICATIONS,
    label: 'Quiet hours',
    valueType: SettingValueType.JSON,
    defaultValue: { enabled: false, start: '22:00', end: '07:00' },
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },

  // ── Workspace view ───────────────────────────────────────────────
  {
    key: 'user.workspace-view.default-workspace-id',
    category: UserPreferencesCategory.WORKSPACE_VIEW,
    label: 'Default workspace',
    valueType: SettingValueType.STRING,
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.workspace-view.dashboard-layout',
    category: UserPreferencesCategory.WORKSPACE_VIEW,
    label: 'Dashboard layout',
    valueType: SettingValueType.JSON,
    defaultValue: {},
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.workspace-view.table-preferences',
    category: UserPreferencesCategory.WORKSPACE_VIEW,
    label: 'Table preferences',
    valueType: SettingValueType.JSON,
    defaultValue: {},
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.workspace-view.filter-presets',
    category: UserPreferencesCategory.WORKSPACE_VIEW,
    label: 'Filter presets',
    valueType: SettingValueType.JSON,
    defaultValue: {},
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.workspace-view.saved-views',
    category: UserPreferencesCategory.WORKSPACE_VIEW,
    label: 'Saved views',
    valueType: SettingValueType.LIST,
    defaultValue: [],
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },

  // ── Defaults (marketplace/warehouse/report/analytics) ────────────
  {
    key: 'user.defaults.marketplace',
    category: UserPreferencesCategory.DEFAULTS,
    label: 'Default marketplace',
    valueType: SettingValueType.STRING,
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.defaults.warehouse-id',
    category: UserPreferencesCategory.DEFAULTS,
    label: 'Default warehouse',
    valueType: SettingValueType.STRING,
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.defaults.report-format',
    category: UserPreferencesCategory.DEFAULTS,
    label: 'Default report format',
    valueType: SettingValueType.ENUM,
    enumOptions: ['PDF', 'CSV', 'XLSX'],
    defaultValue: 'PDF',
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.defaults.analytics-date-range',
    category: UserPreferencesCategory.DEFAULTS,
    label: 'Default analytics date range',
    valueType: SettingValueType.STRING,
    defaultValue: 'LAST_30_DAYS',
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },

  // ── Appearance ───────────────────────────────────────────────────
  {
    key: 'user.appearance.theme',
    category: UserPreferencesCategory.APPEARANCE,
    label: 'Theme',
    valueType: SettingValueType.ENUM,
    enumOptions: ['LIGHT', 'DARK', 'SYSTEM'],
    defaultValue: 'SYSTEM',
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.appearance.density',
    category: UserPreferencesCategory.APPEARANCE,
    label: 'Density',
    valueType: SettingValueType.ENUM,
    enumOptions: ['COMFORTABLE', 'COMPACT', 'SPACIOUS'],
    defaultValue: 'COMFORTABLE',
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.appearance.accessibility',
    category: UserPreferencesCategory.APPEARANCE,
    label: 'Accessibility',
    valueType: SettingValueType.JSON,
    defaultValue: { highContrast: false, reduceMotion: false, fontScale: 1 },
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.appearance.navigation',
    category: UserPreferencesCategory.APPEARANCE,
    label: 'Navigation',
    valueType: SettingValueType.JSON,
    defaultValue: { sidebarCollapsed: false, pinnedItems: [] },
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },

  // ── AI ───────────────────────────────────────────────────────────
  {
    key: 'user.ai.default-provider',
    category: UserPreferencesCategory.AI,
    label: 'Default AI provider',
    valueType: SettingValueType.STRING,
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.ai.default-model',
    category: UserPreferencesCategory.AI,
    label: 'Default AI model',
    valueType: SettingValueType.STRING,
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.ai.response-style',
    category: UserPreferencesCategory.AI,
    label: 'AI response style',
    valueType: SettingValueType.ENUM,
    enumOptions: ['CONCISE', 'DETAILED', 'TECHNICAL'],
    defaultValue: 'CONCISE',
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
  },
  {
    key: 'user.ai.approval-threshold',
    category: UserPreferencesCategory.AI,
    label: 'AI auto-approval threshold',
    valueType: SettingValueType.NUMBER,
    defaultValue: 0,
    allowedScopes: [SettingScope.USER],
    module: USER_PREFERENCES_MODULE,
    validationRules: { min: 0 },
  },
];

/** Maps the friendly field names accepted by this module's update DTOs to their underlying Settings Framework definition keys. */
export const USER_PREFERENCES_FIELD_KEY_MAP: Record<UserPreferencesCategory, Record<string, string>> = {
  [UserPreferencesCategory.DISPLAY]: {
    language: 'user.display.language',
    timezone: 'user.display.timezone',
    dateFormat: 'user.display.date-format',
    numberFormat: 'user.display.number-format',
    currency: 'user.display.currency',
    measurementSystem: 'user.display.measurement-system',
    preferredLanguages: 'user.display.preferred-languages',
  },
  [UserPreferencesCategory.NOTIFICATIONS]: {
    channels: 'user.notifications.channels',
    categories: 'user.notifications.categories',
    priorityThreshold: 'user.notifications.priority-threshold',
    quietHours: 'user.notifications.quiet-hours',
  },
  [UserPreferencesCategory.WORKSPACE_VIEW]: {
    defaultWorkspaceId: 'user.workspace-view.default-workspace-id',
    dashboardLayout: 'user.workspace-view.dashboard-layout',
    tablePreferences: 'user.workspace-view.table-preferences',
    filterPresets: 'user.workspace-view.filter-presets',
    savedViews: 'user.workspace-view.saved-views',
  },
  [UserPreferencesCategory.DEFAULTS]: {
    marketplace: 'user.defaults.marketplace',
    warehouseId: 'user.defaults.warehouse-id',
    reportFormat: 'user.defaults.report-format',
    analyticsDateRange: 'user.defaults.analytics-date-range',
  },
  [UserPreferencesCategory.APPEARANCE]: {
    theme: 'user.appearance.theme',
    density: 'user.appearance.density',
    accessibility: 'user.appearance.accessibility',
    navigation: 'user.appearance.navigation',
  },
  [UserPreferencesCategory.AI]: {
    defaultProvider: 'user.ai.default-provider',
    defaultModel: 'user.ai.default-model',
    responseStyle: 'user.ai.response-style',
    approvalThreshold: 'user.ai.approval-threshold',
  },
};
