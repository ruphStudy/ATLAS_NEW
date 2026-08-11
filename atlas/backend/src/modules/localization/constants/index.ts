export const LOCALIZATION_MODULE = 'localization';

/** Roles permitted to manage locales, namespaces, keys and translations. */
export const LOCALIZATION_MANAGE_ROLES: string[] = ['OWNER', 'ADMIN', 'MANAGER'];

/** The setting keys (already owned by Organization Settings / User Preferences) this module resolves through rather than storing its own preference tier. */
export const ORG_LOCALE_SETTING_KEY = 'organization.regional.locale';
export const USER_LOCALE_SETTING_KEY = 'user.display.language';

export const DEFAULT_FALLBACK_LOCALE = 'en-US';

export const TRANSLATION_CACHE_TTL_MS = 5 * 60 * 1000;

/** `{{var}}` interpolation pattern — the same simple substitution style already used by the Notification Provider Framework's own template renderers. */
export const INTERPOLATION_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
