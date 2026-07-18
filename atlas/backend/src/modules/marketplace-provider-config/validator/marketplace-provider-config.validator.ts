import { Injectable } from '@nestjs/common';
import {
  ConfigValidationError,
  ConfigValidationResult,
  MarketplaceProviderConfigPayload,
} from '../interfaces';
import { CONFIG_ERROR_CODES, MP_CONFIG_CONSTANTS } from '../constants';

const VALID_LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error']);

/**
 * Validates marketplace provider configuration payloads.
 * No marketplace API communication — pure structural validation only.
 */
@Injectable()
export class MarketplaceProviderConfigValidator {

  validate(
    payload: MarketplaceProviderConfigPayload,
    context: { providerKey: string; isCreate?: boolean } = { providerKey: '' },
  ): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: string[] = [];

    if (context.isCreate && !context.providerKey?.trim()) {
      errors.push({ field: 'providerKey', message: 'providerKey is required', code: CONFIG_ERROR_CODES.MISSING_REQUIRED_FIELD });
    }

    this.validateTimeout(payload, errors);
    this.validatePriority(payload, errors);
    this.validateRetryPolicy(payload, errors);
    this.validateRateLimitConfig(payload, errors);
    this.validateQueueConfig(payload, errors);
    this.validateBatchProcessing(payload, errors, warnings);
    this.validateApiVersion(payload, errors);
    this.validateLoggingOptions(payload, errors);

