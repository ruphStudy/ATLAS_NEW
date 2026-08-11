import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceProviderInstanceResolver } from './resolver/marketplace-provider-instance.resolver';
import { MarketplaceProviderInstanceCache } from './cache/marketplace-provider-instance.cache';
import { MarketplaceProviderFactoryMetrics } from './metrics/marketplace-provider-factory.metrics';
import { MarketplaceProviderFactoryValidator } from './validator/marketplace-provider-factory.validator';
import { MarketplaceProviderFactoryEventQueue } from './events/marketplace-provider-factory-events.queue';
import { MarketplaceProviderFactoryErrorNormalizer } from './errors/marketplace-provider-factory.error-normalizer';
import {
  FactoryMetricsSnapshot,
  ProviderFactoryEvent,
  ProviderFactoryRequest,
  ProviderInstance,
  ProviderInstanceState,
  ProviderResolutionResult,
} from './interfaces';
import { BadRequestException } from '@nestjs/common';

/**
 * MarketplaceProviderFactoryService
 *
 * Single public API for the factory module.
 * All consumers (business modules, adapters, etc.) obtain provider instances through this class.
 * Handles: validation, resolution, caching, fallback, metrics, events, and disposal.
 */
@Injectable()
export class MarketplaceProviderFactoryService {
  private readonly logger = new Logger(MarketplaceProviderFactoryService.name);

  constructor(
    private readonly resolver: MarketplaceProviderInstanceResolver,
    private readonly cache: MarketplaceProviderInstanceCache,
    private readonly metrics: MarketplaceProviderFactoryMetrics,
    private readonly validator: MarketplaceProviderFactoryValidator,
    private readonly eventQueue: MarketplaceProviderFactoryEventQueue,
    private readonly errorNormalizer: MarketplaceProviderFactoryErrorNormalizer,
  ) {}

  /**
   * Resolves (and optionally creates) a provider instance for the given request.
   * Returns a fully initialized, ready-to-use instance.
   */
  async resolve(request: ProviderFactoryRequest): Promise<ProviderResolutionResult> {
    const validation = this.validator.validate(request);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Factory request validation failed',
        errors: validation.errors,
      });
    }

    if (validation.warnings.length) {
      validation.warnings.forEach((w) => this.logger.warn(`Factory warning: ${w}`));
    }

    return this.resolver.resolve(request);
  }

  /**
   * Resolves all available provider instances matching the request criteria.
   */
  async resolveAll(request: ProviderFactoryRequest): Promise<ProviderInstance[]> {
    return this.resolver.resolveAll(request);
  }

  /**
   * Forces a fresh instance creation, bypassing the cache.
   */
  async refresh(request: ProviderFactoryRequest): Promise<ProviderResolutionResult> {
    const result = await this.resolve({ ...request, forceRefresh: true });

    await this.eventQueue.enqueue({
      event: ProviderFactoryEvent.REFRESHED,
      instanceId: result.instance.instanceId,
      workspaceId: request.workspaceId,
      providerKey: result.instance.providerKey,
      state: result.instance.state,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Marks a cached instance as DISPOSED and removes it from the cache.
   */
  async dispose(instanceId: string, workspaceId: string, providerKey: string): Promise<void> {
    this.cache.invalidateByInstanceId(instanceId);
    this.cache.updateState(instanceId, ProviderInstanceState.DISPOSED);

    await this.eventQueue.enqueue({
      event: ProviderFactoryEvent.DISPOSED,
      instanceId,
      workspaceId,
      providerKey,
      state: ProviderInstanceState.DISPOSED,
      timestamp: new Date(),
    });

    this.logger.log(`Disposed instance '${instanceId}' for '${providerKey}'`);
  }

  /**
   * Invalidates cache entries.
   * Call this when configuration or credentials change.
   */
  async invalidate(opts: {
    workspaceId?: string;
    providerKey?: string;
    accountId?: string;
  }): Promise<void> {
    const { workspaceId, providerKey, accountId } = opts;
    this.resolver.invalidate(workspaceId, providerKey, accountId);

    if (providerKey) {
      await this.eventQueue.enqueue({
        event: ProviderFactoryEvent.INVALIDATED,
        workspaceId: workspaceId ?? '_global',
        providerKey,
        accountId,
        timestamp: new Date(),
      });
    }

    this.logger.debug(`Cache invalidated: ws=${workspaceId} provider=${providerKey} account=${accountId}`);
  }

  // ── Metrics ───────────────────────────────────────────────

  getMetrics(providerKey: string): FactoryMetricsSnapshot {
    return this.metrics.getForProvider(providerKey);
  }

  getAllMetrics(): Record<string, FactoryMetricsSnapshot> {
    return this.metrics.getAll();
  }

  getAggregateMetrics(): FactoryMetricsSnapshot {
    return this.metrics.getAggregate();
  }

  resetMetrics(providerKey?: string): void {
    this.metrics.reset(providerKey);
  }
}
