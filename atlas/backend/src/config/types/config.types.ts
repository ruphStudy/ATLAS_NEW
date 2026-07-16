import type { ConfigNamespace } from '../constants';
import type {
  IAppConfig,
  IDatabaseConfig,
  IRedisConfig,
  IJwtConfig,
  ISwaggerConfig,
  IQueueConfig,
  ILoggerConfig,
} from '../interfaces';

/**
 * Maps each config namespace to its strongly typed config interface.
 * Used internally by ConfigurationService for type-safe config lookups.
 */
export type ConfigMap = {
  app: IAppConfig;
  database: IDatabaseConfig;
  redis: IRedisConfig;
  jwt: IJwtConfig;
  swagger: ISwaggerConfig;
  queue: IQueueConfig;
  logger: ILoggerConfig;
};

export type ConfigValueByNamespace<K extends ConfigNamespace> = ConfigMap[K];

/**
 * Strongly typed factory function signature for registerAs() calls.
 * Enforces that each config factory returns the correct interface.
 */
export type ConfigFactory<T> = () => T;
