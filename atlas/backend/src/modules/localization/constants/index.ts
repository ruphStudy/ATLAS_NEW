import { LocaleStatus, MeasurementSystem } from '../interfaces';

export const LOCALIZATION_MODULE = 'localization';

/** Allowed `LocaleStatus` transitions — enable/disable/archive/restore. */
export const LOCALE_ALLOWED_TRANSITIONS: Record<LocaleStatus, LocaleStatus[]> = {
  [LocaleStatus.ACTIVE]: [LocaleStatus.DISABLED, LocaleStatus.ARCHIVED],
  [LocaleStatus.DISABLED]: [LocaleStatus.ACTIVE, LocaleStatus.ARCHIVED],
  [LocaleStatus.ARCHIVED]: [LocaleStatus.ACTIVE], // restore path only
};

export const LOCALE_SORT_FIELDS = ['code', 'displayName', 'language', 'createdAt', 'updatedAt'] as const;
export const LOCALE_DEFAULT_PAGE_SIZE = 20;
export const LOCALE_MAX_PAGE_SIZE = 200;

/** Bound on how many hops `assertNoFallbackCycle` will walk before giving up — the locale catalog is small, so a real chain never gets close to this. */
export const LOCALE_FALLBACK_MAX_DEPTH = 20;

/** Which languages a user prefers, in priority order — a USER-scope preference, resolved the same way as every other precedence-driven setting. */
export const USER_PREFERRED_LANGUAGES_SETTING_KEY = 'user.display.preferred-languages';
/** Which language codes are enabled at all for an organization/workspace — an ORGANIZATION+WORKSPACE-scope setting. */
export const ORG_ENABLED_LANGUAGES_SETTING_KEY = 'organization.regional.enabled-languages';

/** Roles permitted to manage locales, namespaces, keys and translations. */
export const LOCALIZATION_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN', 'MANAGER'];

/**
 * The setting keys (already owned by Organization Settings / User
 * Preferences, both thin facades over the shared Settings Framework) this
 * module resolves through rather than storing its own preference tier.
 * Each key's `allowedScopes` already spans the full precedence this module
 * needs: ORGANIZATION+WORKSPACE for the organization-settings keys, USER
 * for the user-preferences keys — `SettingsService.resolve()` picks the
 * most specific one automatically, so global→organization→workspace→user
 * precedence is enforced entirely by the framework, never re-implemented here.
 */
export const ORG_LOCALE_SETTING_KEY = 'organization.regional.locale';
export const USER_LOCALE_SETTING_KEY = 'user.display.language';
export const ORG_TIMEZONE_SETTING_KEY = 'organization.regional.timezone';
export const USER_TIMEZONE_SETTING_KEY = 'user.display.timezone';
export const ORG_CURRENCY_SETTING_KEY = 'organization.regional.currency';
export const USER_CURRENCY_SETTING_KEY = 'user.display.currency';
export const ORG_DATE_FORMAT_SETTING_KEY = 'organization.regional.date-format';
export const USER_DATE_FORMAT_SETTING_KEY = 'user.display.date-format';
export const ORG_NUMBER_FORMAT_SETTING_KEY = 'organization.regional.number-format';
export const USER_NUMBER_FORMAT_SETTING_KEY = 'user.display.number-format';
export const ORG_MEASUREMENT_SYSTEM_SETTING_KEY = 'organization.regional.measurement-system';
export const USER_MEASUREMENT_SYSTEM_SETTING_KEY = 'user.display.measurement-system';

export const DEFAULT_FALLBACK_LOCALE = 'en-US';
export const DEFAULT_FALLBACK_TIMEZONE = 'UTC';
export const DEFAULT_FALLBACK_MEASUREMENT_SYSTEM = MeasurementSystem.METRIC;

export const TRANSLATION_CACHE_TTL_MS = 5 * 60 * 1000;

/** `{{var}}` interpolation pattern — the same simple substitution style already used by the Notification Provider Framework's own template renderers. */
export const INTERPOLATION_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
