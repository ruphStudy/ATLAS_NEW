// ── Module & Service ────────────────────────────────────────────
export { ConfigurationModule } from './configuration.module';
export { ConfigurationService } from './configuration.service';

// ── Config Factories ─────────────────────────────────────────────
export { applicationConfig } from './application.config';
export { databaseConfig } from './database.config';
export { redisConfig } from './redis.config';
export { jwtConfig } from './jwt.config';
export { swaggerConfig } from './swagger.config';
export { queueConfig } from './queue.config';
export { loggerConfig } from './logger.config';

// ── Validation ───────────────────────────────────────────────────
export { validate, EnvironmentVariables } from './environment.validation';

// ── Enums ────────────────────────────────────────────────────────
export { NodeEnvironment, LogLevel } from './enums';

// ── Interfaces ────────────────────────────────────────────────────
export type {
  IAppConfig,
  IDatabaseConfig,
  IRedisConfig,
  IJwtConfig,
  ISwaggerConfig,
  IQueueConfig,
  ILoggerConfig,
} from './interfaces';

// ── Constants ────────────────────────────────────────────────────
export { CONFIG_NAMESPACES, CONFIG_DEFAULTS, ENV_KEYS } from './constants';

// ── Types ────────────────────────────────────────────────────────
export type { ConfigMap, ConfigValueByNamespace, ConfigFactory } from './types';

