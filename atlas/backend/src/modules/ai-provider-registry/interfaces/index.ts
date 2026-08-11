import { AiCapability, IAiModelDescriptor } from '../../../ai/interfaces';
import { SortOrderEnum } from '../../../common/dto/pagination.dto';

// ── Enums ─────────────────────────────────────────────────────

/**
 * ProviderRegistrationStatus
 *
 * Lifecycle of a persisted registry entry (catalog bookkeeping) — distinct
 * from the AI Provider Foundation's in-memory `AiProviderRegistry`, which
 * holds live `IAiProvider` instances keyed by provider key.
 */
export enum ProviderRegistrationStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

// ── Core entity ───────────────────────────────────────────────

export interface IAiProviderRegistryEntity {
  id: string;
  workspaceId?: string | null;
  providerKey: string;
  adapterKey: string;
  displayName: string;
  version: string;
  status: ProviderRegistrationStatus;
  capabilities: AiCapability[];
  supportedModels: IAiModelDescriptor[];
  regions: string[];
  priority: number;
  isDefault: boolean;
  fallbackOrder: string[];
  metadata?: Record<string, unknown>;
  lastSyncedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Validation ────────────────────────────────────────────────

export interface IRegistryValidationError {
  field: string;
  message: string;
  code: string;
}

export interface IRegistryValidationResult {
  valid: boolean;
  errors: IRegistryValidationError[];
  warnings: string[];
}

// ── Cache ─────────────────────────────────────────────────────

export interface ICachedAiProviderRegistryEntity {
  entry: IAiProviderRegistryEntity;
  cachedAt: Date;
  ttlMs: number;
}

// ── Filter / Discovery ────────────────────────────────────────

export interface IAiProviderRegistryFilterOptions {
  workspaceId?: string;
  providerKey?: string;
  adapterKey?: string;
  capability?: AiCapability;
  modelId?: string;
  region?: string;
  status?: ProviderRegistrationStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrderEnum;
}

// ── Resolution ────────────────────────────────────────────────

export interface IAiProviderRegistryResolutionCriteria {
  workspaceId: string;
  capability?: AiCapability;
  modelId?: string;
  region?: string;
  preferredProviderKey?: string;
}
