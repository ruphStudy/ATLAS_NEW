// =============================================================
// Marketplace Provider Factory – Core Interfaces & Enums
// =============================================================

import {
  IMarketplaceProviderAdapter,
  MarketplaceCapability,
  MarketplaceKey,
  MarketplaceProviderStatus,
} from '../../marketplace-provider/interfaces';
import { IMarketplaceProviderConfig } from '../../marketplace-provider-config/interfaces';
import { IMarketplaceProviderCredential } from '../../marketplace-provider-credentials/interfaces';

// ── Instance Lifecycle ────────────────────────────────────────

export enum ProviderInstanceState {
  CREATING = 'CREATING',
  INITIALIZING = 'INITIALIZING',
  READY = 'READY',
  DEGRADED = 'DEGRADED',
  REFRESHING = 'REFRESHING',
  INVALID = 'INVALID',
  FAILED = 'FAILED',
  DISPOSED = 'DISPOSED',
}

// ── Factory Events ────────────────────────────────────────────

export enum ProviderFactoryEvent {
  CREATION_REQUESTED = 'marketplace-provider-instance-creation-requested',
  CREATED = 'marketplace-provider-instance-created',
  INITIALIZED = 'marketplace-provider-instance-initialized',
  REFRESHED = 'marketplace-provider-instance-refreshed',
  INVALIDATED = 'marketplace-provider-instance-invalidated',
  DISPOSED = 'marketplace-provider-instance-disposed',
  FAILED = 'marketplace-provider-instance-failed',
  FALLBACK_SELECTED = 'marketplace-provider-fallback-selected',
}

// ── Factory Request ───────────────────────────────────────────

export interface ProviderFactoryRequest {
  workspaceId: string;
  providerKey?: string | null;
  marketplaceKey?: MarketplaceKey | null;
  accountId?: string | null;
  country?: string | null;
  region?: string | null;
  currency?: string | null;
  locale?: string | null;
  capability?: MarketplaceCapability | null;
  apiVersion?: string | null;
  requestMetadata?: Record<string, unknown>;
  /** If true, skip the instance cache and force a fresh creation */
  forceRefresh?: boolean;
  /** If true, allow fallback to another provider when preferred is unavailable */
  fallbackEnabled?: boolean;
}

// ── Resolved Dependencies ─────────────────────────────────────

export interface ResolvedProviderDependencies {
  adapter: IMarketplaceProviderAdapter;
  config: IMarketplaceProviderConfig | null;
  credential: IMarketplaceProviderCredential | null;
}

// ── Provider Instance ─────────────────────────────────────────

export interface ProviderInstance {
  instanceId: string;
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  marketplaceKey?: MarketplaceKey | null;
  country?: string | null;
  region?: string | null;
  apiVersion?: string | null;
  state: ProviderInstanceState;
  adapter: IMarketplaceProviderAdapter;
  config: IMarketplaceProviderConfig | null;
  /** Credential is stored as the encrypted record; decryption happens at call boundary */
  credential: IMarketplaceProviderCredential | null;
  configVersion?: number | null;
  credentialVersion?: number | null;
  encryptionVersion?: string | null;
  createdAt: Date;
  initializedAt?: Date | null;
  lastRefreshedAt?: Date | null;
  expiresAt?: Date | null;
  failureReason?: string | null;
}

// ── Cache Entry ───────────────────────────────────────────────

export interface ProviderInstanceCacheEntry {
  instance: ProviderInstance;
  cachedAt: Date;
  ttlMs: number;
}

// ── Resolution Result ─────────────────────────────────────────

export interface ProviderResolutionResult {
  instance: ProviderInstance;
  cacheHit: boolean;
  fallbackUsed: boolean;
  resolutionTimeMs: number;
}

// ── Factory Metrics Snapshot ──────────────────────────────────

export interface FactoryMetricsSnapshot {
  totalRequests: number;
  instancesCreated: number;
  instancesReused: number;
  cacheHits: number;
  cacheMisses: number;
  initializationFailures: number;
  fallbackUsageCount: number;
  providerResolutionFailures: number;
  credentialResolutionFailures: number;
  averageInitTimeMs: number;
}

// ── Event Payload ─────────────────────────────────────────────

export interface ProviderFactoryEventPayload {
  event: ProviderFactoryEvent;
  instanceId?: string | null;
  workspaceId: string;
  providerKey: string;
  accountId?: string | null;
  marketplaceKey?: string | null;
  state?: ProviderInstanceState | null;
  fallbackProviderKey?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// ── Validation Result ─────────────────────────────────────────

export interface FactoryValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
