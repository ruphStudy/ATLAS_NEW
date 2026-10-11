import { registerAs } from '@nestjs/config';
import { CONFIG_DEFAULTS, CONFIG_NAMESPACES, ENV_KEYS } from './constants';
import type { IQueueConfig } from './interfaces';

/**
 * BullMQ queue configuration.
 * Falls back to the main Redis config if BULLMQ_REDIS_* vars are not set.
 * This allows BullMQ to use a separate Redis instance in production if needed.
 */
export const queueConfig = registerAs(
  CONFIG_NAMESPACES.QUEUE,
  (): IQueueConfig => ({
    redis: {
      host:
        process.env[ENV_KEYS.BULLMQ_REDIS_HOST] ??
        process.env[ENV_KEYS.REDIS_HOST] ??
        CONFIG_DEFAULTS.REDIS_HOST,
      port: parseInt(
        process.env[ENV_KEYS.BULLMQ_REDIS_PORT] ??
          process.env[ENV_KEYS.REDIS_PORT] ??
          String(CONFIG_DEFAULTS.REDIS_PORT),
        10,
      ),
      password:
        process.env[ENV_KEYS.BULLMQ_REDIS_PASSWORD] ??
        process.env[ENV_KEYS.REDIS_PASSWORD] ??
        undefined,
      tls: process.env[ENV_KEYS.REDIS_TLS] === 'true',
    },
  }),
);
