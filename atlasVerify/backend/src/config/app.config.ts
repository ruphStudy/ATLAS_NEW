import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  name: process.env['APP_NAME'] ?? 'ATLAS API',
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  apiPrefix: process.env['API_PREFIX'] ?? 'api',
  apiVersion: process.env['API_VERSION'] ?? '1',
  corsOrigins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
  throttle: {
    ttl: parseInt(process.env['THROTTLE_TTL'] ?? '60', 10),
    limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '100', 10),
  },
  swagger: {
    enabled: process.env['SWAGGER_ENABLED'] !== 'false',
    title: process.env['SWAGGER_TITLE'] ?? 'ATLAS API',
    description:
      process.env['SWAGGER_DESCRIPTION'] ?? 'ATLAS AI Commerce Operating System API',
    version: process.env['SWAGGER_VERSION'] ?? '1.0',
    path: process.env['SWAGGER_PATH'] ?? 'api/docs',
  },
}));
