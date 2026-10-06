import { ThemeStatus } from '../interfaces';

export const THEME_MANAGEMENT_MODULE = 'theme-management';
export const SYSTEM_THEME_SCOPE_KEY = 'SYSTEM';
export const SYSTEM_DEFAULT_THEME_KEY = 'atlas-default';

/** Roles permitted to manage GLOBAL/system themes. */
export const THEME_GLOBAL_SCOPE_ROLES: string[] = ['OWNER', 'ADMIN'];

/** Roles permitted to manage workspace-scoped custom themes authored by someone else. */
export const THEME_WORKSPACE_SCOPE_ROLES: string[] = ['OWNER', 'ADMIN', 'MANAGER'];

export const THEME_ALLOWED_TRANSITIONS: Record<ThemeStatus, ThemeStatus[]> = {
  [ThemeStatus.DRAFT]: [ThemeStatus.PUBLISHED, ThemeStatus.ARCHIVED],
  [ThemeStatus.PUBLISHED]: [ThemeStatus.ARCHIVED, ThemeStatus.DRAFT],
  [ThemeStatus.ARCHIVED]: [ThemeStatus.DRAFT],
};

/** The setting keys this module registers into the shared Settings Framework — "which theme/accent is active" only; mode and density stay entirely owned by User Preferences. */
export const ACTIVE_THEME_KEY_SETTING = 'theme.active-theme-key';
export const ACCENT_COLOR_OVERRIDE_SETTING = 'theme.accent-color-override';
export const USER_THEME_MODE_SETTING = 'user.appearance.theme';
export const USER_THEME_DENSITY_SETTING = 'user.appearance.density';

export const THEME_CACHE_TTL_MS = 5 * 60 * 1000;

/** Minimum WCAG contrast ratios validated (non-blocking, advisory) at create/update/publish time. */
export const MIN_CONTRAST_RATIO_NORMAL_TEXT = 4.5;
export const MIN_CONTRAST_RATIO_LARGE_TEXT = 3;

/** Token color pairs checked for contrast in each mode — `[foreground, background]`. */
export const CONTRAST_TOKEN_PAIRS: Array<[string, string]> = [
  ['text', 'background'],
  ['onPrimary', 'primary'],
  ['onSecondary', 'secondary'],
];

export const THEME_SORT_FIELDS = ['createdAt', 'updatedAt', 'name'] as const;
