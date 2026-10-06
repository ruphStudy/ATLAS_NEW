import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceProviderRegistry } from '../../marketplace-provider/registry/marketplace-provider.registry';
import { MarketplaceProviderFactory } from '../../marketplace-provider/registry/marketplace-provider.factory';
import { MarketplaceProviderDependencyResolver } from './marketplace-provider-dependency.resolver';
import { MarketplaceProviderInstanceBuilder } from '../builder/marketplace-provider-instance.builder';
import { MarketplaceProviderInitializationManager } from '../initialization/marketplace-provider-initialization.manager';
import { MarketplaceProviderInstanceCache } from '../cache/marketplace-provider-instance.cache';
import { MarketplaceProviderFactoryMetrics } from '../metrics/marketplace-provider-factory.metrics';
import { MarketplaceProviderFactoryEventQueue } from '../events/marketplace-provider-factory-events.queue';
import { MarketplaceProviderFactoryErrorNormalizer, ProviderFactoryException } from '../errors/marketplace-provider-factory.error-normalizer';
import {
  ProviderFactoryEvent,
  ProviderFactoryRequest,
  ProviderInstance,
  ProviderInstanceState,
  ProviderResolutionResult,
} from '../interfaces';
import { MarketplaceProviderResolveOptions } from '../../marketplace-provider/interfaces';
import { MP_FACTORY_CONSTANTS, MP_FACTORY_ERROR_CODES } from '../constants';

/**
 * MarketplaceProviderInstanceResolver
 *
 * Main resolution engine.  Orchestrates:
 *   1. Cache lookup
 *   2. Dependency resolution (adapter + config + credential)
 *   3. Instance building
 *   4. Initialization
 *   5. Cache population
 *   6. Fallback handling
 */
@Injectable()
export class MarketplaceProviderInstanceResolver {
  private readonly logger = new Logger(MarketplaceProviderInstanceResolver.name);

  constructor(
    private readonly registry: MarketplaceProviderRegistry,
    private readonly providerFactory: MarketplaceProviderFactory,
    private readonly dependencyResolver: MarketplaceProviderDependencyResolver,
    private readonly builder: MarketplaceProviderInstanceBuilder,
    private readonly initManager: MarketplaceProviderInitializationManager,
    private readonly cache: MarketplaceProviderInstanceCache,
    private readonly metrics: MarketplaceProviderFactoryMetrics,
    private readonly eventQueue: MarketplaceProviderFactoryEventQueue,
    private readonly errorNormalizer: MarketplaceProviderFactoryErrorNormalizer,
  ) {}

  async resolve(request: ProviderFactoryRequest): Promise<ProviderResolutionResult> {
    const startMs = Date.now();
    const providerKey = (request.providerKey ?? this.selectProviderKey(request)).toUpperCase();

    this.metrics.recordRequest(providerKey);
    await this.eventQueue.enqueue({
      event: ProviderFactoryEvent.CREATION_REQUESTED,
      workspaceId: request.workspaceId,
      providerKey,
      accountId: request.accountId,
      marketplaceKey: request.marketplaceKey,
      timestamp: new Date(),
    });

    // ── Cache lookup ──────────────────────────────────────────
    if (!request.forceRefresh) {
      const cacheKey = this.buildCacheKey(providerKey, request);
      const cached = this.cache.get(cacheKey);
      if (cached && MP_FACTORY_CONSTANTS.USABLE_DEGRADED_STATES.has(cached.state)) {
        this.metrics.recordCacheHit(providerKey);
        this.metrics.recordInstanceReused(providerKey);
        this.logger.debug(`Cache hit for '${providerKey}' ws='${request.workspaceId}'`);
        return { instance: cached, cacheHit: true, fallbackUsed: false, resolutionTimeMs: Date.now() - startMs };
      }
      this.metrics.recordCacheMiss(providerKey);
    }

    // ── Build and initialize ──────────────────────────────────
    try {
      const instance = await this.buildAndInit(providerKey, request);
      const cacheKey = this.buildCacheKey(providerKey, request, instance.configVersion, instance.credentialVersion);
      this.cache.set(cacheKey, instance);
      this.metrics.recordInstanceCreated(providerKey);
      return { instance, cacheHit: false, fallbackUsed: false, resolutionTimeMs: Date.now() - startMs };
    } catch (err) {
      // ── Fallback ──────────────────────────────────────────
      if (request.fallbackEnabled !== false) {
        const fallbackResult = await this.tryFallback(request, providerKey, err);
        if (fallbackResult) {
          return { ...fallbackResult, fallbackUsed: true, resolutionTimeMs: Date.now() - startMs };
        }
      }

      this.metrics.recordProviderResolutionFailure(providerKey);
      await this.eventQueue.enqueue({
        event: ProviderFactoryEvent.FAILED,
        workspaceId: request.workspaceId,
        providerKey,
        accountId: request.accountId,
        errorMessage: this.safeErrorMessage(err),
        timestamp: new Date(),
      });
      throw this.errorNormalizer.wrap(err, `resolve[${providerKey}]`);
    }
  }

