import { registerAs } from '@nestjs/config';
import { CONFIG_DEFAULTS, CONFIG_NAMESPACES, ENV_KEYS } from './constants';
import type { ISwaggerConfig } from './interfaces';

export const swaggerConfig = registerAs(
  CONFIG_NAMESPACES.SWAGGER,
  (): ISwaggerConfig => ({
    enabled:
      process.env[ENV_KEYS.SWAGGER_ENABLED] !== 'false' &&
      process.env[ENV_KEYS.SWAGGER_ENABLED] !== '0',
    title: process.env[ENV_KEYS.SWAGGER_TITLE] ?? CONFIG_DEFAULTS.SWAGGER_TITLE,
    description:
      process.env[ENV_KEYS.SWAGGER_DESCRIPTION] ?? CONFIG_DEFAULTS.SWAGGER_DESCRIPTION,
    version: process.env[ENV_KEYS.SWAGGER_VERSION] ?? CONFIG_DEFAULTS.SWAGGER_VERSION,
    path: process.env[ENV_KEYS.SWAGGER_PATH] ?? CONFIG_DEFAULTS.SWAGGER_PATH,
  }),
);
