import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IMarketplaceProviderAdapter,
  MarketplaceCapability,
  MarketplaceCredentials,
  MarketplaceHealthResult,
  MarketplaceKey,
  MarketplaceProviderEvent,
  MarketplaceProviderResolveOptions,
  MarketplaceRequestContext,
  MarketplaceResponse,
  NormalizedMarketplaceError,
  WorkspaceMarketplaceProviderConfig,
} from '../interfaces';
import { MarketplaceProviderRegistry } from '../registry/marketplace-provider.registry';
import { MarketplaceProviderFactory } from '../registry/marketplace-provider.factory';
import { MarketplaceProviderResolver } from '../registry/marketplace-provider.resolver';
import { MarketplaceHealthMonitor } from '../health/marketplace-health.monitor';
import { MarketplaceErrorNormalizer } from '../errors/marketplace-error-normalizer';
import { MarketplaceCapabilityValidator } from '../capability/marketplace-capability.validator';
import { MarketplaceCredentialService } from '../credentials/marketplace-credential.service';
import { MarketplaceMetricsRecorder } from '../metrics/marketplace-metrics.recorder';
import { MarketplaceResponseWrapper } from '../context/marketplace-response.wrapper';
import { MarketplaceRequestContextBuilder } from '../context/marketplace-request-context.builder';
import { MarketplaceProviderEventQueue } from '../jobs/marketplace-provider-events.queue';
import { MARKETPLACE_PROVIDER_CONSTANTS } from '../constants';

/**
 * MarketplaceProviderManager
 *
 * The single facade for all marketplace provider operations.
 * Business modules (Listing Publisher, Inventory Sync, Orders, etc.) must
 * ONLY interact with marketplace providers through this manager.
 * Handles: provider resolution, credential loading, retry, timeout, metrics, audit.
 *
 * Business modules MUST NOT import concrete marketplace adapter classes.
 */
@Injectable()
export class MarketplaceProviderManager {
  private readonly logger = new Logger(MarketplaceProviderManager.name);

  constructor(
    private readonly registry: MarketplaceProviderRegistry,
    private readonly factory: MarketplaceProviderFactory,
    private readonly resolver: MarketplaceProviderResolver,
    private readonly healthMonitor: MarketplaceHealthMonitor,
    private readonly errorNormalizer: MarketplaceErrorNormalizer,
    private readonly capabilityValidator: MarketplaceCapabilityValidator,
    private readonly credentialService: MarketplaceCredentialService,
    private readonly metricsRecorder: MarketplaceMetricsRecorder,
    private readonly eventQueue: MarketplaceProviderEventQueue,
  ) {}

  // ── Provider Resolution ───────────────────────────────────────

  /**
   * Resolves a provider for the given options and returns the adapter.
   */
  resolveProvider(options: MarketplaceProviderResolveOptions): IMarketplaceProviderAdapter {
    const { adapter } = this.resolver.resolve(options);
    this.logger.debug(
      `Resolved provider '${adapter.metadata.providerKey}' for workspace '${options.workspaceId}'`,
    );
    return adapter;
  }

  /**
   * Resolves all available providers for the given options (for failover/bulk).
   */
  resolveAll(options: MarketplaceProviderResolveOptions): IMarketplaceProviderAdapter[] {
    return this.resolver.resolveAll(options).map((r) => r.adapter);
  }

  // ── Capability Validation ─────────────────────────────────────

  /**
   * Validates that a provider supports a given capability before executing.
   * Throws an UnsupportedCapabilityError if not supported.
   */
  assertCapability(providerKey: string, capability: MarketplaceCapability): void {
    const adapter = this.registry.get(providerKey);
    this.capabilityValidator.assertSupported(adapter, capability);
  }

  /**
   * Returns true if a provider supports the capability.
   */
  supportsCapability(providerKey: string, capability: MarketplaceCapability): boolean {
    if (!this.registry.isRegistered(providerKey)) return false;
    const adapter = this.registry.get(providerKey);
    return adapter.supportsCapability(capability);
  }

