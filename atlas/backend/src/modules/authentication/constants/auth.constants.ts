export const AUTH_CONSTANTS = {
  BCRYPT_SALT_ROUNDS: 12,
  ACCESS_TOKEN_TYPE: 'access',
  REFRESH_TOKEN_TYPE: 'refresh',
  JWT_STRATEGY: 'jwt',
  JWT_REFRESH_STRATEGY: 'jwt-refresh',

  // ── Rate limiting (stricter than the app-wide default) ────────
  LOGIN_THROTTLE_LIMIT: 5,
  LOGIN_THROTTLE_TTL_MS: 60_000,
  REGISTER_THROTTLE_LIMIT: 3,
  REGISTER_THROTTLE_TTL_MS: 60_000,

  // ── Failed-login lockout ────────────────────────────────────────
  LOGIN_LOCKOUT_THRESHOLD: 5,
  LOGIN_LOCKOUT_WINDOW_MS: 15 * 60 * 1000,
} as const;

export const IS_PUBLIC_KEY = 'isPublic' as const;
