import { registerAs } from '@nestjs/config';
import { CONFIG_DEFAULTS, CONFIG_NAMESPACES, ENV_KEYS } from './constants';
import { LogLevel, NodeEnvironment } from './enums';
import type { ILoggerConfig } from './interfaces';

export const loggerConfig = registerAs(
  CONFIG_NAMESPACES.LOGGER,
  (): ILoggerConfig => {
    const env = process.env[ENV_KEYS.NODE_ENV] ?? NodeEnvironment.DEVELOPMENT;
    const isDevelopment = env === NodeEnvironment.DEVELOPMENT;

    return {
      level: (process.env[ENV_KEYS.LOG_LEVEL] as LogLevel) ?? CONFIG_DEFAULTS.LOG_LEVEL,
      prettyPrint: isDevelopment,
    };
  },
);
