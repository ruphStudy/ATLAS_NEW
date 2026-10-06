import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ICacheEventPayload, CacheEventType } from '../interfaces';

@Processor('analytics-cache-events')
export class AnalyticsCacheEventWorker extends WorkerHost {
  private readonly logger = new Logger(AnalyticsCacheEventWorker.name);

  async process(job: Job<ICacheEventPayload>): Promise<void> {
    const { event, workspaceId, cacheKey, entryType, resourceId, metadata } = job.data;

    this.logger.log(
      `Processing event: ${event} for workspace: ${workspaceId}, key: ${cacheKey}, type: ${entryType}`,
    );

    try {
      switch (event) {
        case CacheEventType.CACHE_HIT:
          await this.handleCacheHit(job.data);
          break;
        case CacheEventType.CACHE_MISS:
          await this.handleCacheMiss(job.data);
          break;
        case CacheEventType.CACHE_STALE_READ:
          await this.handleCacheStaleRead(job.data);
          break;
        case CacheEventType.CACHE_REFRESH:
          await this.handleCacheRefresh(job.data);
          break;
        case CacheEventType.CACHE_EVICTION:
          await this.handleCacheEviction(job.data);
          break;
        case CacheEventType.CACHE_INVALIDATION:
          await this.handleCacheInvalidation(job.data);
          break;
        case CacheEventType.CACHE_WARMING_STARTED:
          await this.handleCacheWarmingStarted(job.data);
          break;
        case CacheEventType.CACHE_WARMING_COMPLETED:
          await this.handleCacheWarmingCompleted(job.data);
          break;
        case CacheEventType.BULK_INVALIDATION:
          await this.handleBulkInvalidation(job.data);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event}`);
      }
    } catch (error) {
      this.logger.error(
        `Error processing event ${event}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private async handleCacheHit(payload: ICacheEventPayload): Promise<void> {
    this.logger.debug(`Cache hit: ${payload.cacheKey}`);
  }

  private async handleCacheMiss(payload: ICacheEventPayload): Promise<void> {
    this.logger.debug(`Cache miss: ${payload.cacheKey}`);
  }

  private async handleCacheStaleRead(payload: ICacheEventPayload): Promise<void> {
    this.logger.debug(`Cache stale read: ${payload.cacheKey}`);
  }

  private async handleCacheRefresh(payload: ICacheEventPayload): Promise<void> {
    this.logger.debug(`Cache refresh: ${payload.cacheKey}`);
  }

  private async handleCacheEviction(payload: ICacheEventPayload): Promise<void> {
    this.logger.debug(`Cache eviction: ${payload.cacheKey}`);
  }

  private async handleCacheInvalidation(payload: ICacheEventPayload): Promise<void> {
    this.logger.log(`Cache invalidation: ${payload.cacheKey || 'pattern'}`);
  }

  private async handleCacheWarmingStarted(payload: ICacheEventPayload): Promise<void> {
    this.logger.debug(`Cache warming started for workspace: ${payload.workspaceId}`);
  }

  private async handleCacheWarmingCompleted(payload: ICacheEventPayload): Promise<void> {
    this.logger.log(`Cache warming completed for workspace: ${payload.workspaceId}`);
  }

  private async handleBulkInvalidation(payload: ICacheEventPayload): Promise<void> {
    this.logger.log(`Bulk invalidation for workspace: ${payload.workspaceId}`, payload.metadata);
  }
}
