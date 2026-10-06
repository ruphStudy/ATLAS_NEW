import { SortOrderEnum } from '../../../common/dto/pagination.dto';

// =============================================================
// AI Provider Expansion Framework – Core Interfaces & Enums
//
// Tracks rollout maturity (draft/beta/active/deprecated/disabled),
// versioning/backward-compatibility, adapter compatibility and tenant
// eligibility for a provider already known to the AI Provider Foundation
// (`AiProviderRegistry`, `ai/interfaces#IAiProvider`) and/or the
// persisted `AiProviderRegistryModule` catalog. `providerKey` is always a
// plain reference into those — this module never re-implements the
// foundation registry, factory, capability matrix, credentials, cost/
// usage tracking or health monitoring it reads from.
// =============================================================

export enum AiProviderRolloutState {
  DRAFT = 'DRAFT',
  BETA = 'BETA',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  DISABLED = 'DISABLED',
}

export enum AdapterCompatibilityStatus {
  COMPATIBLE = 'COMPATIBLE',
  INCOMPATIBLE = 'INCOMPATIBLE',
  UNVALIDATED = 'UNVALIDATED',
}

export enum EligibilityScope {
  ALL = 'ALL',
  ALLOWLIST = 'ALLOWLIST',
}

// ── Core Entity ────────────────────────────────────────────────

export interface IAiProviderExpansion {
  id: string;
  providerKey: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  rolloutState: AiProviderRolloutState;
  version: number;
  apiVersionLabel?: string | null;
  backwardCompatibleApiVersions: string[];
  eligibilityScope: EligibilityScope;
  eligibleWorkspaceIds: string[];
  adapterCompatibilityStatus: AdapterCompatibilityStatus;
  compatibilityIssues: string[];
  featureFlags: Record<string, unknown>;
  onboardedAt?: Date | null;
  betaAt?: Date | null;
  activatedAt?: Date | null;
  deprecatedAt?: Date | null;
  disabledAt?: Date | null;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiProviderExpansionHistory {
  id: string;
  expansionId: string;
  version: number;
  rolloutState: AiProviderRolloutState;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

// ── Adapter Compatibility ─────────────────────────────────────

export interface IAdapterCompatibilityResult {
  providerKey: string;
  status: AdapterCompatibilityStatus;
  issues: string[];
  checkedAt: Date;
}

// ── Eligibility ────────────────────────────────────────────────

export interface IEligibilityResult {
  eligible: boolean;
  reason?: string;
}

// ── Validation ────────────────────────────────────────────────

export interface IExpansionValidationError {
  field: string;
  message: string;
  code: string;
}

export interface IExpansionValidationResult {
  valid: boolean;
  errors: IExpansionValidationError[];
  warnings: string[];
}

// ── Filters ───────────────────────────────────────────────────

export interface IAiProviderExpansionFilterOptions {
  providerKey?: string;
  workspaceId?: string;
  organizationId?: string;
  rolloutState?: AiProviderRolloutState;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrderEnum;
}

// ── Cache ─────────────────────────────────────────────────────

export interface ICachedAiProviderExpansion {
  expansion: IAiProviderExpansion;
  cachedAt: Date;
}