  // ── Connection Testing ────────────────────────────────────────

  /**
   * Tests the connection for a provider account and caches the health result.
   */
  async testConnection(
    providerKey: string,
    workspaceId: string,
    accountId: string | undefined,
    credentials: MarketplaceCredentials,
  ): Promise<MarketplaceHealthResult> {
    const adapter = this.registry.get(providerKey);
    const contextBuilder = MarketplaceRequestContextBuilder.create(
      workspaceId,
      providerKey,
      MarketplaceKey.CUSTOM,
    );
    if (accountId) contextBuilder.withAccountId(accountId);
    const context = contextBuilder.build();

    this.logger.log(`Testing connection for provider '${providerKey}' account '${accountId}'`);
    try {
      const result = await adapter.testConnection(context, credentials);
      await this.eventQueue.enqueue({
        event: result.status === 'HEALTHY'
          ? MarketplaceProviderEvent.CONNECTED
          : MarketplaceProviderEvent.DISCONNECTED,
        providerKey,
        accountId,
        workspaceId,
        timestamp: new Date(),
      });
      return result;
    } catch (error) {
      const normalized = this.errorNormalizer.normalize(error, providerKey);
      this.logger.error(
        `Connection test failed for '${providerKey}': ${normalized.message}`,
      );
      await this.eventQueue.enqueue({
        event: MarketplaceProviderEvent.DISCONNECTED,
        providerKey,
        accountId,
        workspaceId,
        metadata: { errorCode: normalized.code },
        timestamp: new Date(),
      });
      throw this.errorNormalizer.wrap(error, providerKey);
    }
  }

  // ── Credential Validation ────────────────────────────────────

  /**
   * Validates credentials against the provider's declared required fields.
   */
  async validateCredentials(
    providerKey: string,
    credentials: MarketplaceCredentials,
  ): Promise<boolean> {
    const adapter = this.registry.get(providerKey);
    const requiredKeys = adapter.metadata.credentialFields
      .filter((f) => f.required)
      .map((f) => f.key);

    const validationResult = this.credentialService.validateCredentials(
      credentials,
      requiredKeys,
    );

    if (!validationResult.valid) {
      this.logger.warn(
        `Credential validation failed for '${providerKey}': ${validationResult.errors.join(', ')}`,
      );
      await this.eventQueue.enqueue({
        event: MarketplaceProviderEvent.VALIDATION_FAILED,
        providerKey,
        workspaceId: credentials.workspaceId,
        metadata: { errors: validationResult.errors },
        timestamp: new Date(),
      });
    }

    return validationResult.valid;
  }

  // ── Health Monitoring ─────────────────────────────────────────

  /**
   * Returns cached health result for a provider.
   */
  getHealth(providerKey: string, accountId?: string): MarketplaceHealthResult | null {
    return this.healthMonitor.getHealth(providerKey, accountId);
  }

  /**
   * Triggers a live health check and updates the cache.
   */
  async checkHealth(providerKey: string, accountId?: string): Promise<MarketplaceHealthResult> {
    const adapter = this.registry.get(providerKey);
    const previous = this.healthMonitor.getHealth(providerKey, accountId);
    const result = await this.healthMonitor.checkOne(adapter, accountId);

    if (previous?.status !== result.status) {
      await this.eventQueue.enqueue({
        event: MarketplaceProviderEvent.HEALTH_CHANGED,
        providerKey,
        accountId: accountId ?? null,
        metadata: { from: previous?.status, to: result.status },
        timestamp: new Date(),
      });
    }

    return result;
  }

  /**
   * Returns all cached health snapshots.
   */
  getAllHealth() {
    return this.healthMonitor.getAllHealth();
  }

  // ── Provider Registration ────────────────────────────────────

