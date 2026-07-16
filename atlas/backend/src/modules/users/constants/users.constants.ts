export const USERS_CONSTANTS = {
  FIRST_NAME_MIN: 2,
  FIRST_NAME_MAX: 50,
  LAST_NAME_MIN: 2,
  LAST_NAME_MAX: 50,
  PHONE_MAX: 20,
  AVATAR_URL_MAX: 2048,
  TIMEZONE_MAX: 50,
  LOCALE_MAX: 10,
} as const;

/** Roles that can manage other users in a workspace */
export const PRIVILEGED_ROLES = ['OWNER', 'ADMIN'] as const;
export type PrivilegedRole = (typeof PRIVILEGED_ROLES)[number];