    return { valid: errors.length === 0, errors, warnings };
  }

  // ── Section Validators ────────────────────────────────────

  private validateTimeout(
    payload: MarketplaceProviderConfigPayload,
    errors: ConfigValidationError[],
  ): void {
    if (payload.timeoutMs === undefined) return;
    if (
      payload.timeoutMs < MP_CONFIG_CONSTANTS.MIN_TIMEOUT_MS ||
      payload.timeoutMs > MP_CONFIG_CONSTANTS.MAX_TIMEOUT_MS
    ) {
      errors.push({
        field: 'timeoutMs',
        message: `timeoutMs must be between ${MP_CONFIG_CONSTANTS.MIN_TIMEOUT_MS} and ${MP_CONFIG_CONSTANTS.MAX_TIMEOUT_MS}`,
        code: CONFIG_ERROR_CODES.INVALID_TIMEOUT,
      });
    }
  }

  private validatePriority(
    payload: MarketplaceProviderConfigPayload,
    errors: ConfigValidationError[],
  ): void {
    if (payload.priority === undefined) return;
    if (
      payload.priority < MP_CONFIG_CONSTANTS.MIN_PRIORITY ||
      payload.priority > MP_CONFIG_CONSTANTS.MAX_PRIORITY
    ) {
      errors.push({
        field: 'priority',
        message: `priority must be between ${MP_CONFIG_CONSTANTS.MIN_PRIORITY} and ${MP_CONFIG_CONSTANTS.MAX_PRIORITY}`,
        code: CONFIG_ERROR_CODES.INVALID_PRIORITY,
      });
    }
  }

  private validateRetryPolicy(
    payload: MarketplaceProviderConfigPayload,
    errors: ConfigValidationError[],
  ): void {
    const rp = payload.retryPolicy;
    if (!rp) return;
    if (rp.maxAttempts < 1 || rp.maxAttempts > 20) {
      errors.push({ field: 'retryPolicy.maxAttempts', message: 'maxAttempts must be 1–20', code: CONFIG_ERROR_CODES.INVALID_RETRY_POLICY });
    }
    if (rp.backoffMs < 0) {
      errors.push({ field: 'retryPolicy.backoffMs', message: 'backoffMs must be >= 0', code: CONFIG_ERROR_CODES.INVALID_RETRY_POLICY });
    }
    if (rp.backoffMultiplier < 1) {
      errors.push({ field: 'retryPolicy.backoffMultiplier', message: 'backoffMultiplier must be >= 1', code: CONFIG_ERROR_CODES.INVALID_RETRY_POLICY });
    }
  }

  private validateRateLimitConfig(
    payload: MarketplaceProviderConfigPayload,
    errors: ConfigValidationError[],
  ): void {
    const rl = payload.rateLimitConfig;
    if (!rl) return;
    if (rl.requestsPerMinute < 1) {
      errors.push({ field: 'rateLimitConfig.requestsPerMinute', message: 'Must be >= 1', code: CONFIG_ERROR_CODES.INVALID_RATE_LIMIT });
    }
    if (rl.requestsPerHour < 1) {
      errors.push({ field: 'rateLimitConfig.requestsPerHour', message: 'Must be >= 1', code: CONFIG_ERROR_CODES.INVALID_RATE_LIMIT });
    }
    if (rl.burstLimit < 1) {
      errors.push({ field: 'rateLimitConfig.burstLimit', message: 'Must be >= 1', code: CONFIG_ERROR_CODES.INVALID_RATE_LIMIT });
    }
  }

  private validateQueueConfig(
    payload: MarketplaceProviderConfigPayload,
    errors: ConfigValidationError[],
  ): void {
    const qc = payload.queueConfig;
    if (!qc) return;
    if (qc.concurrency !== undefined && qc.concurrency < 1) {
      errors.push({ field: 'queueConfig.concurrency', message: 'concurrency must be >= 1', code: CONFIG_ERROR_CODES.INVALID_QUEUE_CONFIG });
    }
    if (qc.jobAttempts !== undefined && (qc.jobAttempts < 1 || qc.jobAttempts > 20)) {
      errors.push({ field: 'queueConfig.jobAttempts', message: 'jobAttempts must be 1–20', code: CONFIG_ERROR_CODES.INVALID_QUEUE_CONFIG });
    }
  }

  private validateBatchProcessing(
    payload: MarketplaceProviderConfigPayload,
    errors: ConfigValidationError[],
    warnings: string[],
  ): void {
    const bp = payload.batchProcessingConfig;
    if (!bp) return;
    if (bp.batchSize !== undefined) {
      if (bp.batchSize < 1) {
        errors.push({ field: 'batchProcessingConfig.batchSize', message: 'batchSize must be >= 1', code: CONFIG_ERROR_CODES.INVALID_BATCH_SIZE });
      } else if (bp.batchSize > MP_CONFIG_CONSTANTS.MAX_BATCH_SIZE) {
        warnings.push(`batchSize ${bp.batchSize} exceeds recommended maximum of ${MP_CONFIG_CONSTANTS.MAX_BATCH_SIZE}`);
      }
    }
  }

  private validateApiVersion(
    payload: MarketplaceProviderConfigPayload,
    errors: ConfigValidationError[],
  ): void {
    const av = payload.apiVersion;
    if (!av) return;
    // Accept semver (1.2.3), date-based (v2024-10-01), or plain string
    const semver = /^\d+\.\d+\.\d+$/;
    const dateVersion = /^v?\d{4}-\d{2}-\d{2}$/;
    const simple = /^v?\d+(\.\d+)?$/;
    if (!semver.test(av) && !dateVersion.test(av) && !simple.test(av)) {
      errors.push({
        field: 'apiVersion',
        message: `Invalid API version format: '${av}'. Use semver (1.0.0), date (v2024-10-01), or simple (v2)`,
        code: CONFIG_ERROR_CODES.INVALID_API_VERSION,
      });
    }
  }

  private validateLoggingOptions(
    payload: MarketplaceProviderConfigPayload,
    errors: ConfigValidationError[],
  ): void {
    const lo = payload.loggingOptions;
    if (!lo?.level) return;
    if (!VALID_LOG_LEVELS.has(lo.level)) {
      errors.push({
        field: 'loggingOptions.level',
        message: `Invalid log level '${lo.level}'. Must be one of: debug, info, warn, error`,
        code: CONFIG_ERROR_CODES.MISSING_REQUIRED_FIELD,
      });
    }
  }
}
