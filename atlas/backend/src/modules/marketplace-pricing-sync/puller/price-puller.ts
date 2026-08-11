import { Injectable, Logger } from '@nestjs/common';
import { PriceSyncRepository } from '../repository/price-sync.repository';
import { PriceSyncValidator } from '../validator/price-sync.validator';
import { PriceSyncStateManager } from '../state/price-sync-state.manager';
import { PriceSyncConflictResolver } from '../conflict/price-sync-conflict.resolver';
import { PriceSyncEventQueue } from '../events/price-sync-events.queue';
import { PriceMapper } from '../mapper/price-mapper';
import {
  PriceSyncAdapter,
  NormalizedPriceItem,
  PriceSyncEvent,
  ItemSyncStatus,
  ConflictResolutionStrategy,
  PriceItemType,
} from '../interfaces';

const MAX_PAGES_PER_JOB = 1000;
const DEFAULT_BATCH_SIZE = 100;

@Injectable()
export class PricePuller {
  private readonly logger = new Logger(PricePuller.name);

  constructor(
    private readonly repository: PriceSyncRepository,
    private readonly validator: PriceSyncValidator,
    private readonly stateManager: PriceSyncStateManager,
    private readonly conflictResolver: PriceSyncConflictResolver,
    private readonly eventQueue: PriceSyncEventQueue,
    private readonly mapper: PriceMapper,
  ) {}

  async run(params: {
    jobId: string;
    workspaceId: string;
    accountId: string;
    adapter: PriceSyncAdapter;
    itemType: PriceItemType;
    conflictStrategy: ConflictResolutionStrategy;
    cursor?: string;
    batchSize?: number;
  }): Promise<void> {
    const { jobId, workspaceId, accountId, adapter, itemType, conflictStrategy, batchSize = DEFAULT_BATCH_SIZE } = params;
    let cursor = params.cursor;
    let pageCount = 0;
    let totalProcessed = 0;

    try {
      await this.stateManager.startJob(jobId, workspaceId);

      while (pageCount < MAX_PAGES_PER_JOB) {
        const result = await adapter.fetchPrices({
          accountId,
          cursor,
          itemType,
          limit: batchSize,
        });

        for (const rawPrice of result.items) {
          try {
            await this.pullPrice(jobId, workspaceId, accountId, rawPrice, conflictStrategy);
            totalProcessed++;
          } catch (error) {
            this.logger.error(`Failed to pull price ${rawPrice.externalPriceId}: ${error.message}`);
            await this.stateManager.recordItemResult(jobId, workspaceId, {
              externalPriceId: rawPrice.externalPriceId,
              sku: rawPrice.sku,
              status: ItemSyncStatus.FAILED,
              errorMessage: error.message,
            });
            await this.stateManager.incrementCounters(jobId, workspaceId, { failed: 1, processed: 1 });
          }
        }

        await this.stateManager.updateProgress(jobId, workspaceId, {
          cursor: result.nextCursor,
          processedItems: totalProcessed,
        });

        if (!result.hasMore) break;
        cursor = result.nextCursor;
        pageCount++;
      }

      await this.stateManager.completeJob(jobId, workspaceId);
      await this.eventQueue.publish({
        event: PriceSyncEvent.SYNC_COMPLETED,
        workspaceId,
        accountId,
        jobId,
      });
    } catch (error) {
      this.logger.error(`Price pull job ${jobId} failed: ${error.message}`);
      await this.stateManager.failJob(jobId, workspaceId, error.message);
      await this.eventQueue.publish({
        event: PriceSyncEvent.SYNC_FAILED,
        workspaceId,
        accountId,
        jobId,
        data: { error: error.message },
      });
    }
  }

