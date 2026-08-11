// =============================================================
// Marketplace Capability Management – Core Interfaces & Enums
// =============================================================

import { MarketplaceCapability, MarketplaceKey } from '../../marketplace-provider/interfaces';

// ── Re-export foundation capability enum ─────────────────────

export { MarketplaceCapability } from '../../marketplace-provider/interfaces';

// ── Capability Status ─────────────────────────────────────────

export enum CapabilityStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
  UNSUPPORTED = 'UNSUPPORTED',
  EXPERIMENTAL = 'EXPERIMENTAL',
}

// ── Support Level ─────────────────────────────────────────────

export enum CapabilitySupportLevel {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  READ_ONLY = 'READ_ONLY',
  WRITE_ONLY = 'WRITE_ONLY',
  MANUAL = 'MANUAL',
  EXPERIMENTAL = 'EXPERIMENTAL',
  UNSUPPORTED = 'UNSUPPORTED',
}

// ── Resolution Result Status ──────────────────────────────────

export enum CapabilityResolutionStatus {
  SUPPORTED = 'SUPPORTED',
  UNSUPPORTED = 'UNSUPPORTED',
  PARTIALLY_SUPPORTED = 'PARTIALLY_SUPPORTED',
  DISABLED = 'DISABLED',
  RESTRICTED = 'RESTRICTED',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  CONFIGURATION_MISSING = 'CONFIGURATION_MISSING',
  CREDENTIALS_MISSING = 'CREDENTIALS_MISSING',
}

// ── Capability Category ───────────────────────────────────────

export enum CapabilityCategory {
  LISTING = 'LISTING',
  INVENTORY = 'INVENTORY',
  ORDER = 'ORDER',
  SHIPMENT = 'SHIPMENT',
  RETURN = 'RETURN',
  PRICING = 'PRICING',
  CATALOG = 'CATALOG',
  REPORT = 'REPORT',
  INTEGRATION = 'INTEGRATION',
  COMMERCE = 'COMMERCE',
  IMPORT = 'IMPORT',
  BULK = 'BULK',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
}

// ── Capability Event ──────────────────────────────────────────

export enum CapabilityEvent {
  CREATED = 'marketplace-capability-created',
  UPDATED = 'marketplace-capability-updated',
  ENABLED = 'marketplace-capability-enabled',
  DISABLED = 'marketplace-capability-disabled',
  DEPRECATED = 'marketplace-capability-deprecated',
  ARCHIVED = 'marketplace-capability-archived',
  VERSION_PUBLISHED = 'marketplace-capability-version-published',
  PROVIDER_CAPABILITY_DECLARED = 'marketplace-provider-capability-declared',
  PROVIDER_CAPABILITY_UPDATED = 'marketplace-provider-capability-updated',
  VALIDATION_FAILED = 'marketplace-capability-validation-failed',
  COMPATIBILITY_FAILED = 'marketplace-capability-compatibility-failed',
  CACHE_INVALIDATED = 'marketplace-capability-cache-invalidated',
}

// ── Override Type ─────────────────────────────────────────────

export enum CapabilityOverrideType {
  GLOBAL = 'GLOBAL',
  PROVIDER = 'PROVIDER',
  WORKSPACE = 'WORKSPACE',
  ACCOUNT = 'ACCOUNT',
  COUNTRY = 'COUNTRY',
  REGION = 'REGION',
  FEATURE_FLAG = 'FEATURE_FLAG',
}

// ── Compatibility Issue Type ──────────────────────────────────

export enum CompatibilityIssueType {
  VERSION_CONFLICT = 'VERSION_CONFLICT',
  DEPRECATED_CAPABILITY = 'DEPRECATED_CAPABILITY',
  UNSUPPORTED_PROVIDER_VERSION = 'UNSUPPORTED_PROVIDER_VERSION',
  UNSUPPORTED_API_VERSION = 'UNSUPPORTED_API_VERSION',
  INCOMPATIBLE_MAPPING_VERSION = 'INCOMPATIBLE_MAPPING_VERSION',
  MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
}

// ── Core Interfaces ───────────────────────────────────────────

