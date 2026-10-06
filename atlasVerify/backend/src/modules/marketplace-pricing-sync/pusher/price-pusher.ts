import { Injectable, Logger } from '@nestjs/common';
import { PriceSyncRepository } from '../repository/price-sync.repository';
import { PriceSyncStateManager } from '../state/price-sync-state.manager';
import { PriceSyncEventQueue } from '../events/price-sync-events.queue';
import { PriceMapper } from '../mapper/price-mapper';
import { PriceSyncAdapter, PriceSyncEvent, ItemSyncStatus } from '../interfaces';

@Injectable()
export class PricePusher {
  private readonly logger = new Logger(PricePusher.name);

  constructor(
    private readonly repository: PriceSyncRepository,
    private readonly stateManager: PriceSyncStateManager,
    private readonly eventQueue: PriceSyncEventQueue,
    private readonly mapper: PriceMapper,
  ) {}

  async push(params: {
    jobId: string;
    workspaceId: string;
    accountId: string;
    adapter: PriceSyncAdapter;
    prices: any[];
  }): Promise<void> {
    const { jobId, workspaceId, accountId, adapter, prices } = params;

    for (const atlasPrice of prices) {
      try {
        const normalized = this.mapper.normalizeOutbound(atlasPrice);
        
        const result = await adapter.pushPrice({
          accountId,
          price: normalized as any,
        });

        if (result.success) {
          await this.repository.upsertExternalRef({
            workspaceId,
            accountId,
            externalPriceId: result.externalPriceId,
            externalOfferId: result.externalOfferId,
            atlasPriceId: atlasPrice.id,
            sku: atlasPrice.sku,
            lastSyncedAt: new Date(),
            checksum: this.mapper.generateChecksum(normalized as any),
          });

          await this.stateManager.recordItemResult(jobId, workspaceId, {
            externalPriceId: result.externalPriceId,
            sku: atlasPrice.sku,
            status: ItemSyncStatus.SUCCESS,
            operation: 'PUSH',
          });
          await this.stateManager.incrementCounters(jobId, workspaceId, { success: 1, processed: 1 });

          await this.eventQueue.publish({
            event: PriceSyncEvent.PRICE_EXPORTED,
            workspaceId,
            accountId,
            jobId,
            externalPriceId: result.externalPriceId,
            sku: atlasPrice.sku,
          });
        } else {
          await this.stateManager.recordItemResult(jobId, workspaceId, {
            externalPriceId: atlasPrice.id,
            sku: atlasPrice.sku,
            status: ItemSyncStatus.FAILED,
            errorMessage: result.error,
          });
          await this.stateManager.incrementCounters(jobId, workspaceId, { failed: 1, processed: 1 });
        }
      } catch (error) {
        this.logger.error(`Failed to push price ${atlasPrice.id}: ${error.message}`);
        await this.stateManager.recordItemResult(jobId, workspaceId, {
          externalPriceId: atlasPrice.id,
          sku: atlasPrice.sku,
          status: ItemSyncStatus.FAILED,
          errorMessage: error.message,
        });
        await this.stateManager.incrementCounters(jobId, workspaceId, { failed: 1, processed: 1 });
      }
    }
  }

  async update(params: {
    jobId: string;
    workspaceId: string;
    accountId: string;
    adapter: PriceSyncAdapter;
    externalPriceId: string;
    price: Partial<any>;
  }): Promise<void> {
    const { jobId, workspaceId, accountId, adapter, externalPriceId, price } = params;

    try {
      const normalized = this.mapper.normalizeOutbound(price);
      
      const result = await adapter.updatePrice({
        accountId,
        externalPriceId,
        price: normalized,
      });

      if (result.success) {
        await this.stateManager.recordItemResult(jobId, workspaceId, {
          externalPriceId,
          sku: price.sku,
          status: ItemSyncStatus.SUCCESS,
          operation: 'UPDATE',
        });
        await this.stateManager.incrementCounters(jobId, workspaceId, { success: 1, processed: 1 });

        await this.eventQueue.publish({
          event: PriceSyncEvent.PRICE_PUSHED,
          workspaceId,
          accountId,
          jobId,
          externalPriceId,
          sku: price.sku,
        });
      } else {
        await this.stateManager.recordItemResult(jobId, workspaceId, {
          externalPriceId,
          sku: price.sku,
          status: ItemSyncStatus.FAILED,
          errorMessage: result.error,
        });
        await this.stateManager.incrementCounters(jobId, workspaceId, { failed: 1, processed: 1 });
      }
    } catch (error) {
      this.logger.error(`Failed to update price ${externalPriceId}: ${error.message}`);
      await this.stateManager.recordItemResult(jobId, workspaceId, {
        externalPriceId,
        sku: price.sku,
        status: ItemSyncStatus.FAILED,
        errorMessage: error.message,
      });
      await this.stateManager.incrementCounters(jobId, workspaceId, { failed: 1, processed: 1 });
    }
  }
}