  private async pullPrice(
    jobId: string,
    workspaceId: string,
    accountId: string,
    price: NormalizedPriceItem,
    conflictStrategy: ConflictResolutionStrategy,
  ): Promise<void> {
    this.validator.validatePriceItem(price);

    const checksum = this.mapper.generateChecksum(price);
    const existingRef = await this.repository.getExternalRef(workspaceId, accountId, price.externalPriceId);

    if (existingRef && existingRef.checksum === checksum) {
      await this.stateManager.recordItemResult(jobId, workspaceId, {
        externalPriceId: price.externalPriceId,
        sku: price.sku,
        status: ItemSyncStatus.SKIPPED,
        operation: 'NO_CHANGE',
      });
      await this.stateManager.incrementCounters(jobId, workspaceId, { skipped: 1, processed: 1 });
      return;
    }

    const atlasPrice = existingRef?.atlasPriceId
      ? await this.getAtlasPrice(existingRef.atlasPriceId)
      : null;

    if (atlasPrice && atlasPrice.isProtected) {
      await this.stateManager.recordItemResult(jobId, workspaceId, {
        externalPriceId: price.externalPriceId,
        sku: price.sku,
        status: ItemSyncStatus.SKIPPED,
        operation: 'PROTECTED',
      });
      await this.stateManager.incrementCounters(jobId, workspaceId, { skipped: 1, processed: 1 });
      await this.eventQueue.publish({
        event: PriceSyncEvent.PRICE_PROTECTED,
        workspaceId,
        accountId,
        jobId,
        externalPriceId: price.externalPriceId,
        sku: price.sku,
      });
      return;
    }

    const hasConflict = await this.conflictResolver.detectConflict(price, atlasPrice);

    if (hasConflict) {
      const resolution = await this.conflictResolver.resolveConflict(conflictStrategy, price, atlasPrice);

      if (resolution.requiresManualReview) {
        await this.conflictResolver.recordConflict(
          workspaceId,
          accountId,
          jobId,
          price.externalPriceId,
          price.sku,
          'PRICE_CONFLICT',
          price.rawData,
          atlasPrice,
        );
        await this.stateManager.recordItemResult(jobId, workspaceId, {
          externalPriceId: price.externalPriceId,
          sku: price.sku,
          status: ItemSyncStatus.CONFLICT,
          operation: 'FLAG',
        });
        await this.stateManager.incrementCounters(jobId, workspaceId, { conflict: 1, processed: 1 });
        await this.eventQueue.publish({
          event: PriceSyncEvent.PRICE_CONFLICT_DETECTED,
          workspaceId,
          accountId,
          jobId,
          externalPriceId: price.externalPriceId,
          sku: price.sku,
        });
        return;
      }

      if (!resolution.useMarketplaceData) {
        await this.stateManager.recordItemResult(jobId, workspaceId, {
          externalPriceId: price.externalPriceId,
          sku: price.sku,
          status: ItemSyncStatus.SKIPPED,
          operation: 'CONFLICT_SKIPPED',
        });
        await this.stateManager.incrementCounters(jobId, workspaceId, { skipped: 1, processed: 1 });
        return;
      }
    }

    const operation = existingRef ? 'UPDATE' : 'CREATE';
    await this.savePrice(price, workspaceId);

    await this.repository.upsertExternalRef({
      workspaceId,
      accountId,
      externalPriceId: price.externalPriceId,
      externalOfferId: price.externalOfferId,
      sku: price.sku,
      variantId: price.variantId,
      marketplaceId: price.marketplaceId,
      countryCode: price.countryCode,
      lastSyncedAt: new Date(),
      checksum,
      metadata: { rawData: price.rawData },
    });

    await this.stateManager.recordItemResult(jobId, workspaceId, {
      externalPriceId: price.externalPriceId,
      sku: price.sku,
      status: ItemSyncStatus.SUCCESS,
      operation,
    });
    await this.stateManager.incrementCounters(jobId, workspaceId, { success: 1, processed: 1 });

    const event = operation === 'CREATE' ? PriceSyncEvent.PRICE_IMPORTED : PriceSyncEvent.PRICE_UPDATED;
    await this.eventQueue.publish({
      event,
      workspaceId,
      accountId,
      jobId,
      externalPriceId: price.externalPriceId,
      sku: price.sku,
      data: { operation },
    });
  }

  private async getAtlasPrice(priceId: string): Promise<any> {
    return null;
  }

  private async savePrice(price: NormalizedPriceItem, workspaceId: string): Promise<void> {
    // Placeholder for actual price persistence logic
  }
}
