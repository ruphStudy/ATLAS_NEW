import { Injectable } from '@nestjs/common';
import {
  AiConfigScope,
  IAiConfigValidationError,
  IAiConfigValidationResult,
  IAiProviderConfigPayload,
} from '../interfaces';
import { AI_CONFIG_CONSTANTS } from '../constants';

export interface IAiProviderConfigValidationContext {
  scope: AiConfigScope;
  providerKey: string;
  useCase?: string;
  modelId?: string;
}

/**
 * AiProviderConfigValidator
 *
 * Structural + business-rule validation for AI provider configuration
 * payloads: missing required fields, out-of-range/invalid values, and
 * internally incompatible combinations. No provider API calls — pure
 * validation, independent of any concrete provider.
 */
@Injectable()
export class AiProviderConfigValidator {
  validate(
    payload: IAiProviderConfigPayload,
    context: IAiProviderConfigValidationContext,
  ): IAiConfigValidationResult {
    const errors: IAiConfigValidationError[] = [];
    const warnings: string[] = [];

    this.validateScopeRequirements(context, errors);
    this.validateModels(payload, errors, warnings);
    this.validateTimeoutPolicy(payload, errors);
    this.validateRetryPolicy(payload, errors);
    this.validateRateLimitPolicy(payload, errors);
    this.validateFallbackPolicy(payload, context, errors);
    this.validateModelParameters(payload, errors);
    this.validateUsageLimits(payload, errors);
    this.validateCredentials(payload, errors);

    return { valid: errors.length === 0, errors, warnings };
  }

  // ── Missing ────────────────────────────────────────────────

  private validateScopeRequirements(
    context: IAiProviderConfigValidationContext,
    errors: IAiConfigValidationError[],
  ): void {
    if (!context.providerKey?.trim()) {
      errors.push({ field: 'providerKey', message: 'providerKey is required', code: 'MISSING_REQUIRED_FIELD' });
    }
    if (context.scope === AiConfigScope.USE_CASE && !context.useCase?.trim()) {
      errors.push({
        field: 'useCase',
        message: 'useCase is required when scope is USE_CASE',
        code: 'MISSING_REQUIRED_FIELD',
      });
    }
    if (context.scope === AiConfigScope.MODEL && !context.modelId?.trim()) {
      errors.push({
        field: 'modelId',
        message: 'modelId is required when scope is MODEL',
        code: 'MISSING_REQUIRED_FIELD',
      });
    }
  }

  // ── Incompatible ───────────────────────────────────────────

  private validateModels(
    payload: IAiProviderConfigPayload,
    errors: IAiConfigValidationError[],
    warnings: string[],
  ): void {
    const models = payload.models ?? [];
    const modelIds = new Set(models.map((m) => m.modelId));

    if (payload.defaultModelId && models.length > 0 && !modelIds.has(payload.defaultModelId)) {
      errors.push({
        field: 'defaultModelId',
        message: `defaultModelId '${payload.defaultModelId}' does not match any declared model`,
        code: 'INCOMPATIBLE_MODEL',
      });
    }

    if (payload.capabilities && payload.capabilities.length > 0) {
      const declared = new Set(payload.capabilities);
      for (const model of models) {
        const unsupported = model.capabilities.filter((c) => !declared.has(c));
        if (unsupported.length > 0) {
          warnings.push(
            `Model '${model.modelId}' declares capabilities not listed at the provider level: ${unsupported.join(', ')}`,
          );
        }
      }
    }
  }

  // ── Invalid ────────────────────────────────────────────────

  private validateTimeoutPolicy(payload: IAiProviderConfigPayload, errors: IAiConfigValidationError[]): void {
    const tp = payload.timeoutPolicy;
    if (!tp) return;
    if (
      tp.requestTimeoutMs < AI_CONFIG_CONSTANTS.MIN_TIMEOUT_MS ||
      tp.requestTimeoutMs > AI_CONFIG_CONSTANTS.MAX_TIMEOUT_MS
    ) {
      errors.push({
        field: 'timeoutPolicy.requestTimeoutMs',
        message: `requestTimeoutMs must be between ${AI_CONFIG_CONSTANTS.MIN_TIMEOUT_MS} and ${AI_CONFIG_CONSTANTS.MAX_TIMEOUT_MS}`,
        code: 'INVALID_TIMEOUT',
      });
    }
  }

  private validateRetryPolicy(payload: IAiProviderConfigPayload, errors: IAiConfigValidationError[]): void {
    const rp = payload.retryPolicy;
    if (!rp) return;
    if (rp.maxAttempts < 1 || rp.maxAttempts > 20) {
      errors.push({ field: 'retryPolicy.maxAttempts', message: 'maxAttempts must be 1-20', code: 'INVALID_RETRY_POLICY' });
    }
    if (rp.backoffMs < 0) {
      errors.push({ field: 'retryPolicy.backoffMs', message: 'backoffMs must be >= 0', code: 'INVALID_RETRY_POLICY' });
    }
    if (rp.backoffMultiplier !== undefined && rp.backoffMultiplier < 1) {
      errors.push({
        field: 'retryPolicy.backoffMultiplier',
        message: 'backoffMultiplier must be >= 1',
        code: 'INVALID_RETRY_POLICY',
      });
    }
  }

