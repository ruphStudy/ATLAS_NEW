import { registerAs } from '@nestjs/config';
import { CONFIG_NAMESPACES, ENV_KEYS } from './constants';
import type { IDatabaseConfig } from './interfaces';

export const databaseConfig = registerAs(
  CONFIG_NAMESPACES.DATABASE,
  (): IDatabaseConfig => ({
    url: process.env[ENV_KEYS.DATABASE_URL] as string,
  }),
);
