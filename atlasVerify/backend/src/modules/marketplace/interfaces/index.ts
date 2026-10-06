import {
  MarketplaceCapability,
  MarketplaceKey,
  MarketplaceProviderConfiguration,
} from '@modules/marketplace-provider/interfaces';

// =============================================================
// Multi-Marketplace Framework — Central Facade Contracts
//
// This module does not own marketplace business logic. It composes
// the existing provider registry/factory, account, capability,
// catalog-sync, inventory-sync, health and error-normalizer modules
// into a single workspace-scoped API surface.
// =============================================================

export enum MarketplaceFrameworkEvent {
  REGISTERED = 'marketplace-framework-registered',
  ENABLED = 'marketplace-framework-enabled',
  DISABLED = 'marketplace-framework-disabled',
  CONFIGURED = 'marketplace-framework-configured',
  PRIORITY_CHANGED = 'marketplace-framework-priority-changed',
  DEFAULT_CHANGED = 'marketplace-framework-default-changed',
  ROUTED = 'marketplace-framework-routed',
  ROUTING_FAILED = 'marketplace-framework-routing-failed',
}

export interface MarketplaceFrameworkEventPayload {
  event: MarketplaceFrameworkEvent;
  workspaceId: string;
  marketplaceKey: string;
  accountId?: string | null;
  capability?: MarketplaceCapability | null;
  performedBy?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// ── Marketplace Summary (registry + workspace config merged) ───

export interface IMarketplaceSummary {
  marketplaceKey: string;
  providerKey: string;
  displayName: string;
  isRegistered: boolean;
  isActive: boolean;
  isEnabled: boolean;
  isDefault: boolean;
  priority: number;
  supportedCapabilities: MarketplaceCapability[];
  supportedCountries: string[];
  configuration: MarketplaceProviderConfiguration | null;
}

// ── Operation Routing ───────────────────────────────────────────

export interface IMarketplaceOperationRouteRequest {
  marketplaceKey?: MarketplaceKey;
  providerKey?: string;
  capability?: MarketplaceCapability;
  accountId?: string;
  country?: string;
  region?: string;
  idempotencyKey?: string;
}

export interface IMarketplaceOperationRouteError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface IMarketplaceOperationRouteResult {
  requestedMarketplaceKey?: string | null;
  success: boolean;
  providerKey?: string;
  marketplaceKey?: string | null;
  accountId?: string | null;
  instanceId?: string;
  error?: IMarketplaceOperationRouteError;
}

// ── Cross-Marketplace SKU / Listing References ──────────────────

export interface ICrossMarketplaceSkuMappingEntry {
  marketplaceKey: string;
  providerKey: string;
  accountId: string;
  refType: string;
  externalId: string;
  externalSku?: string | null;
  externalTitle?: string | null;
  status: string;
  lastSyncedAt?: Date | null;
}

// ── Cross-Marketplace Inventory Availability ────────────────────

export interface ICrossMarketplaceInventoryEntry {
  marketplaceKey: string;
  providerKey: string;
  accountId: string;
  externalId: string;
  externalSku?: string | null;
  warehouseId?: string | null;
  status: string;
  available: number;
  reserved: number;
  incoming: number;
  lastSyncedAt?: Date | null;
}
