/**
 * Namespace keys used with registerAs() / ConfigService.get().
 * These are the namespaces under which each config object is registered.
 *
 * Rule: NEVER call configService.get('app.port') directly.
 *       Always use ConfigurationService typed getters.
 */
export const CONFIG_NAMESPACES = {
  APP: 'app',
  DATABASE: 'database',
  REDIS: 'redis',
  JWT: 'jwt',
  SWAGGER: 'swagger',
  QUEUE: 'queue',
  LOGGER: 'logger',
} as const;

export type ConfigNamespace = (typeof CONFIG_NAMESPACES)[keyof typeof CONFIG_NAMESPACES];

// ── Environment Variable Key Names ──────────────────────────────
// Single source of truth for env var names.
// Prevents typos and enables easy refactoring.
export const ENV_KEYS = {
  // Application
  NODE_ENV: 'NODE_ENV',
  APP_NAME: 'APP_NAME',
  PORT: 'PORT',
  API_PREFIX: 'API_PREFIX',
  API_VERSION: 'API_VERSION',
  CORS_ORIGINS: 'CORS_ORIGINS',
  THROTTLE_TTL: 'THROTTLE_TTL',
  THROTTLE_LIMIT: 'THROTTLE_LIMIT',

  // Database
  DATABASE_URL: 'DATABASE_URL',

  // Redis
  REDIS_HOST: 'REDIS_HOST',
  REDIS_PORT: 'REDIS_PORT',
  REDIS_PASSWORD: 'REDIS_PASSWORD',

  // JWT
  JWT_SECRET: 'JWT_SECRET',
  JWT_EXPIRES_IN: 'JWT_EXPIRES_IN',
  JWT_REFRESH_SECRET: 'JWT_REFRESH_SECRET',
  JWT_REFRESH_EXPIRES_IN: 'JWT_REFRESH_EXPIRES_IN',

  // Logger
  LOG_LEVEL: 'LOG_LEVEL',

  // Swagger
  SWAGGER_ENABLED: 'SWAGGER_ENABLED',
  SWAGGER_TITLE: 'SWAGGER_TITLE',
  SWAGGER_DESCRIPTION: 'SWAGGER_DESCRIPTION',
  SWAGGER_VERSION: 'SWAGGER_VERSION',
  SWAGGER_PATH: 'SWAGGER_PATH',

  // Queue (BullMQ – defaults to Redis config if not set)
  BULLMQ_REDIS_HOST: 'BULLMQ_REDIS_HOST',
  BULLMQ_REDIS_PORT: 'BULLMQ_REDIS_PORT',
  BULLMQ_REDIS_PASSWORD: 'BULLMQ_REDIS_PASSWORD',
} as const;

export type EnvKey = (typeof ENV_KEYS)[keyof typeof ENV_KEYS];

// ── Default Values ───────────────────────────────────────────────
// Applied when optional env vars are absent.
// Mandatory vars have no defaults and will fail validation if missing.
export const CONFIG_DEFAULTS = {
  APP_NAME: 'ATLAS API',
  NODE_ENV: 'development',
  PORT: 3001,
  API_PREFIX: 'api',
  API_VERSION: '1',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  JWT_EXPIRES_IN: '7d',
  JWT_REFRESH_EXPIRES_IN: '30d',
  LOG_LEVEL: 'info',
  THROTTLE_TTL: 60,
  THROTTLE_LIMIT: 100,
  CORS_ORIGINS: 'http://localhost:3000',
  SWAGGER_ENABLED: true,
  SWAGGER_TITLE: 'ATLAS API',
  SWAGGER_DESCRIPTION: 'ATLAS AI Commerce Operating System API',
  SWAGGER_VERSION: '1.0',
  SWAGGER_PATH: 'api/docs',
} as const;
