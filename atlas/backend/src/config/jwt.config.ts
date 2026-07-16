import { registerAs } from '@nestjs/config';
import { CONFIG_DEFAULTS, CONFIG_NAMESPACES, ENV_KEYS } from './constants';
import type { IJwtConfig } from './interfaces';

export const jwtConfig = registerAs(
  CONFIG_NAMESPACES.JWT,
  (): IJwtConfig => ({
    secret: process.env[ENV_KEYS.JWT_SECRET] as string,
    expiresIn: process.env[ENV_KEYS.JWT_EXPIRES_IN] ?? CONFIG_DEFAULTS.JWT_EXPIRES_IN,
    refreshSecret: process.env[ENV_KEYS.JWT_REFRESH_SECRET] as string,
    refreshExpiresIn:
      process.env[ENV_KEYS.JWT_REFRESH_EXPIRES_IN] ?? CONFIG_DEFAULTS.JWT_REFRESH_EXPIRES_IN,
  }),
);
