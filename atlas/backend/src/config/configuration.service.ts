import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CONFIG_NAMESPACES } from './constants';
import { NodeEnvironment } from './enums';
import type {
  IAiCredentialConfig,
  IAiProviderFoundationConfig,
  IAppConfig,
  IDatabaseConfig,
  IJwtConfig,
  ILoggerConfig,
  IQueueConfig,
  IRedisConfig,
  ISwaggerConfig,
  IStorageFoundationConfig,
  IAmazonProviderConfig,
} from './interfaces';

/**
 * ConfigurationService
 *
 * The single entry point for all configuration access in the application.
 *
 * Architecture Rules:
 *   - NEVER call process.env outside of config factory files.
 *   - NEVER call ConfigService.get() directly in business modules.
 *   - ALWAYS inject ConfigurationService and use its typed getters.
 *
 * By the time ConfigurationService is used, all env vars have been
 * validated at startup, so typed getters are guaranteed non-null.
 */
@Injectable()
export class ConfigurationService {
  constructor(private readonly configService: ConfigService) {}

  // ── Environment Helpers ────────────────────────────────────────
  get env(): NodeEnvironment {
    return this.getAppConfig().env;
  }

  get isDevelopment(): boolean {
    return this.env === NodeEnvironment.DEVELOPMENT;
  }

  get isProduction(): boolean {
    return this.env === NodeEnvironment.PRODUCTION;
  }

  get isTest(): boolean {
    return this.env === NodeEnvironment.TEST;
  }

  get isStaging(): boolean {
    return this.env === NodeEnvironment.STAGING;
  }

  // ── Typed Config Accessors ─────────────────────────────────────

  /**
   * Returns the application configuration block.
   * Contains: name, env, port, apiPrefix, apiVersion, corsOrigins, throttle.
   */
  getAppConfig(): IAppConfig {
    return this.getOrThrow<IAppConfig>(CONFIG_NAMESPACES.APP, 'Application config not found');
  }

  /**
   * Returns the database configuration block.
   * Contains: url (PostgreSQL connection string).
   */
  getDatabaseConfig(): IDatabaseConfig {
    return this.getOrThrow<IDatabaseConfig>(
      CONFIG_NAMESPACES.DATABASE,
      'Database config not found',
    );
  }

  /**
   * Returns the Redis configuration block.
   * Contains: host, port, password.
   */
  getRedisConfig(): IRedisConfig {
    return this.getOrThrow<IRedisConfig>(CONFIG_NAMESPACES.REDIS, 'Redis config not found');
  }

  /**
   * Returns the JWT configuration block.
   * Contains: secret, expiresIn, refreshSecret, refreshExpiresIn.
   */
  getJwtConfig(): IJwtConfig {
    return this.getOrThrow<IJwtConfig>(CONFIG_NAMESPACES.JWT, 'JWT config not found');
  }

  /**
   * Returns the Swagger/OpenAPI configuration block.
   * Contains: enabled, title, description, version, path.
   */
  getSwaggerConfig(): ISwaggerConfig {
    return this.getOrThrow<ISwaggerConfig>(
      CONFIG_NAMESPACES.SWAGGER,
      'Swagger config not found',
    );
  }

  /**
   * Returns the BullMQ queue configuration block.
   * Contains: redis (host, port, password).
   */
  getQueueConfig(): IQueueConfig {
    return this.getOrThrow<IQueueConfig>(CONFIG_NAMESPACES.QUEUE, 'Queue config not found');
  }

  /**
   * Returns the Pino logger configuration block.
   * Contains: level, prettyPrint.
   */
  getLoggerConfig(): ILoggerConfig {
    return this.getOrThrow<ILoggerConfig>(CONFIG_NAMESPACES.LOGGER, 'Logger config not found');
  }

  /**
   * Returns the AI provider foundation configuration block.
   * Contains: defaultProviderKey, requestTimeoutMs, maxRetryAttempts,
   * retryBackoffMs, maxRequestsPerMinute, useCaseProviderMap.
   */
  getAiProviderConfig(): IAiProviderFoundationConfig {
    return this.getOrThrow<IAiProviderFoundationConfig>(
      CONFIG_NAMESPACES.AI_PROVIDER,
      'AI provider config not found',
    );
  }

  /**
   * Returns the AI provider credential encryption configuration block.
   * Contains: encryptionKeyPassphrase, keyLength, ivLength, authTagLength.
   */
  getAiCredentialConfig(): IAiCredentialConfig {
    return this.getOrThrow<IAiCredentialConfig>(
      CONFIG_NAMESPACES.AI_CREDENTIAL,
      'AI credential config not found',
    );
  }

  /**
   * Returns the File Management storage foundation configuration block.
   * Contains: basePath, maxFileSizeBytes, defaultWorkspaceQuotaBytes,
   * accessTokenDefaultTtlMs.
   */
  getStorageConfig(): IStorageFoundationConfig {
    return this.getOrThrow<IStorageFoundationConfig>(
      CONFIG_NAMESPACES.STORAGE,
      'Storage config not found',
    );
  }

  /**
   * Returns the Amazon SP-API global app-level configuration block.
   * Contains: clientId, clientSecret, environment (sandbox|production).
   * These are ATLAS's own SP-API application credentials — the same
   * pair is used for every workspace/seller account. Per-seller
   * refreshToken/sellerId are NOT here (see marketplace-provider-credentials
   * / marketplace-account).
   */
  getAmazonProviderConfig(): IAmazonProviderConfig {
    return this.getOrThrow<IAmazonProviderConfig>(
      CONFIG_NAMESPACES.AMAZON_PROVIDER,
      'Amazon provider config not found',
    );
  }

  // ── Private Helpers ────────────────────────────────────────────

  /**
   * Retrieves a config namespace value and throws a descriptive error
   * if it is undefined. Should never actually throw post-startup since
   * environment validation already guarantees all required values exist.
   */
  private getOrThrow<T>(namespace: string, errorMessage: string): T {
    const config = this.configService.get<T>(namespace);
    if (config === undefined || config === null) {
      throw new Error(errorMessage);
    }
    return config;
  }
}
