import { UserRole } from '@prisma/client';
import { SettingValueStatus } from '../interfaces';

/** Roles permitted to create/update setting definitions (framework schema management). */
export const SETTINGS_DEFINITION_MANAGE_ROLES: string[] = [UserRole.OWNER, UserRole.ADMIN];

/** Roles permitted to assign GLOBAL or ORGANIZATION scope values — these affect every workspace. */
export const SETTINGS_GLOBAL_SCOPE_ROLES: string[] = [UserRole.OWNER, UserRole.ADMIN];

/** Roles permitted to assign WORKSPACE or MODULE scope values. USER scope is always self-service. */
export const SETTINGS_WORKSPACE_SCOPE_ROLES: string[] = [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER];

export const SETTING_VALUE_ALLOWED_TRANSITIONS: Record<SettingValueStatus, SettingValueStatus[]> = {
  [SettingValueStatus.DRAFT]: [SettingValueStatus.PUBLISHED, SettingValueStatus.ARCHIVED],
  [SettingValueStatus.PUBLISHED]: [SettingValueStatus.DISABLED, SettingValueStatus.ARCHIVED],
  [SettingValueStatus.DISABLED]: [SettingValueStatus.PUBLISHED, SettingValueStatus.ARCHIVED],
  [SettingValueStatus.ARCHIVED]: [SettingValueStatus.DRAFT],
};

/** How long a resolved-setting cache entry lives before being treated as stale. */
export const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

export const SETTING_DEFINITION_SORT_FIELDS = ['createdAt', 'updatedAt', 'key', 'category'] as const;
export const SETTING_VALUE_SORT_FIELDS = ['createdAt', 'updatedAt', 'version'] as const;
