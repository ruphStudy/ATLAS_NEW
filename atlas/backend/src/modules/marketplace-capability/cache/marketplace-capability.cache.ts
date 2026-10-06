import { Injectable } from '@nestjs/common';
import {
  CachedCapabilityDefinition,
  CachedCapabilityResolution,
  CachedProviderDeclaration,
  CachedCapabilityMatrix,
  IMarketplaceCapabilityDefinition,
  IMarketplaceProviderCapabilityDeclaration,
  CapabilityResolutionResult,
  MarketplaceCapabilityMatrix,
  MarketplaceCapabilityMatrixRequest,
} from '../interfaces';
import { MP_CAPABILITY_CONSTANTS } from '../constants';

/**
 * MarketplaceCapabilityCache
 *
 * Four partitioned in-memory caches:
 *  1. Capability definitions (by capabilityKey)
 *  2. Provider declarations (by providerKey:capabilityKey[:workspaceId][:accountId])
 *  3. Resolution results (by composite resolution key)
 *  4. Resolved capability matrices (by composite matrix scope key)
 */
@Injectable()
export class MarketplaceCapabilityCache {
  private readonly definitions = new Map<string, CachedCapabilityDefinition>();
  private readonly declarations = new Map<string, CachedProviderDeclaration>();
  private readonly resolutions = new Map<string, CachedCapabilityResolution>();
  private readonly matrices = new Map<string, CachedCapabilityMatrix>();

  // ── Definition Cache ──────────────────────────────────────

  static buildDefinitionKey(capabilityKey: string): string {
    return `def:${capabilityKey.toUpperCase()}`;
  }

  setDefinition(definition: IMarketplaceCapabilityDefinition): void {
    const key = MarketplaceCapabilityCache.buildDefinitionKey(definition.capabilityKey);
    this.evictIfFull(this.definitions);
    this.definitions.set(key, { definition, cachedAt: Date.now() });
  }

