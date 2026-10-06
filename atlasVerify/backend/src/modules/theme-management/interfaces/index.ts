export enum ThemeStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ThemeScope {
  GLOBAL = 'GLOBAL',
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
}

export enum ThemeManagementEvent {
  THEME_CREATED = 'theme-management.theme_created',
  THEME_UPDATED = 'theme-management.theme_updated',
  THEME_PUBLISHED = 'theme-management.theme_published',
  THEME_ROLLED_BACK = 'theme-management.theme_rolled_back',
  THEME_ARCHIVED = 'theme-management.theme_archived',
  THEME_RESTORED = 'theme-management.theme_restored',
  ACTIVE_THEME_CHANGED = 'theme-management.active_theme_changed',
}

export interface IThemeColorTokens {
  background?: string;
  surface?: string;
  text?: string;
  primary?: string;
  onPrimary?: string;
  secondary?: string;
  onSecondary?: string;
  border?: string;
  [token: string]: string | undefined;
}

export interface IThemeModeTokens {
  colors: IThemeColorTokens;
  typography?: Record<string, unknown>;
  spacing?: Record<string, unknown>;
  radius?: Record<string, unknown>;
  shadows?: Record<string, unknown>;
  components?: Record<string, unknown>;
}

export interface IThemeTokens {
  light: IThemeModeTokens;
  dark: IThemeModeTokens;
}

export interface ITheme {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scopeKey: string;
  scope: ThemeScope;
  key: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isBranded: boolean;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  accentColor?: string | null;
  tokens: IThemeTokens;
  version: number;
  status: ThemeStatus;
  publishedAt?: Date | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
  deletedAt?: Date | null;
}

export interface IThemeHistory {
  id: string;
  themeId: string;
  workspaceId?: string | null;
  fromStatus?: ThemeStatus | null;
  toStatus: ThemeStatus;
  version: number;
  changeReason?: string | null;
  changedBy?: string | null;
  snapshot: unknown;
  createdAt: Date;
}

export interface IContrastWarning {
  pair: string;
  ratio: number;
  minimumRequired: number;
  mode: 'light' | 'dark';
}

export interface IEffectiveTheme {
  theme: ITheme;
  mode: string;
  density: string;
  source: string;
}

export interface IThemeManagementEventPayload {
  event: ThemeManagementEvent;
  workspaceId?: string;
  themeId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
