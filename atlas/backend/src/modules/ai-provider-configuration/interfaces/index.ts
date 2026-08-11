import {
  AiCapability,
  IAiFallbackPolicy,
  IAiModelDescriptor,
  IAiProviderCredentials,
  IAiRateLimitPolicy,
  IAiRetryPolicy,
  IAiTimeoutPolicy,
} from '../../../ai/interfaces';
import { SortOrderEnum } from '../../../common/dto/pagination.dto';

// ── Enums ─────────────────────────────────────────────────────

/**
 * AiConfigScope
 *
 * Configuration precedence, most specific first: MODEL > USE_CASE >
 * WORKSPACE > GLOBAL. A MODEL/USE_CASE scoped record still belongs to a
 * workspace (or is global) — `scope` narrows *what* it targets within
 * that workspace, `workspaceId` narrows *who* it applies to.
 */
export enum AiConfigScope {
  GLOBAL = 'GLOBAL',
  WORKSPACE = 'WORKSPACE',
  USE_CASE = 'USE_CASE',
  MODEL = 'MODEL',
}

export enum AiConfigStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

// ── Payload sub-sections ──────────────────────────────────────
// Reuses the AI Provider Foundation's generic contracts (src/ai/interfaces)
// wherever a shape already exists there, instead of redefining them.

export interface IAiConcurrencyConfig {
  maxConcurrentRequests?: number;
}

export interface IAiQueueSettingsConfig {
  queueName?: string;
  maxQueueSize?: number;
  concurrency?: number;
}

export interface IAiModelParametersConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  seed?: number;
  responseFormat?: string;
}

export interface IAiUsageLimitsConfig {
  maxTokensPerRequest?: number;
  maxTokensPerDay?: number;
  maxRequestsPerDay?: number;
  maxCostPerDayUsd?: number;
  maxCostPerMonthUsd?: number;
  budgetAlertThresholdPercent?: number;
}

export interface IAiCachingConfig {
  enabled?: boolean;
  ttlSeconds?: number;
}

export interface IAiLoggingConfig {
  logRequests?: boolean;
  logResponses?: boolean;
  redactFields?: string[];
}

export interface IAiSafetyConfig {
  contentFilterEnabled?: boolean;
  blockedTerms?: string[];
  piiRedactionEnabled?: boolean;
}

export interface IAiValidationOptionsConfig {
  schemaValidationEnabled?: boolean;
  maxInputLength?: number;
}

/**
 * IAiProviderConfigPayload
 *
 * The full, versioned configuration body stored per record. Never
 * contains raw credentials/secrets — only a reference (`credentialRef`)
 * to wherever the deploying module stores them.
 */
export interface IAiProviderConfigPayload {
  capabilities?: AiCapability[];
  models?: IAiModelDescriptor[];
  defaultModelId?: string;
  fallbackOrder?: string[];
  baseUrl?: string;
  apiVersion?: string;
  region?: string;
  timeoutPolicy?: IAiTimeoutPolicy;
  retryPolicy?: IAiRetryPolicy;
  rateLimitPolicy?: IAiRateLimitPolicy;
  fallbackPolicy?: IAiFallbackPolicy;
  concurrency?: IAiConcurrencyConfig;
  queue?: IAiQueueSettingsConfig;
  modelParameters?: IAiModelParametersConfig;
  limits?: IAiUsageLimitsConfig;
  featureFlags?: Record<string, boolean>;
  caching?: IAiCachingConfig;
  logging?: IAiLoggingConfig;
  safety?: IAiSafetyConfig;
  validation?: IAiValidationOptionsConfig;
  credentials?: IAiProviderCredentials;
  metadata?: Record<string, unknown>;
}

// ── Core entities ─────────────────────────────────────────────

export interface IAiProviderConfigEntity {
  id: string;
  workspaceId?: string | null;
  scope: AiConfigScope;
  providerKey: string;
  useCase?: string | null;
  modelId?: string | null;
  name: string;
  description?: string | null;
  status: AiConfigStatus;
  priority: number;
  version: number;
  publishedVersion?: number | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  payload: IAiProviderConfigPayload;
  createdBy?: string | null;
  updatedBy?: string | null;
  approvedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiProviderConfigHistoryEntity {
  id: string;
  configId: string;
  workspaceId?: string | null;
  providerKey: string;
  version: number;
  status: AiConfigStatus;
  payload: IAiProviderConfigPayload;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

// ── Validation ────────────────────────────────────────────────

export interface IAiConfigValidationError {
  field: string;
  message: string;
  code: string;
}

export interface IAiConfigValidationResult {
  valid: boolean;
  errors: IAiConfigValidationError[];
  warnings: string[];
}

// ── Cache ─────────────────────────────────────────────────────

export interface ICachedAiProviderConfig {
  config: IAiProviderConfigEntity;
  cachedAt: Date;
  ttlMs: number;
}

// ── Filter / Sort ─────────────────────────────────────────────

export interface IAiProviderConfigFilterOptions {
  workspaceId?: string;
  providerKey?: string;
  useCase?: string;
  modelId?: string;
  scope?: AiConfigScope;
  status?: AiConfigStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrderEnum;
}

// ── Resolution ────────────────────────────────────────────────

/**
 * IAiConfigResolutionCriteria
 *
 * Input to deterministic precedence resolution: MODEL > USE_CASE >
 * WORKSPACE > GLOBAL. Each tier is checked in order; the first published,
 * effective, non-expired match wins.
 */
export interface IAiConfigResolutionCriteria {
  workspaceId: string;
  providerKey: string;
  useCase?: string;
  modelId?: string;
}
