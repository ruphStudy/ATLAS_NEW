import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MarketplaceProviderRegistry } from '@modules/marketplace-provider/registry/marketplace-provider.registry';
import { MarketplaceProviderService } from '@modules/marketplace-provider/marketplace-provider.service';
import { MARKETPLACE_PROVIDER_CONSTANTS } from '@modules/marketplace-provider/constants';
import { MarketplaceProviderFactoryService } from '@modules/marketplace-provider-factory/marketplace-provider-factory.service';
import { MarketplaceAccountService } from '@modules/marketplace-account/marketplace-account.service';
import { MarketplaceCapabilityService } from '@modules/marketplace-capability/marketplace-capability.service';
import { CapabilityValidationResult } from '@modules/marketplace-capability/interfaces';
import { MarketplaceCatalogSyncService } from '@modules/marketplace-catalog-sync/marketplace-catalog-sync.service';
import { MarketplaceInventorySyncService } from '@modules/marketplace-inventory-sync/marketplace-inventory-sync.service';
import { MarketplaceHealthService } from '@modules/marketplace-health/marketplace-health.service';
import { HealthDashboardEntry } from '@modules/marketplace-health/interfaces';
import { MarketplaceErrorNormalizerService } from '@modules/marketplace-error-normalizer/marketplace-error-normalizer.service';

import { MarketplaceFrameworkEventQueue } from './jobs/marketplace-framework-events.queue';
import {
  ConfigureMarketplaceDto,
  RegisterMarketplaceDto,
  ResolveMarketplaceOperationDto,
} from './dto';
import {
  ICrossMarketplaceInventoryEntry,
  ICrossMarketplaceSkuMappingEntry,
  IMarketplaceOperationRouteRequest,
  IMarketplaceOperationRouteResult,
  IMarketplaceSummary,
  MarketplaceFrameworkEvent,
} from './interfaces';

/**
 * MarketplaceService
 *
 * Central Multi-Marketplace Framework facade. Owns no marketplace-specific
 * business logic — every capability is composed from the existing provider
 * registry/factory, account, capability, catalog-sync, inventory-sync,
 * health and error-normalizer modules, scoped per workspace.
 */