  getDefinition(capabilityKey: string): IMarketplaceCapabilityDefinition | null {
    const key = MarketplaceCapabilityCache.buildDefinitionKey(capabilityKey);
    const entry = this.definitions.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > MP_CAPABILITY_CONSTANTS.CACHE_TTL_MS) {
      this.definitions.delete(key);
      return null;
    }
    return entry.definition;
  }

  invalidateDefinition(capabilityKey: string): void {
    this.definitions.delete(MarketplaceCapabilityCache.buildDefinitionKey(capabilityKey));
    // also evict all resolutions that involve this capability
    for (const k of this.resolutions.keys()) {
      if (k.includes(capabilityKey.toUpperCase())) this.resolutions.delete(k);
    }
    // a definition change can affect any resolved matrix — no cheap selective
    // key, so flush the whole matrix partition (matrices are cheap to rebuild)
    this.invalidateAllMatrices();
  }

  // ── Declaration Cache ─────────────────────────────────────

  static buildDeclarationKey(
    providerKey: string,
    capabilityKey: string,
    workspaceId?: string | null,
    accountId?: string | null,
    marketplaceKey?: string | null,
  ): string {
    return [
      'decl',
      providerKey.toUpperCase(),
      capabilityKey.toUpperCase(),
      workspaceId ?? 'global',
      accountId ?? 'any',
      marketplaceKey ?? 'any',
    ].join(':');
  }

  setDeclaration(declaration: IMarketplaceProviderCapabilityDeclaration): void {
    const key = MarketplaceCapabilityCache.buildDeclarationKey(
      declaration.providerKey,
      declaration.capabilityKey,
      declaration.workspaceId,
      declaration.accountId,
      declaration.marketplaceKey,
    );
    this.evictIfFull(this.declarations);
    this.declarations.set(key, { declaration, cachedAt: Date.now() });
  }

  getDeclaration(
    providerKey: string,
    capabilityKey: string,
    workspaceId?: string | null,
    accountId?: string | null,
    marketplaceKey?: string | null,
  ): IMarketplaceProviderCapabilityDeclaration | null {
    const key = MarketplaceCapabilityCache.buildDeclarationKey(
      providerKey,
      capabilityKey,
      workspaceId,
      accountId,
      marketplaceKey,
    );
    const entry = this.declarations.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > MP_CAPABILITY_CONSTANTS.CACHE_TTL_MS) {
      this.declarations.delete(key);
      return null;
    }
    return entry.declaration;
  }

  invalidateDeclarationsByProvider(providerKey: string): void {
    const prefix = `decl:${providerKey.toUpperCase()}:`;
    for (const k of this.declarations.keys()) {
      if (k.startsWith(prefix)) this.declarations.delete(k);
    }
    this.invalidateResolutionsByProvider(providerKey);
    this.invalidateMatricesByProvider(providerKey);
  }

  invalidateDeclarationsByWorkspace(workspaceId: string): void {
    for (const [k, v] of this.declarations.entries()) {
      if (v.declaration.workspaceId === workspaceId) this.declarations.delete(k);
    }
    this.invalidateResolutionsByWorkspace(workspaceId);
    this.invalidateMatricesByWorkspace(workspaceId);
  }

  // ── Resolution Cache ──────────────────────────────────────

  static buildResolutionKey(
    workspaceId: string,
    providerKey: string,
    capabilityKey: string,
    accountId?: string | null,
    country?: string | null,
    region?: string | null,
  ): string {
    return [
      'res',
      workspaceId,
      providerKey.toUpperCase(),
      capabilityKey.toUpperCase(),
      accountId ?? 'any',
      country ?? 'any',
      region ?? 'any',
    ].join(':');
  }

  setResolution(
    workspaceId: string,
    providerKey: string,
    capabilityKey: string,
    result: CapabilityResolutionResult,
    accountId?: string | null,
    country?: string | null,
    region?: string | null,
  ): void {
    const key = MarketplaceCapabilityCache.buildResolutionKey(
      workspaceId, providerKey, capabilityKey, accountId, country, region,
    );
    this.evictIfFull(this.resolutions, MP_CAPABILITY_CONSTANTS.RESOLUTION_CACHE_MAX);
    this.resolutions.set(key, { result, cachedAt: Date.now() });
  }

  getResolution(
    workspaceId: string,
    providerKey: string,
    capabilityKey: string,
    accountId?: string | null,
    country?: string | null,
    region?: string | null,
  ): CapabilityResolutionResult | null {
    const key = MarketplaceCapabilityCache.buildResolutionKey(
      workspaceId, providerKey, capabilityKey, accountId, country, region,
    );
    const entry = this.resolutions.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > MP_CAPABILITY_CONSTANTS.RESOLUTION_CACHE_TTL_MS) {
      this.resolutions.delete(key);
      return null;
    }
    return entry.result;
  }

  invalidateResolutionsByProvider(providerKey: string): void {
    const segment = `:${providerKey.toUpperCase()}:`;
    for (const k of this.resolutions.keys()) {
      if (k.includes(segment)) this.resolutions.delete(k);
    }
  }

  invalidateResolutionsByWorkspace(workspaceId: string): void {
    for (const k of this.resolutions.keys()) {
      if (k.startsWith(`res:${workspaceId}:`)) this.resolutions.delete(k);
    }
  }

  // ── Matrix Cache ──────────────────────────────────────────

  static buildMatrixKey(request: MarketplaceCapabilityMatrixRequest): string {
    return [
      'matrix',
      request.workspaceId,
      request.providerKey?.toUpperCase() ?? 'all',
      request.marketplaceKey ?? 'any',
      request.accountId ?? 'any',
      request.country ?? 'any',
      request.region ?? 'any',
      request.category ?? 'any',
    ].join(':');
  }

  setMatrix(key: string, matrix: MarketplaceCapabilityMatrix): void {
    this.evictIfFull(this.matrices, MP_CAPABILITY_CONSTANTS.MATRIX_CACHE_MAX_ENTRIES);
    this.matrices.set(key, { matrix, cachedAt: Date.now() });
  }

  getMatrix(key: string): MarketplaceCapabilityMatrix | null {
    const entry = this.matrices.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > MP_CAPABILITY_CONSTANTS.MATRIX_CACHE_TTL_MS) {
      this.matrices.delete(key);
      return null;
    }
    return entry.matrix;
  }

  invalidateMatricesByWorkspace(workspaceId: string): void {
    const prefix = `matrix:${workspaceId}:`;
    for (const k of this.matrices.keys()) {
      if (k.startsWith(prefix)) this.matrices.delete(k);
    }
  }

  invalidateMatricesByProvider(providerKey: string): void {
    // A provider-scoped matrix and an "all providers" matrix can both
    // include this provider — invalidate both shapes.
    const segment = `:${providerKey.toUpperCase()}:`;
    for (const k of this.matrices.keys()) {
      if (k.includes(segment) || k.includes(':all:')) this.matrices.delete(k);
    }
  }

  invalidateAllMatrices(): void {
    this.matrices.clear();
  }

  // ── Bulk Operations ───────────────────────────────────────

  flush(): void {
    this.definitions.clear();
    this.declarations.clear();
    this.resolutions.clear();
    this.matrices.clear();
  }

  get definitionSize(): number { return this.definitions.size; }
  get declarationSize(): number { return this.declarations.size; }
  get resolutionSize(): number { return this.resolutions.size; }
  get matrixSize(): number { return this.matrices.size; }

  // ── LRU Eviction ─────────────────────────────────────────

  private evictIfFull(
    map: Map<string, { cachedAt: number }>,
    max: number = MP_CAPABILITY_CONSTANTS.CACHE_MAX_ENTRIES,
  ): void {
    if (map.size < max) return;
    const entries = [...map.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const evictCount = Math.ceil(max * 0.1);
    for (let i = 0; i < evictCount; i++) {
      map.delete(entries[i][0]);
    }
  }
}