  async resolveAll(request: ProviderFactoryRequest): Promise<ProviderInstance[]> {
    const options = this.toResolveOptions(request, null);
    const adapters = this.providerFactory.selectAll(options);
    const instances: ProviderInstance[] = [];

    for (const adapter of adapters) {
      try {
        const result = await this.resolve({ ...request, providerKey: adapter.metadata.providerKey });
        instances.push(result.instance);
      } catch {
        // Skip failed providers in multi-resolve
      }
    }

    return instances;
  }

  /**
   * Invalidates cache entries for a provider.
   */
  invalidate(workspaceId?: string, providerKey?: string, accountId?: string): void {
    if (workspaceId && providerKey && accountId) {
      this.cache.invalidateByAccount(workspaceId, accountId);
    } else if (providerKey) {
      this.cache.invalidateByProvider(providerKey);
    } else if (workspaceId) {
      this.cache.invalidateByWorkspace(workspaceId);
    } else {
      this.cache.flush();
    }
  }

  // ── Internals ────────────────────────────────────────────────

  private async buildAndInit(providerKey: string, request: ProviderFactoryRequest): Promise<ProviderInstance> {
    const initStart = Date.now();
    const deps = await this.dependencyResolver.resolve(providerKey, request);
    const instance = this.builder.build(request, deps);

    if (MP_FACTORY_CONSTANTS.UNUSABLE_STATES.has(instance.state)) {
      this.metrics.recordInitializationFailure(providerKey);
      throw new ProviderFactoryException(
        MP_FACTORY_ERROR_CODES.INITIALIZATION_FAILURE,
        `Instance built in unusable state '${instance.state}': ${instance.failureReason ?? 'unknown'}`,
        false,
      );
    }

    await this.eventQueue.enqueue({
      event: ProviderFactoryEvent.CREATED,
      instanceId: instance.instanceId,
      workspaceId: request.workspaceId,
      providerKey,
      accountId: request.accountId,
      state: instance.state,
      timestamp: new Date(),
    });

    const initialized = await this.initManager.initialize(instance);
    this.metrics.recordInitTime(providerKey, Date.now() - initStart);

    await this.eventQueue.enqueue({
      event: ProviderFactoryEvent.INITIALIZED,
      instanceId: initialized.instanceId,
      workspaceId: request.workspaceId,
      providerKey,
      state: initialized.state,
      timestamp: new Date(),
    });

    return initialized;
  }

  private async tryFallback(
    request: ProviderFactoryRequest,
    failedProviderKey: string,
    _originalError: unknown,
  ): Promise<Omit<ProviderResolutionResult, 'fallbackUsed' | 'resolutionTimeMs'> | null> {
    const options = this.toResolveOptions(request, null);
    const candidates = this.providerFactory.selectAll(options).filter(
      (a) => a.metadata.providerKey.toUpperCase() !== failedProviderKey,
    );

    for (let i = 0; i < Math.min(candidates.length, MP_FACTORY_CONSTANTS.MAX_FALLBACK_ATTEMPTS); i++) {
      const candidate = candidates[i]!;
      const fbKey = candidate.metadata.providerKey.toUpperCase();
      try {
        const instance = await this.buildAndInit(fbKey, { ...request, providerKey: fbKey });
        const cacheKey = this.buildCacheKey(fbKey, request, instance.configVersion, instance.credentialVersion);
        this.cache.set(cacheKey, instance);
        this.metrics.recordFallbackUsage(fbKey);

        await this.eventQueue.enqueue({
          event: ProviderFactoryEvent.FALLBACK_SELECTED,
          workspaceId: request.workspaceId,
          providerKey: fbKey,
          fallbackProviderKey: fbKey,
          metadata: { failedProvider: failedProviderKey },
          timestamp: new Date(),
        });

        this.logger.log(`Fallback selected: '${fbKey}' after '${failedProviderKey}' failed`);
        return { instance, cacheHit: false };
      } catch {
        this.logger.warn(`Fallback '${fbKey}' also failed`);
      }
    }

    return null;
  }

  private selectProviderKey(request: ProviderFactoryRequest): string {
    const options = this.toResolveOptions(request, null);
    const adapter = this.providerFactory.select(options);
    return adapter.metadata.providerKey;
  }

  private toResolveOptions(request: ProviderFactoryRequest, providerKey: string | null): MarketplaceProviderResolveOptions {
    return {
      workspaceId: request.workspaceId,
      marketplaceKey: request.marketplaceKey ?? undefined,
      accountId: request.accountId ?? undefined,
      country: request.country ?? undefined,
      region: request.region ?? undefined,
      capability: request.capability ?? undefined,
      preferredProviderKey: providerKey ?? request.providerKey ?? undefined,
      failoverEnabled: request.fallbackEnabled !== false,
    };
  }

  private buildCacheKey(
    providerKey: string,
    request: ProviderFactoryRequest,
    configVersion?: number | null,
    credentialVersion?: number | null,
  ): string {
    return MarketplaceProviderInstanceCache.buildKey(
      request.workspaceId,
      providerKey,
      request.accountId,
      request.country,
      request.region,
      request.apiVersion,
      configVersion,
      credentialVersion,
    );
  }

  private safeErrorMessage(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.replace(/(key|secret|token|password)\s*[:=]\s*\S+/gi, '$1=[REDACTED]');
  }
}