export interface IMarketplaceCapabilityDefinition {
  id: string;
  capabilityKey: string;
  name: string;
  description?: string | null;
  category: CapabilityCategory;
  status: CapabilityStatus;
  version: number;
  publishedVersion?: number | null;
  inputSchema?: Record<string, unknown> | null;
  outputSchema?: Record<string, unknown> | null;
  supportedOperations: string[];
  requiredPermissions: string[];
  requiredConfiguration: Record<string, unknown>;
  requiredCredentials: string[];
  requiredProviderVersion?: string | null;
  requiredApiVersion?: string | null;
  countryRestrictions: string[];
  regionRestrictions: string[];
  marketplaceRestrictions: string[];
  featureFlags: Record<string, unknown>;
  dependencies: CapabilityDependency[];
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IMarketplaceCapabilityDefinitionHistory {
  id: string;
  definitionId: string;
  capabilityKey: string;
  version: number;
  status: CapabilityStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IMarketplaceProviderCapabilityDeclaration {
  id: string;
  workspaceId?: string | null;
  providerKey: string;
  capabilityKey: string;
  marketplaceKey?: string | null;
  accountId?: string | null;
  supportLevel: CapabilitySupportLevel;
  supportedOperations: string[];
  countryAvailability: string[];
  regionAvailability: string[];
  marketplaceAvailability: string[];
  accountAvailability: string[];
  limitations: Record<string, unknown>;
  rateLimits: Record<string, unknown>;
  batchLimits: Record<string, unknown>;
  featureRestrictions: Record<string, unknown>;
  providerMetadata: Record<string, unknown>;
  capabilityVersion?: string | null;
  providerVersion?: string | null;
  apiVersion?: string | null;
  status: CapabilityStatus;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IMarketplaceCapabilityOverride {
  id: string;
  workspaceId?: string | null;
  providerKey?: string | null;
  capabilityKey: string;
  accountId?: string | null;
  marketplaceKey?: string | null;
  country?: string | null;
  region?: string | null;
  featureFlag?: string | null;
  overrideType: CapabilityOverrideType;
  overrideValue: Record<string, unknown>;
  priority: number;
  reason?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Dependency ────────────────────────────────────────────────

export interface CapabilityDependency {
  capabilityKey: string;
  required: boolean;
  description?: string;
}

// ── Compatibility Interfaces ──────────────────────────────────

export interface CompatibilityCheckRequest {
  capabilityKey: string;
  capabilityVersion?: string | null;
  providerKey: string;
  providerVersion?: string | null;
  apiVersion?: string | null;
  adapterVersion?: string | null;
  marketplaceSchemaVersion?: string | null;
  listingMappingVersion?: string | null;
}

export interface CompatibilityIssue {
  type: CompatibilityIssueType;
  message: string;
  detail?: string | null;
  retryable: boolean;
}

export interface CompatibilityCheckResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
  warnings: string[];
}

// ── Resolution Interfaces ─────────────────────────────────────

export interface CapabilityResolutionRequest {
  workspaceId: string;
  providerKey: string;
  capabilityKey: string;
  marketplaceKey?: MarketplaceKey | null;
  accountId?: string | null;
  country?: string | null;
  region?: string | null;
  requiredCapabilityVersion?: string | null;
  providerVersion?: string | null;
  apiVersion?: string | null;
  featureFlags?: Record<string, boolean>;
  providerStatus?: string | null;
  accountStatus?: string | null;
}

export interface CapabilityResolutionResult {
  status: CapabilityResolutionStatus;
  capabilityKey: string;
  providerKey: string;
  workspaceId: string;
  supportLevel?: CapabilitySupportLevel | null;
  declaration?: IMarketplaceProviderCapabilityDeclaration | null;
  definition?: IMarketplaceCapabilityDefinition | null;
  reasons: string[];
  resolvedAt: Date;
  resolutionTimeMs: number;
}

// ── Validation Interfaces ─────────────────────────────────────

export interface CapabilityValidationRequest {
  workspaceId: string;
  providerKey: string;
  capabilityKey: string;
  accountId?: string | null;
  country?: string | null;
  region?: string | null;
  marketplaceKey?: string | null;
  requiredOperations?: string[];
  requiredVersion?: string | null;
  providerStatus?: string | null;
  accountStatus?: string | null;
  featureFlags?: Record<string, boolean>;
}

export interface CapabilityValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ── Discovery Interfaces ──────────────────────────────────────

export interface CapabilityDiscoveryRequest {
  workspaceId?: string | null;
  providerKey?: string | null;
  marketplaceKey?: string | null;
  accountId?: string | null;
  country?: string | null;
  region?: string | null;
  category?: CapabilityCategory | null;
  status?: CapabilityStatus | null;
  supportLevel?: CapabilitySupportLevel | null;
  version?: number | null;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string | null;
}

// ── Filter Options ────────────────────────────────────────────

export interface CapabilityFilterOptions {
  workspaceId?: string | null;
  providerKey?: string | null;
  capabilityKey?: string | null;
  category?: CapabilityCategory | null;
  status?: CapabilityStatus | null;
  marketplaceKey?: string | null;
  accountId?: string | null;
  country?: string | null;
  region?: string | null;
  supportLevel?: CapabilitySupportLevel | null;
  search?: string | null;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Cache Entries ─────────────────────────────────────────────

export interface CachedCapabilityDefinition {
  definition: IMarketplaceCapabilityDefinition;
  cachedAt: number;
}

export interface CachedCapabilityResolution {
  result: CapabilityResolutionResult;
  cachedAt: number;
}

export interface CachedProviderDeclaration {
  declaration: IMarketplaceProviderCapabilityDeclaration;
  cachedAt: number;
}

// ── Metrics ───────────────────────────────────────────────────

export interface CapabilityMetricsSnapshot {
  capabilityKey: string;
  resolutionRequests: number;
  validationSuccess: number;
  validationFailures: number;
  unsupportedRequests: number;
  versionMismatches: number;
  dependencyFailures: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface AggregateCapabilityMetrics {
  totalResolutionRequests: number;
  totalValidationSuccess: number;
  totalValidationFailures: number;
  totalUnsupportedRequests: number;
  totalVersionMismatches: number;
  totalDependencyFailures: number;
  cacheHitRate: number;
  byCapability: Record<string, CapabilityMetricsSnapshot>;
}

// ── Dependency Resolution ─────────────────────────────────────

export interface DependencyResolutionResult {
  ordered: string[];
  missing: string[];
  circular: string[][];
  valid: boolean;
}

// ── Event Payload ─────────────────────────────────────────────

export interface CapabilityEventPayload {
  event: CapabilityEvent;
  capabilityKey: string;
  workspaceId?: string | null;
  providerKey?: string | null;
  version?: number | null;
  changedBy?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
