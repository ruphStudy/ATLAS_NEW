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
  AI_PROVIDER: 'aiProvider',
  AI_CREDENTIAL: 'aiCredential',
  STORAGE: 'storage',
  AMAZON_PROVIDER: 'amazonProvider',
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
  REDIS_DB: 'REDIS_DB',

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

  // AI Provider (foundation-level defaults; per-provider config is registered at runtime)
  AI_PROVIDER_DEFAULT_PROVIDER_KEY: 'AI_PROVIDER_DEFAULT_PROVIDER_KEY',
  AI_PROVIDER_REQUEST_TIMEOUT_MS: 'AI_PROVIDER_REQUEST_TIMEOUT_MS',
  AI_PROVIDER_MAX_RETRY_ATTEMPTS: 'AI_PROVIDER_MAX_RETRY_ATTEMPTS',
  AI_PROVIDER_RETRY_BACKOFF_MS: 'AI_PROVIDER_RETRY_BACKOFF_MS',
  AI_PROVIDER_MAX_REQUESTS_PER_MINUTE: 'AI_PROVIDER_MAX_REQUESTS_PER_MINUTE',
  AI_PROVIDER_USE_CASE_MAP: 'AI_PROVIDER_USE_CASE_MAP',

  // AI Credential encryption-at-rest passphrase (shared with legacy
  // marketplace-provider-credentials encryption for a single managed secret)
  ATLAS_CREDENTIAL_KEY: 'ATLAS_CREDENTIAL_KEY',

  // Storage (File Management foundation)
  STORAGE_BASE_PATH: 'STORAGE_BASE_PATH',
  STORAGE_MAX_FILE_SIZE_BYTES: 'STORAGE_MAX_FILE_SIZE_BYTES',
  STORAGE_DEFAULT_WORKSPACE_QUOTA_BYTES: 'STORAGE_DEFAULT_WORKSPACE_QUOTA_BYTES',
  STORAGE_ACCESS_TOKEN_DEFAULT_TTL_MS: 'STORAGE_ACCESS_TOKEN_DEFAULT_TTL_MS',

  // Amazon SP-API — global app-level credentials (shared across every
  // workspace/seller account; per-seller refreshToken/sellerId live in
  // marketplace-provider-credentials / marketplace-account instead)
  AMAZON_SP_API_CLIENT_ID: 'AMAZON_SP_API_CLIENT_ID',
  AMAZON_SP_API_CLIENT_SECRET: 'AMAZON_SP_API_CLIENT_SECRET',
  AMAZON_SP_API_ENVIRONMENT: 'AMAZON_SP_API_ENVIRONMENT',
  // Seller Central "Application ID" (Solution ID) — distinct from the LWA
  // clientId above; required to build the seller-consent authorization URL.
  AMAZON_SP_API_APPLICATION_ID: 'AMAZON_SP_API_APPLICATION_ID',
  // Exact callback URL registered with Amazon for this app.
  AMAZON_SP_API_REDIRECT_URI: 'AMAZON_SP_API_REDIRECT_URI',
  // Sandbox-only global refresh token — verifies ATLAS's own sandbox
  // configuration without any real seller/workspace connection.
  AMAZON_SP_API_SANDBOX_REFRESH_TOKEN: 'AMAZON_SP_API_SANDBOX_REFRESH_TOKEN',
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
  REDIS_DB: 0,
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
  AI_PROVIDER_REQUEST_TIMEOUT_MS: 30000,
  AI_PROVIDER_MAX_RETRY_ATTEMPTS: 2,
  AI_PROVIDER_RETRY_BACKOFF_MS: 500,
  AI_PROVIDER_MAX_REQUESTS_PER_MINUTE: 60,
  AI_PROVIDER_USE_CASE_MAP: '{}',
  STORAGE_BASE_PATH: './storage/files',
  STORAGE_MAX_FILE_SIZE_BYTES: 104_857_600, // 100 MB
  STORAGE_DEFAULT_WORKSPACE_QUOTA_BYTES: 5_368_709_120, // 5 GB
  STORAGE_ACCESS_TOKEN_DEFAULT_TTL_MS: 900_000, // 15 minutes
  AMAZON_SP_API_ENVIRONMENT: 'sandbox',
} as const;
