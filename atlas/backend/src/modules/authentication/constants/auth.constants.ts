export const AUTH_CONSTANTS = {
  BCRYPT_SALT_ROUNDS: 12,
  ACCESS_TOKEN_TYPE: 'access',
  REFRESH_TOKEN_TYPE: 'refresh',
  JWT_STRATEGY: 'jwt',
  JWT_REFRESH_STRATEGY: 'jwt-refresh',
} as const;

export const IS_PUBLIC_KEY = 'isPublic' as const;