  private validateRateLimitPolicy(payload: IAiProviderConfigPayload, errors: IAiConfigValidationError[]): void {
    const rl = payload.rateLimitPolicy;
    if (!rl) return;
    if (rl.maxRequestsPerMinute !== undefined && rl.maxRequestsPerMinute < 1) {
      errors.push({ field: 'rateLimitPolicy.maxRequestsPerMinute', message: 'must be >= 1', code: 'INVALID_RATE_LIMIT' });
    }
    if (rl.maxTokensPerMinute !== undefined && rl.maxTokensPerMinute < 1) {
      errors.push({ field: 'rateLimitPolicy.maxTokensPerMinute', message: 'must be >= 1', code: 'INVALID_RATE_LIMIT' });
    }
    if (rl.maxConcurrentRequests !== undefined && rl.maxConcurrentRequests < 1) {
      errors.push({ field: 'rateLimitPolicy.maxConcurrentRequests', message: 'must be >= 1', code: 'INVALID_RATE_LIMIT' });
    }
  }

  private validateFallbackPolicy(
    payload: IAiProviderConfigPayload,
    context: IAiProviderConfigValidationContext,
    errors: IAiConfigValidationError[],
  ): void {
    const fp = payload.fallbackPolicy;
    if (!fp) return;
    if (fp.fallbackProviderKeys.includes(context.providerKey)) {
      errors.push({
        field: 'fallbackPolicy.fallbackProviderKeys',
        message: 'A provider cannot list itself as its own fallback',
        code: 'INCOMPATIBLE_FALLBACK',
      });
    }
    if (fp.fallbackProviderKeys.length > AI_CONFIG_CONSTANTS.MAX_FALLBACK_CHAIN_LENGTH) {
      errors.push({
        field: 'fallbackPolicy.fallbackProviderKeys',
        message: `fallbackProviderKeys cannot exceed ${AI_CONFIG_CONSTANTS.MAX_FALLBACK_CHAIN_LENGTH} entries`,
        code: 'INVALID_FALLBACK_POLICY',
      });
    }
  }

  private validateModelParameters(payload: IAiProviderConfigPayload, errors: IAiConfigValidationError[]): void {
    const mp = payload.modelParameters;
    if (!mp) return;
    if (
      mp.temperature !== undefined &&
      (mp.temperature < AI_CONFIG_CONSTANTS.MIN_TEMPERATURE || mp.temperature > AI_CONFIG_CONSTANTS.MAX_TEMPERATURE)
    ) {
      errors.push({
        field: 'modelParameters.temperature',
        message: `temperature must be between ${AI_CONFIG_CONSTANTS.MIN_TEMPERATURE} and ${AI_CONFIG_CONSTANTS.MAX_TEMPERATURE}`,
        code: 'INVALID_MODEL_PARAMETERS',
      });
    }
    if (mp.topP !== undefined && (mp.topP < AI_CONFIG_CONSTANTS.MIN_TOP_P || mp.topP > AI_CONFIG_CONSTANTS.MAX_TOP_P)) {
      errors.push({
        field: 'modelParameters.topP',
        message: `topP must be between ${AI_CONFIG_CONSTANTS.MIN_TOP_P} and ${AI_CONFIG_CONSTANTS.MAX_TOP_P}`,
        code: 'INVALID_MODEL_PARAMETERS',
      });
    }
    if (mp.maxTokens !== undefined && mp.maxTokens < 1) {
      errors.push({ field: 'modelParameters.maxTokens', message: 'maxTokens must be >= 1', code: 'INVALID_MODEL_PARAMETERS' });
    }
  }

  private validateUsageLimits(payload: IAiProviderConfigPayload, errors: IAiConfigValidationError[]): void {
    const limits = payload.limits;
    if (!limits) return;
    const numericFields: Array<keyof typeof limits> = [
      'maxTokensPerRequest',
      'maxTokensPerDay',
      'maxRequestsPerDay',
      'maxCostPerDayUsd',
      'maxCostPerMonthUsd',
    ];
    for (const field of numericFields) {
      const value = limits[field];
      if (value !== undefined && value < 0) {
        errors.push({ field: `limits.${field}`, message: `${field} must be >= 0`, code: 'INVALID_USAGE_LIMIT' });
      }
    }
    if (
      limits.budgetAlertThresholdPercent !== undefined &&
      (limits.budgetAlertThresholdPercent < 0 || limits.budgetAlertThresholdPercent > 100)
    ) {
      errors.push({
        field: 'limits.budgetAlertThresholdPercent',
        message: 'budgetAlertThresholdPercent must be between 0 and 100',
        code: 'INVALID_USAGE_LIMIT',
      });
    }
  }

  private validateCredentials(payload: IAiProviderConfigPayload, errors: IAiConfigValidationError[]): void {
    const credentials = payload.credentials;
    if (!credentials) return;
    if (!credentials.credentialRef?.trim()) {
      errors.push({
        field: 'credentials.credentialRef',
        message: 'credentialRef is required when credentials are configured',
        code: 'MISSING_REQUIRED_FIELD',
      });
      return;
    }
    // This module never stores secrets — reject values shaped like raw keys/tokens
    // rather than a reference (heuristic: long opaque strings or common key prefixes).
    const looksLikeSecret =
      credentials.credentialRef.length > 128 || /^(sk-|Bearer\s|xox[baprs]-)/i.test(credentials.credentialRef);
    if (looksLikeSecret) {
      errors.push({
        field: 'credentials.credentialRef',
        message: 'credentialRef must be a reference to an externally stored credential, not a raw secret value',
        code: 'CREDENTIAL_REFERENCE_ONLY',
      });
    }
  }
}
