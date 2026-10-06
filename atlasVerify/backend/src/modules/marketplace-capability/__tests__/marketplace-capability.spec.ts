import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { MarketplaceCapabilityRegistry } from '../registry/marketplace-capability.registry';
import { MarketplaceCapabilityCache } from '../cache/marketplace-capability.cache';
import { MarketplaceCapabilityValidator } from '../validator/marketplace-capability.validator';
import { MarketplaceCapabilityMetrics } from '../metrics/marketplace-capability.metrics';
import { MarketplaceCapabilityVersionManager } from '../version/marketplace-capability-version.manager';
import { MarketplaceCapabilityCompatibilityManager } from '../compatibility/marketplace-capability-compatibility.manager';
import {
  CapabilityCategory,
  CapabilityStatus,
  CapabilitySupportLevel,
  CapabilityResolutionStatus,
  IMarketplaceCapabilityDefinition,
  IMarketplaceProviderCapabilityDeclaration,
  CompatibilityIssueType,
} from '../interfaces';

// ── Factories ─────────────────────────────────────────────────

function makeDefinition(overrides?: Partial<IMarketplaceCapabilityDefinition>): IMarketplaceCapabilityDefinition {
  return {
    id: 'def-1',
    capabilityKey: 'PUBLISH_LISTING',
    name: 'Publish Listing',
    description: 'Publishes a product listing to the marketplace',
    category: CapabilityCategory.LISTING,
    status: CapabilityStatus.ACTIVE,
    version: 1,
    publishedVersion: 1,
    inputSchema: null,
    outputSchema: null,
    supportedOperations: ['CREATE', 'UPDATE'],
    requiredPermissions: ['listing:write'],
    requiredConfiguration: {},
    requiredCredentials: [],
    requiredProviderVersion: '1.0.0',
    requiredApiVersion: '2.0.0',
    countryRestrictions: [],
    regionRestrictions: [],
    marketplaceRestrictions: [],
    featureFlags: {},
    dependencies: [],
    metadata: {},
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

function makeDeclaration(overrides?: Partial<IMarketplaceProviderCapabilityDeclaration>): IMarketplaceProviderCapabilityDeclaration {
  return {
    id: 'decl-1',
    workspaceId: 'ws-1',
    providerKey: 'AMAZON_SP',
    capabilityKey: 'PUBLISH_LISTING',
    marketplaceKey: null,
    accountId: null,
    supportLevel: CapabilitySupportLevel.FULL,
    supportedOperations: ['CREATE', 'UPDATE'],
    countryAvailability: ['IN', 'US'],
    regionAvailability: [],
    marketplaceAvailability: [],
    accountAvailability: [],
    limitations: {},
    rateLimits: {},
    batchLimits: {},
    featureRestrictions: {},
    providerMetadata: {},
    capabilityVersion: '1.0.0',
    providerVersion: '2.0.0',
    apiVersion: '2.0.0',
    status: CapabilityStatus.ACTIVE,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

// ── Registry Tests ────────────────────────────────────────────

describe('MarketplaceCapabilityRegistry', () => {
  let registry: MarketplaceCapabilityRegistry;

  beforeEach(() => {
    registry = new MarketplaceCapabilityRegistry();
  });

  it('registers and retrieves a definition', () => {
    const def = makeDefinition();
    registry.register(def);
    expect(registry.getDefinition('PUBLISH_LISTING')).toEqual(def);
  });

  it('is case-insensitive for definition lookup', () => {
    registry.register(makeDefinition());
    expect(registry.getDefinition('publish_listing')).toBeDefined();
  });

  it('unregisters a definition', () => {
    registry.register(makeDefinition());
    registry.unregister('PUBLISH_LISTING');
    expect(registry.getDefinition('PUBLISH_LISTING')).toBeUndefined();
  });

  it('registers and retrieves a provider declaration', () => {
    const decl = makeDeclaration();
    registry.declareProviderCapability(decl);
    expect(registry.getDeclaration('AMAZON_SP', 'PUBLISH_LISTING', 'ws-1')).toEqual(decl);
  });

  it('falls back from workspace to global declaration', () => {
    const globalDecl = makeDeclaration({ workspaceId: null, id: 'global-decl' });
    registry.declareProviderCapability(globalDecl);
    // No workspace-specific declaration
    const result = registry.getDeclaration('AMAZON_SP', 'PUBLISH_LISTING', 'ws-other');
    expect(result?.id).toBe('global-decl');
  });

  it('returns supported capabilities for provider', () => {
    registry.declareProviderCapability(makeDeclaration());
    registry.declareProviderCapability(makeDeclaration({ capabilityKey: 'UPDATE_LISTING', id: 'decl-2' }));
    const supported = registry.getSupportedCapabilitiesForProvider('AMAZON_SP', 'ws-1');
    expect(supported).toContain('PUBLISH_LISTING');
    expect(supported).toContain('UPDATE_LISTING');
  });

  it('excludes UNSUPPORTED declarations from supported list', () => {
    registry.declareProviderCapability(makeDeclaration({ supportLevel: CapabilitySupportLevel.UNSUPPORTED }));
    const supported = registry.getSupportedCapabilitiesForProvider('AMAZON_SP', 'ws-1');
    expect(supported).not.toContain('PUBLISH_LISTING');
  });

  it('seeds registry from arrays', () => {
    const defs = [makeDefinition(), makeDefinition({ capabilityKey: 'GET_LISTING', id: 'def-2', name: 'Get Listing' })];
    registry.seed(defs, []);
    expect(registry.definitionCount).toBe(2);
  });

  it('flush() empties registry', () => {
    registry.register(makeDefinition());
    registry.flush();
    expect(registry.definitionCount).toBe(0);
  });
});

// ── Cache Tests ───────────────────────────────────────────────

describe('MarketplaceCapabilityCache', () => {
  let cache: MarketplaceCapabilityCache;

  beforeEach(() => {
    cache = new MarketplaceCapabilityCache();
  });

  it('stores and retrieves a definition', () => {
    const def = makeDefinition();
    cache.setDefinition(def);
    expect(cache.getDefinition('PUBLISH_LISTING')).toEqual(def);
  });

  it('returns null for unknown key', () => {
    expect(cache.getDefinition('UNKNOWN')).toBeNull();
  });

  it('invalidates a definition and its resolutions', () => {
    const def = makeDefinition();
    cache.setDefinition(def);
    cache.invalidateDefinition('PUBLISH_LISTING');
    expect(cache.getDefinition('PUBLISH_LISTING')).toBeNull();
  });

  it('stores and retrieves a declaration', () => {
    const decl = makeDeclaration();
    cache.setDeclaration(decl);
    expect(cache.getDeclaration('AMAZON_SP', 'PUBLISH_LISTING', 'ws-1', null, null)).toEqual(decl);
  });

  it('invalidates declarations by provider', () => {
    cache.setDeclaration(makeDeclaration());
    cache.invalidateDeclarationsByProvider('AMAZON_SP');
    expect(cache.getDeclaration('AMAZON_SP', 'PUBLISH_LISTING', 'ws-1', null, null)).toBeNull();
  });

  it('stores and retrieves a resolution', () => {
    const result = {
      status: CapabilityResolutionStatus.SUPPORTED,
      capabilityKey: 'PUBLISH_LISTING',
      providerKey: 'AMAZON_SP',
      workspaceId: 'ws-1',
      supportLevel: CapabilitySupportLevel.FULL,
      declaration: null,
      definition: null,
      reasons: [],
      resolvedAt: new Date(),
      resolutionTimeMs: 5,
    };
    cache.setResolution('ws-1', 'AMAZON_SP', 'PUBLISH_LISTING', result);
    expect(cache.getResolution('ws-1', 'AMAZON_SP', 'PUBLISH_LISTING')).toEqual(result);
  });

  it('flush() clears all caches', () => {
    cache.setDefinition(makeDefinition());
    cache.flush();
    expect(cache.definitionSize).toBe(0);
    expect(cache.declarationSize).toBe(0);
    expect(cache.resolutionSize).toBe(0);
  });
});

// ── Validator Tests ───────────────────────────────────────────

describe('MarketplaceCapabilityValidator', () => {
  let validator: MarketplaceCapabilityValidator;

  beforeEach(() => {
    validator = new MarketplaceCapabilityValidator();
  });

  it('fails when definition is null', () => {
    const result = validator.validate(
      { workspaceId: 'ws-1', providerKey: 'AMAZON_SP', capabilityKey: 'PUBLISH_LISTING' },
      null,
      null,
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/does not exist/);
  });

  it('fails when declaration is null', () => {
    const result = validator.validate(
      { workspaceId: 'ws-1', providerKey: 'AMAZON_SP', capabilityKey: 'PUBLISH_LISTING' },
      makeDefinition(),
      null,
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/has not declared/);
  });

  it('passes with valid definition and declaration', () => {
    const result = validator.validate(
      { workspaceId: 'ws-1', providerKey: 'AMAZON_SP', capabilityKey: 'PUBLISH_LISTING' },
      makeDefinition(),
      makeDeclaration(),
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when country not in availability list', () => {
    const result = validator.validate(
      { workspaceId: 'ws-1', providerKey: 'AMAZON_SP', capabilityKey: 'PUBLISH_LISTING', country: 'DE' },
      makeDefinition(),
      makeDeclaration({ countryAvailability: ['IN', 'US'] }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('country'))).toBe(true);
  });

  it('fails when required operation is not supported', () => {
    const result = validator.validate(
      {
        workspaceId: 'ws-1',
        providerKey: 'AMAZON_SP',
        capabilityKey: 'PUBLISH_LISTING',
        requiredOperations: ['BULK_CREATE'],
      },
      makeDefinition(),
      makeDeclaration({ supportedOperations: ['CREATE', 'UPDATE'] }),
    );
    expect(result.valid).toBe(false);
  });

  it('warns on deprecated capability', () => {
    const result = validator.validate(
      { workspaceId: 'ws-1', providerKey: 'AMAZON_SP', capabilityKey: 'PUBLISH_LISTING' },
      makeDefinition({ status: CapabilityStatus.DEPRECATED }),
      makeDeclaration(),
    );
    expect(result.warnings.some((w) => w.includes('deprecated'))).toBe(true);
  });

  it('fails when support level is UNSUPPORTED', () => {
    const result = validator.validate(
      { workspaceId: 'ws-1', providerKey: 'AMAZON_SP', capabilityKey: 'PUBLISH_LISTING' },
      makeDefinition(),
      makeDeclaration({ supportLevel: CapabilitySupportLevel.UNSUPPORTED }),
    );
    expect(result.valid).toBe(false);
  });

  it('validateDefinitionPayload fails on missing capabilityKey', () => {
    const result = validator.validateDefinitionPayload({ name: 'Test', category: 'LISTING' });
    expect(result.valid).toBe(false);
  });
});

// ── Metrics Tests ─────────────────────────────────────────────

describe('MarketplaceCapabilityMetrics', () => {
  let metrics: MarketplaceCapabilityMetrics;

  beforeEach(() => {
    metrics = new MarketplaceCapabilityMetrics();
  });

  it('records resolution requests', () => {
    metrics.recordResolutionRequest('PUBLISH_LISTING');
    metrics.recordResolutionRequest('PUBLISH_LISTING');
    expect(metrics.getForCapability('PUBLISH_LISTING').resolutionRequests).toBe(2);
  });

  it('computes cache hit rate', () => {
    metrics.recordCacheHit('PUBLISH_LISTING');
    metrics.recordCacheHit('PUBLISH_LISTING');
    metrics.recordCacheMiss('PUBLISH_LISTING');
    const agg = metrics.getAggregate();
    expect(agg.cacheHitRate).toBeCloseTo(2 / 3);
  });

  it('resets for a single capability', () => {
    metrics.recordResolutionRequest('PUBLISH_LISTING');
    metrics.reset('PUBLISH_LISTING');
    expect(metrics.getForCapability('PUBLISH_LISTING').resolutionRequests).toBe(0);
  });

  it('resets all metrics', () => {
    metrics.recordResolutionRequest('PUBLISH_LISTING');
    metrics.recordResolutionRequest('GET_LISTING');
    metrics.reset();
    expect(metrics.getAggregate().totalResolutionRequests).toBe(0);
  });
});

// ── VersionManager Tests ──────────────────────────────────────

describe('MarketplaceCapabilityVersionManager', () => {
  let versionManager: MarketplaceCapabilityVersionManager;

  beforeEach(() => {
    versionManager = new MarketplaceCapabilityVersionManager();
  });

  it('increments patch version', () => {
    expect(versionManager.increment('1.0.0')).toBe('1.0.1');
    expect(versionManager.increment('2.3.9')).toBe('2.3.10');
  });

  it('satisfies when candidate >= required', () => {
    expect(versionManager.satisfies('2.0.0', '1.0.0')).toBe(true);
    expect(versionManager.satisfies('1.0.0', '1.0.0')).toBe(true);
    expect(versionManager.satisfies('1.0.0', '2.0.0')).toBe(false);
  });

  it('resolves simple dependency chain', () => {
    const definitions = new Map<string, IMarketplaceCapabilityDefinition>([
      ['SHIPMENT_SYNC', makeDefinition({ capabilityKey: 'SHIPMENT_SYNC', dependencies: [{ capabilityKey: 'ORDER_SYNC', required: true }] })],
      ['ORDER_SYNC', makeDefinition({ capabilityKey: 'ORDER_SYNC', dependencies: [] })],
    ]);
    const result = versionManager.resolveDependencies('SHIPMENT_SYNC', definitions);
    expect(result.valid).toBe(true);
    expect(result.ordered).toContain('ORDER_SYNC');
    expect(result.ordered).toContain('SHIPMENT_SYNC');
  });

  it('detects circular dependency', () => {
    const definitions = new Map<string, IMarketplaceCapabilityDefinition>([
      ['A', makeDefinition({ capabilityKey: 'A', dependencies: [{ capabilityKey: 'B', required: true }] })],
      ['B', makeDefinition({ capabilityKey: 'B', dependencies: [{ capabilityKey: 'A', required: true }] })],
    ]);
    const result = versionManager.resolveDependencies('A', definitions);
    expect(result.circular.length).toBeGreaterThan(0);
    expect(result.valid).toBe(false);
  });

  it('detects missing dependency', () => {
    const definitions = new Map<string, IMarketplaceCapabilityDefinition>([
      ['A', makeDefinition({ capabilityKey: 'A', dependencies: [{ capabilityKey: 'MISSING_DEP', required: true }] })],
    ]);
    const result = versionManager.resolveDependencies('A', definitions);
    expect(result.missing).toContain('MISSING_DEP');
    expect(result.valid).toBe(false);
  });
});

// ── CompatibilityManager Tests ────────────────────────────────

describe('MarketplaceCapabilityCompatibilityManager', () => {
  let compat: MarketplaceCapabilityCompatibilityManager;

  beforeEach(() => {
    compat = new MarketplaceCapabilityCompatibilityManager();
  });

  it('returns compatible when versions satisfy requirements', () => {
    const result = compat.check(
      { capabilityKey: 'PUBLISH_LISTING', providerKey: 'AMAZON_SP', providerVersion: '2.0.0', apiVersion: '3.0.0' },
      makeDefinition({ requiredProviderVersion: '1.0.0', requiredApiVersion: '2.0.0' }),
      makeDeclaration(),
    );
    expect(result.compatible).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('detects unsupported provider version', () => {
    const result = compat.check(
      { capabilityKey: 'PUBLISH_LISTING', providerKey: 'AMAZON_SP', providerVersion: '0.9.0' },
      makeDefinition({ requiredProviderVersion: '1.0.0' }),
      makeDeclaration(),
    );
    expect(result.compatible).toBe(false);
    expect(result.issues[0].type).toBe(CompatibilityIssueType.UNSUPPORTED_PROVIDER_VERSION);
  });

  it('detects unsupported API version', () => {
    const result = compat.check(
      { capabilityKey: 'PUBLISH_LISTING', providerKey: 'AMAZON_SP', apiVersion: '1.0.0' },
      makeDefinition({ requiredApiVersion: '2.0.0' }),
      makeDeclaration(),
    );
    expect(result.compatible).toBe(false);
    expect(result.issues[0].type).toBe(CompatibilityIssueType.UNSUPPORTED_API_VERSION);
  });

  it('warns on deprecated capability', () => {
    const result = compat.check(
      { capabilityKey: 'PUBLISH_LISTING', providerKey: 'AMAZON_SP' },
      makeDefinition({ status: CapabilityStatus.DEPRECATED }),
      null,
    );
    expect(result.issues[0].type).toBe(CompatibilityIssueType.DEPRECATED_CAPABILITY);
  });

  it('detects version conflict on declared capability version', () => {
    const result = compat.check(
      { capabilityKey: 'PUBLISH_LISTING', providerKey: 'AMAZON_SP', capabilityVersion: '2.0.0' },
      makeDefinition(),
      makeDeclaration({ capabilityVersion: '1.0.0' }),
    );
    expect(result.issues[0].type).toBe(CompatibilityIssueType.VERSION_CONFLICT);
  });
});
