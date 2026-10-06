import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validate } from './environment.validation';
import { applicationConfig } from './application.config';
import { databaseConfig } from './database.config';
import { redisConfig } from './redis.config';
import { jwtConfig } from './jwt.config';
import { swaggerConfig } from './swagger.config';
import { queueConfig } from './queue.config';
import { loggerConfig } from './logger.config';
import { aiProviderConfig } from './ai-provider.config';
import { aiCredentialConfig } from './ai-credential.config';
import { storageConfig } from './storage.config';
import { amazonProviderConfig } from './amazon-provider.config';
import { ConfigurationService } from './configuration.service';

/**
 * ConfigurationModule
 *
 * Global module that:
 *   1. Loads and validates all environment variables at startup.
 *   2. Registers all typed configuration namespaces.
 *   3. Provides ConfigurationService as the single typed config interface.
 *
 * Import this module ONCE in AppModule.
 * ConfigurationService is automatically available everywhere after that.
 *
 * Architecture Rule:
 *   No other module should call ConfigModule.forRoot().
 *   No other module should read process.env.
 *   All config access must go through ConfigurationService.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Env file precedence (right to left, later = higher priority):
      // .env → .env.{NODE_ENV} → .env.local
      envFilePath: [
        '.env',
        `.env.${process.env['NODE_ENV'] ?? 'development'}`,
        '.env.local',
      ],
      load: [
        applicationConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        swaggerConfig,
        queueConfig,
        loggerConfig,
        aiProviderConfig,
        aiCredentialConfig,
        storageConfig,
        amazonProviderConfig,
      ],
      validate,
      validationOptions: {
        abortEarly: false,
      },
      cache: true,
      expandVariables: true,
    }),
  ],
  providers: [ConfigurationService],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
