import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  API_PREFIX: Joi.string().default('api'),
  API_VERSION: Joi.string().default('1'),

  // Database
  DATABASE_URL: Joi.string().uri().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_TLS: Joi.boolean().default(false),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Rate Limiting
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Swagger
  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_TITLE: Joi.string().default('ATLAS API'),
  SWAGGER_DESCRIPTION: Joi.string().default('ATLAS AI Commerce Operating System API'),
  SWAGGER_VERSION: Joi.string().default('1.0'),
  SWAGGER_PATH: Joi.string().default('api/docs'),
});
