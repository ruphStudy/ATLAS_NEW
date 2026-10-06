import { registerAs } from '@nestjs/config';
import { CONFIG_DEFAULTS, CONFIG_NAMESPACES, ENV_KEYS } from './constants';
import { NodeEnvironment } from './enums';
import type { IAppConfig } from './interfaces';

/**
 * Application configuration factory.
 *
 * Rule: This is the ONLY location where process.env is read for app config.
 * All other modules must consume config via ConfigurationService.
 */
export const applicationConfig = registerAs(
  CONFIG_NAMESPACES.APP,
  (): IAppConfig => ({
    name: process.env[ENV_KEYS.APP_NAME] ?? CONFIG_DEFAULTS.APP_NAME,
    env:
      (process.env[ENV_KEYS.NODE_ENV] as NodeEnvironment) ?? NodeEnvironment.DEVELOPMENT,
    port: parseInt(
      process.env[ENV_KEYS.PORT] ?? String(CONFIG_DEFAULTS.PORT),
      10,
    ),
    apiPrefix: process.env[ENV_KEYS.API_PREFIX] ?? CONFIG_DEFAULTS.API_PREFIX,
    apiVersion: process.env[ENV_KEYS.API_VERSION] ?? CONFIG_DEFAULTS.API_VERSION,
    corsOrigins: (process.env[ENV_KEYS.CORS_ORIGINS] ?? CONFIG_DEFAULTS.CORS_ORIGINS)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    throttle: {
      ttl: parseInt(
        process.env[ENV_KEYS.THROTTLE_TTL] ?? String(CONFIG_DEFAULTS.THROTTLE_TTL),
        10,
      ),
      limit: parseInt(
        process.env[ENV_KEYS.THROTTLE_LIMIT] ?? String(CONFIG_DEFAULTS.THROTTLE_LIMIT),
        10,
      ),
    },
  }),
);