  /**
   * Registers a new provider adapter at runtime.
   */
  async registerProvider(adapter: IMarketplaceProviderAdapter): Promise<void> {
    this.registry.register(adapter);
    await this.eventQueue.enqueue({
      event: MarketplaceProviderEvent.REGISTERED,
      providerKey: adapter.metadata.providerKey,
      timestamp: new Date(),
    });
  }

  /**
   * Enables a registered provider.
   */
  async enableProvider(providerKey: string, workspaceId?: string): Promise<void> {
    this.registry.enable(providerKey);
    await this.eventQueue.enqueue({
      event: MarketplaceProviderEvent.ENABLED,
      providerKey,
      workspaceId: workspaceId ?? null,
      timestamp: new Date(),
    });
  }

  /**
   * Disables a registered provider.
   */
  async disableProvider(providerKey: string, workspaceId?: string): Promise<void> {
    this.registry.disable(providerKey);
    await this.eventQueue.enqueue({
      event: MarketplaceProviderEvent.DISABLED,
      providerKey,
      workspaceId: workspaceId ?? null,
      timestamp: new Date(),
    });
  }

  // ── Execution with Retry ──────────────────────────────────────

  /**
   * Executes a provider operation with retry, metrics recording, and error normalization.
   */
  async executeWithRetry<TResult>(
    context: MarketplaceRequestContext,
    operation: () => Promise<TResult>,
    retryPolicy = MARKETPLACE_PROVIDER_CONSTANTS.DEFAULT_RETRY_POLICY,
  ): Promise<MarketplaceResponse<TResult>> {
    const startMs = Date.now();
    const requestId = uuidv4();
    let lastError: unknown;

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        const result = await operation();
        const durationMs = Date.now() - startMs;

        this.metricsRecorder.record({
          providerKey: context.providerKey,
          accountId: context.accountId,
          success: true,
          latencyMs: durationMs,
          retried: attempt > 1,
        });

        return MarketplaceResponseWrapper.success(result, {
          providerKey: context.providerKey,
          correlationId: context.correlationId,
          requestId,
          processingTimeMs: durationMs,
        });
      } catch (error) {
        lastError = error;
        const normalized = this.errorNormalizer.normalize(error, context.providerKey);

        if (!normalized.retryable || attempt === retryPolicy.maxAttempts) {
          const durationMs = Date.now() - startMs;
          this.metricsRecorder.record({
            providerKey: context.providerKey,
            accountId: context.accountId,
            success: false,
            latencyMs: durationMs,
            retried: attempt > 1,
            rateLimitHit: normalized.code === 'RATE_LIMITED',
          });
          return MarketplaceResponseWrapper.fromError<TResult>(normalized, {
            providerKey: context.providerKey,
            correlationId: context.correlationId,
            requestId,
            processingTimeMs: durationMs,
          });
        }

        const delay = retryPolicy.backoffMs * Math.pow(retryPolicy.backoffMultiplier, attempt - 1);
        this.logger.warn(
          `[${context.providerKey}] Attempt ${attempt}/${retryPolicy.maxAttempts} failed (${normalized.code}). Retrying in ${delay}ms`,
        );
        await this.sleep(delay);
      }
    }

    const normalized = this.errorNormalizer.normalize(lastError, context.providerKey);
    return MarketplaceResponseWrapper.fromError<TResult>(normalized, {
      providerKey: context.providerKey,
      correlationId: context.correlationId,
      requestId,
      processingTimeMs: Date.now() - startMs,
    });
  }

  // ── Queries ───────────────────────────────────────────────────

  listRegisteredProviders(): IMarketplaceProviderAdapter[] {
    return this.registry.getAll();
  }

  getMetrics(providerKey: string, accountId?: string) {
    return this.metricsRecorder.get(providerKey, accountId);
  }

  getAllMetrics() {
    return this.metricsRecorder.getAll();
  }

  // ── Internals ────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