@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  private readonly idempotencyCache = new Map<
    string,
    { result: IMarketplaceOperationRouteResult; expiresAt: number }
  >();
  private readonly IDEMPOTENCY_TTL_MS = 60_000;

  constructor(
    private readonly providerRegistry: MarketplaceProviderRegistry,
    private readonly providerService: MarketplaceProviderService,
    private readonly providerFactory: MarketplaceProviderFactoryService,
    private readonly accountService: MarketplaceAccountService,
    private readonly capabilityService: MarketplaceCapabilityService,
    private readonly catalogSyncService: MarketplaceCatalogSyncService,
    private readonly inventorySyncService: MarketplaceInventorySyncService,
    private readonly healthService: MarketplaceHealthService,
    private readonly errorNormalizer: MarketplaceErrorNormalizerService,
    private readonly eventQueue: MarketplaceFrameworkEventQueue,
  ) {}

  // ── Registration / Lifecycle ────────────────────────────────────

  async registerMarketplace(
    workspaceId: string,
    dto: RegisterMarketplaceDto,
    userId?: string,
  ): Promise<IMarketplaceSummary> {
    this.assertRegistered(dto.marketplaceKey);

    await this.providerService.upsertConfig(
      workspaceId,
      {
        providerKey: dto.marketplaceKey,
        accountId: dto.accountId,
        isEnabled: dto.isEnabled ?? true,
        priority: dto.priority,
        configuration: dto.configuration,
      },
      userId,
    );

    await this.publishEvent(
      MarketplaceFrameworkEvent.REGISTERED,
      workspaceId,
      dto.marketplaceKey,
      dto.accountId,
      userId,
    );

    return this.getMarketplace(workspaceId, dto.marketplaceKey);
  }

  async enableMarketplace(workspaceId: string, marketplaceKey: string, userId?: string): Promise<IMarketplaceSummary> {
    this.assertRegistered(marketplaceKey);
    await this.providerService.upsertConfig(workspaceId, { providerKey: marketplaceKey, isEnabled: true }, userId);
    await this.publishEvent(MarketplaceFrameworkEvent.ENABLED, workspaceId, marketplaceKey, undefined, userId);
    return this.getMarketplace(workspaceId, marketplaceKey);
  }

  async disableMarketplace(workspaceId: string, marketplaceKey: string, userId?: string): Promise<IMarketplaceSummary> {
    this.assertRegistered(marketplaceKey);
    await this.providerService.upsertConfig(workspaceId, { providerKey: marketplaceKey, isEnabled: false }, userId);
    await this.publishEvent(MarketplaceFrameworkEvent.DISABLED, workspaceId, marketplaceKey, undefined, userId);
    return this.getMarketplace(workspaceId, marketplaceKey);
  }

  async configureMarketplace(
    workspaceId: string,
    marketplaceKey: string,
    dto: ConfigureMarketplaceDto,
    userId?: string,
  ): Promise<IMarketplaceSummary> {
    this.assertRegistered(marketplaceKey);

    await this.providerService.upsertConfig(
      workspaceId,
      { providerKey: marketplaceKey, accountId: dto.accountId, configuration: dto.configuration },
      userId,
    );

    await this.publishEvent(
      MarketplaceFrameworkEvent.CONFIGURED,
      workspaceId,
      marketplaceKey,
      dto.accountId,
      userId,
      { configuration: dto.configuration },
    );

    return this.getMarketplace(workspaceId, marketplaceKey);
  }

  async listMarketplaces(workspaceId: string): Promise<IMarketplaceSummary[]> {
    const providers = this.providerService.listProviders(workspaceId);
    const configs = await this.providerService.getConfigs(workspaceId);
    const defaultKey = this.computeDefaultMarketplaceKey(configs);

    return providers.map((provider) => {
      const cfg = configs.find((c) => c.providerKey.toUpperCase() === provider.providerKey.toUpperCase());
      return {
        marketplaceKey: provider.providerKey,
        providerKey: provider.providerKey,
        displayName: provider.displayName,
        isRegistered: provider.isRegistered,
        isActive: provider.isActive,
        isEnabled: cfg?.isEnabled ?? true,
        isDefault: defaultKey === provider.providerKey.toUpperCase(),
        priority: cfg?.priority ?? MARKETPLACE_PROVIDER_CONSTANTS.DEFAULT_PRIORITY,
        supportedCapabilities: provider.supportedCapabilities,
        supportedCountries: provider.supportedCountries,
        configuration: null,
      };
    });
  }

  async getMarketplace(workspaceId: string, marketplaceKey: string): Promise<IMarketplaceSummary> {
    const summary = (await this.listMarketplaces(workspaceId)).find(
      (m) => m.marketplaceKey.toUpperCase() === marketplaceKey.toUpperCase(),
    );
    if (!summary) {
      throw new NotFoundException(`Marketplace '${marketplaceKey}' is not registered for this workspace`);
    }
    return summary;
  }

  // ── Priority / Default Marketplace ──────────────────────────────

  async setMarketplacePriority(
    workspaceId: string,
    marketplaceKey: string,
    priority: number,
    userId?: string,
  ): Promise<IMarketplaceSummary> {
    this.assertRegistered(marketplaceKey);
    await this.providerService.upsertConfig(workspaceId, { providerKey: marketplaceKey, priority }, userId);
    await this.publishEvent(
      MarketplaceFrameworkEvent.PRIORITY_CHANGED,
      workspaceId,
      marketplaceKey,
      undefined,
      userId,
      { priority },
    );
    return this.getMarketplace(workspaceId, marketplaceKey);
  }

  async setDefaultMarketplace(workspaceId: string, marketplaceKey: string, userId?: string): Promise<IMarketplaceSummary> {
    this.assertRegistered(marketplaceKey);

    const configs = await this.providerService.getConfigs(workspaceId);
    const others = configs.filter(
      (c) => c.isEnabled && c.providerKey.toUpperCase() !== marketplaceKey.toUpperCase(),
    );
    const minOtherPriority = others.length
      ? Math.min(...others.map((c) => c.priority))
      : MARKETPLACE_PROVIDER_CONSTANTS.DEFAULT_PRIORITY;
    const priority = Math.max(1, minOtherPriority - 1);

    await this.providerService.upsertConfig(
      workspaceId,
      { providerKey: marketplaceKey, isEnabled: true, priority },
      userId,
    );

    await this.publishEvent(
      MarketplaceFrameworkEvent.DEFAULT_CHANGED,
      workspaceId,
      marketplaceKey,
      undefined,
      userId,
      { priority },
    );

    return this.getMarketplace(workspaceId, marketplaceKey);
  }

  async getDefaultMarketplace(workspaceId: string): Promise<IMarketplaceSummary | null> {
    const all = await this.listMarketplaces(workspaceId);
    return all.find((m) => m.isDefault) ?? null;
  }

  // ── Multi-Account Convenience ────────────────────────────────────

  async listMarketplaceAccounts(workspaceId: string, marketplaceKey?: string) {
    const { items } = await this.accountService.findAll({
      workspaceId,
      marketplaceKey: marketplaceKey ?? null,
    });
    return items;
  }

  // ── Capability Discovery / Validation ───────────────────────────

  async discoverCapabilities(marketplaceKey?: string, workspaceId?: string): Promise<string[]> {
    return this.capabilityService.discoverCapabilities({
      providerKey: marketplaceKey ?? null,
      workspaceId: workspaceId ?? null,
    });
  }

  /**
   * Never throws for an unsupported capability — callers use the returned
   * `valid` flag so one marketplace's gap doesn't abort a multi-marketplace
   * operation.
   */
  async validateCapability(
    workspaceId: string,
    marketplaceKey: string,
    capabilityKey: string,
    opts?: { accountId?: string; country?: string; region?: string },
  ): Promise<CapabilityValidationResult> {
    return this.capabilityService.validateCapability({
      workspaceId,
      providerKey: marketplaceKey,
      capabilityKey,
      accountId: opts?.accountId ?? null,
      country: opts?.country ?? null,
      region: opts?.region ?? null,
    });
  }

  // ── Operation Routing ────────────────────────────────────────────

  /**
   * Routes a single marketplace operation through the existing provider
   * factory. Never throws — failures (including unsupported capability or
   * no enabled provider) are normalized and returned as a failed result so
   * other marketplaces in a batch remain unaffected.
   */
  async resolveOperation(
    workspaceId: string,
    request: ResolveMarketplaceOperationDto | IMarketplaceOperationRouteRequest,
    userId?: string,
  ): Promise<IMarketplaceOperationRouteResult> {
    const requestedKey = request.marketplaceKey ?? request.providerKey ?? null;
    const idempotencyCacheKey = request.idempotencyKey
      ? `${workspaceId}:${request.idempotencyKey}`
      : null;

    if (idempotencyCacheKey) {
      const cached = this.consumeIdempotent(idempotencyCacheKey);
      if (cached) return cached;
    }

    try {
      const resolution = await this.providerFactory.resolve({
        workspaceId,
        providerKey: request.providerKey ?? request.marketplaceKey ?? null,
        marketplaceKey: request.marketplaceKey ?? null,
        accountId: request.accountId ?? null,
        country: request.country ?? null,
        region: request.region ?? null,
        capability: request.capability ?? null,
      });

      const result: IMarketplaceOperationRouteResult = {
        requestedMarketplaceKey: requestedKey,
        success: true,
        providerKey: resolution.instance.providerKey,
        marketplaceKey: resolution.instance.marketplaceKey ?? null,
        accountId: resolution.instance.accountId ?? null,
        instanceId: resolution.instance.instanceId,
      };

      await this.publishEvent(
        MarketplaceFrameworkEvent.ROUTED,
        workspaceId,
        result.marketplaceKey ?? result.providerKey ?? 'UNKNOWN',
        result.accountId,
        userId,
        { capability: request.capability ?? null },
      );

      if (idempotencyCacheKey) this.rememberIdempotent(idempotencyCacheKey, result);
      return result;
    } catch (error) {
      const normalized = await this.errorNormalizer.normalizeException(error as Error, {
        workspaceId,
        provider: requestedKey ?? undefined,
        accountId: request.accountId,
        module: 'marketplace-framework',
        operation: 'resolveOperation',
      });

      const result: IMarketplaceOperationRouteResult = {
        requestedMarketplaceKey: requestedKey,
        success: false,
        error: {
          code: normalized.code,
          message: normalized.message,
          retryable: normalized.isRetryable,
        },
      };

      await this.publishEvent(
        MarketplaceFrameworkEvent.ROUTING_FAILED,
        workspaceId,
        requestedKey ?? 'UNKNOWN',
        request.accountId,
        userId,
        { capability: request.capability ?? null, errorCode: normalized.code },
      );

      if (idempotencyCacheKey) this.rememberIdempotent(idempotencyCacheKey, result);
      return result;
    }
  }

  /**
   * Resolves multiple marketplace operations independently — a failure or
   * unsupported capability on one marketplace never affects the others.
   */
  async resolveOperationBatch(
    workspaceId: string,
    requests: ResolveMarketplaceOperationDto[],
    userId?: string,
  ): Promise<IMarketplaceOperationRouteResult[]> {
    return Promise.all(requests.map((request) => this.resolveOperation(workspaceId, request, userId)));
  }

  // ── Health / Rate Limits ─────────────────────────────────────────

  async getMarketplaceHealth(workspaceId: string): Promise<HealthDashboardEntry[]> {
    return this.healthService.getDashboard(workspaceId);
  }

  async isMarketplaceHealthy(workspaceId: string, marketplaceKey: string, accountId?: string): Promise<boolean> {
    return this.healthService.isHealthy(workspaceId, marketplaceKey, accountId ?? null);
  }

  // ── Cross-Marketplace SKU Mapping / External References ─────────

  async getSkuMapping(workspaceId: string, internalId: string): Promise<ICrossMarketplaceSkuMappingEntry[]> {
    const { items: accounts } = await this.accountService.findAll({ workspaceId, limit: 100 });
    const results: ICrossMarketplaceSkuMappingEntry[] = [];

    for (const account of accounts) {
      const { items: refs } = await this.catalogSyncService.getExternalRefs(workspaceId, account.id, {
        limit: 500,
      });
      for (const ref of refs as Record<string, unknown>[]) {
        if (ref['internalId'] !== internalId) continue;
        results.push({
          marketplaceKey: account.marketplaceKey,
          providerKey: account.providerKey,
          accountId: account.id,
          refType: ref['refType'] as string,
          externalId: ref['externalId'] as string,
          externalSku: (ref['externalSku'] as string | null) ?? null,
          externalTitle: (ref['externalTitle'] as string | null) ?? null,
          status: ref['status'] as string,
          lastSyncedAt: (ref['lastSyncedAt'] as Date | null) ?? null,
        });
      }
    }

    return results;
  }

  // ── Cross-Marketplace Inventory Availability ─────────────────────

  async getInventoryAvailability(workspaceId: string, internalId: string): Promise<ICrossMarketplaceInventoryEntry[]> {
    const { items: accounts } = await this.accountService.findAll({ workspaceId, limit: 100 });
    const results: ICrossMarketplaceInventoryEntry[] = [];

    for (const account of accounts) {
      const { items: refs } = await this.inventorySyncService.getExternalRefs(workspaceId, account.id, {
        limit: 500,
      });
      for (const ref of refs as Record<string, unknown>[]) {
        if (ref['internalId'] !== internalId) continue;
        results.push({
          marketplaceKey: account.marketplaceKey,
          providerKey: account.providerKey,
          accountId: account.id,
          externalId: ref['externalId'] as string,
          externalSku: (ref['externalSku'] as string | null) ?? null,
          warehouseId: (ref['warehouseId'] as string | null) ?? null,
          status: ref['status'] as string,
          available: (ref['available'] as number) ?? 0,
          reserved: (ref['reserved'] as number) ?? 0,
          incoming: (ref['incoming'] as number) ?? 0,
          lastSyncedAt: (ref['lastSyncedAt'] as Date | null) ?? null,
        });
      }
    }

    return results;
  }

  // ── Internals ──────────────────────────────────────────────────

  private assertRegistered(marketplaceKey: string): void {
    if (!this.providerRegistry.isRegistered(marketplaceKey)) {
      throw new BadRequestException(
        `Marketplace '${marketplaceKey}' has no registered provider adapter. Available: ${this.providerRegistry
          .getSupportedKeys()
          .join(', ')}`,
      );
    }
  }

  private computeDefaultMarketplaceKey(
    configs: Array<{ providerKey: string; isEnabled: boolean; priority: number }>,
  ): string | null {
    const enabled = configs.filter((c) => c.isEnabled);
    if (!enabled.length) return null;
    return enabled.reduce((min, c) => (c.priority < min.priority ? c : min)).providerKey.toUpperCase();
  }

  private consumeIdempotent(key: string): IMarketplaceOperationRouteResult | null {
    const entry = this.idempotencyCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.idempotencyCache.delete(key);
      return null;
    }
    return entry.result;
  }

  private rememberIdempotent(key: string, result: IMarketplaceOperationRouteResult): void {
    this.idempotencyCache.set(key, { result, expiresAt: Date.now() + this.IDEMPOTENCY_TTL_MS });
  }

  private async publishEvent(
    event: MarketplaceFrameworkEvent,
    workspaceId: string,
    marketplaceKey: string,
    accountId?: string | null,
    performedBy?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      workspaceId,
      marketplaceKey,
      accountId: accountId ?? null,
      performedBy: performedBy ?? null,
      metadata,
      timestamp: new Date(),
    });
  }
}
