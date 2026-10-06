import { AiCapability } from '../../../ai/interfaces';
import { SortOrderEnum } from '../../../common/dto/pagination.dto';

// ── Enums ─────────────────────────────────────────────────────

export enum CapabilityDefinitionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  DISABLED = 'DISABLED',
}

export enum CapabilitySupportLevel {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  UNSUPPORTED = 'UNSUPPORTED',
}

/**
 * CapabilityOverrideScope
 *
 * Precedence, most specific first: MODEL > PROVIDER > WORKSPACE > GLOBAL.
 * PROVIDER/MODEL overrides describe what the AI backend actually
 * supports; WORKSPACE overrides describe workspace-level policy
 * (enable/disable regardless of backend support); GLOBAL is the
 * capability's own baseline.
 */
export enum CapabilityOverrideScope {
  GLOBAL = 'GLOBAL',
  PROVIDER = 'PROVIDER',
  MODEL = 'MODEL',
  WORKSPACE = 'WORKSPACE',
}

export enum CapabilityOverrideStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

// ── Core shapes ───────────────────────────────────────────────

export interface IAiCapabilityLimits {
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxBatchSize?: number;
  maxInputSizeBytes?: number;
}

export interface IAiCapabilityDefinitionEntity {
  id: string;
  capabilityKey: AiCapability;
  version: string;
  status: CapabilityDefinitionStatus;
  displayName: string;
  description?: string | null;
  inputSchema?: Record<string, unknown> | null;
  outputSchema?: Record<string, unknown> | null;
  limits: IAiCapabilityLimits;
  dependencies: AiCapability[];
  requiredRoles: string[];
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiCapabilityOverrideEntity {
  id: string;
  scope: CapabilityOverrideScope;
  capabilityKey: AiCapability;
  workspaceId?: string | null;
  providerKey?: string | null;
  modelId?: string | null;
  supportLevel: CapabilitySupportLevel;
  status: CapabilityOverrideStatus;
  featureFlag?: string | null;
  schemaOverride?: Record<string, unknown> | null;
  limitsOverride?: IAiCapabilityLimits | null;
  priority: number;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Validation ────────────────────────────────────────────────

export interface IAiCapabilityValidationError {
  field: string;
  message: string;
  code: string;
}

export interface IAiCapabilityValidationResult {
  valid: boolean;
  errors: IAiCapabilityValidationError[];
  warnings: string[];
}

// ── Cache ─────────────────────────────────────────────────────

export interface ICachedAiCapabilityDefinition {
  definition: IAiCapabilityDefinitionEntity;
  cachedAt: Date;
  ttlMs: number;
}

export interface ICachedAiCapabilityResolution {
  result: IAiCapabilityResolutionResult;
  cachedAt: Date;
  ttlMs: number;
}

// ── Filter ────────────────────────────────────────────────────

export interface IAiCapabilityDefinitionFilterOptions {
  capabilityKey?: AiCapability;
  status?: CapabilityDefinitionStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrderEnum;
}

export interface IAiCapabilityOverrideFilterOptions {
  scope?: CapabilityOverrideScope;
  capabilityKey?: AiCapability;
  workspaceId?: string;
  providerKey?: string;
  modelId?: string;
  status?: CapabilityOverrideStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrderEnum;
}

// ── Resolution ────────────────────────────────────────────────

export interface IAiCapabilityResolutionCriteria {
  workspaceId: string;
  capabilityKey: AiCapability;
  providerKey?: string;
  modelId?: string;
  useCase?: string;
  region?: string;
  featureFlags?: string[];
  userRole?: string;
}

export interface IAiCapabilityResolutionResult {
  available: boolean;
  supportLevel: CapabilitySupportLevel;
  capabilityKey: AiCapability;
  providerKey?: string;
  modelId?: string;
  effectiveSchema?: {
    input?: Record<string, unknown> | null;
    output?: Record<string, unknown> | null;
  };
  effectiveLimits?: IAiCapabilityLimits;
  reasons: string[];
}
