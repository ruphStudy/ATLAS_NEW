import { registerAs } from '@nestjs/config';
import { CONFIG_DEFAULTS, CONFIG_NAMESPACES, ENV_KEYS } from './constants';
import type { IRedisConfig } from './interfaces';

export const redisConfig = registerAs(
  CONFIG_NAMESPACES.REDIS,
  (): IRedisConfig => ({
    host: process.env[ENV_KEYS.REDIS_HOST] ?? CONFIG_DEFAULTS.REDIS_HOST,
    port: parseInt(
      process.env[ENV_KEYS.REDIS_PORT] ?? String(CONFIG_DEFAULTS.REDIS_PORT),
      10,
    ),
    password: process.env[ENV_KEYS.REDIS_PASSWORD] ?? undefined,
    db: parseInt(
      process.env[ENV_KEYS.REDIS_DB] ?? String(CONFIG_DEFAULTS.REDIS_DB),
      10,
    ),
  }),
);
