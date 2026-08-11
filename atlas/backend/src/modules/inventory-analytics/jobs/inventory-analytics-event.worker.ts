import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InventoryAnalyticsEventPayload } from './inventory-analytics-event.queue';

@Processor('inventory-analytics-events')
export class InventoryAnalyticsEventWorker extends WorkerHost {
  private readonly logger = new Logger(InventoryAnalyticsEventWorker.name);

  async process(job: Job<InventoryAnalyticsEventPayload>): Promise<void> {
    this.logger.log(`Processing inventory analytics event: ${job.name}`);

    const { event, workspaceId } = job.data;

    try {
      switch (event) {
        case 'inventory-analytics.refreshed':
          await this.handleAnalyticsRefreshed(job.data);
          break;
        case 'inventory-analytics.cache_invalidated':
          await this.handleCacheInvalidated(job.data);
          break;
        case 'inventory-analytics.snapshot_created':
          await this.handleSnapshotCreated(job.data);
          break;
        default:
          this.logger.warn(`Unknown analytics event type: ${event}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing analytics event ${event} for workspace ${workspaceId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async handleAnalyticsRefreshed(
    payload: InventoryAnalyticsEventPayload,
  ): Promise<void> {
    this.logger.log(
      `Analytics refreshed for workspace ${payload.workspaceId}`,
    );
  }

  private async handleCacheInvalidated(
    payload: InventoryAnalyticsEventPayload,
  ): Promise<void> {
    this.logger.log(
      `Cache invalidated for workspace ${payload.workspaceId}: ${payload.cacheKeys?.join(', ')}`,
    );
  }

  private async handleSnapshotCreated(
    payload: InventoryAnalyticsEventPayload,
  ): Promise<void> {
    this.logger.log(
      `Analytics snapshot created for workspace ${payload.workspaceId}`,
    );
  }
}
