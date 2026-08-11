import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsCacheRepository } from './analytics-cache.repository';
import { AnalyticsCacheEventQueue } from './jobs';
import {
  SetCacheDto,
  GetCacheDto,
  InvalidateCacheDto,
  WarmCacheDto,
  CacheMetricsFilterDto,
  CacheEntryResponseDto,
  CacheInvalidationResponseDto,
  CacheMetricsResponseDto,
  CacheStatsResponseDto,
} from './dto';
import {
  CacheEventType,
  ICacheEntry,
} from './interfaces';

@Injectable()
export class AnalyticsCacheService {
  private readonly logger = new Logger(AnalyticsCacheService.name);
  private readonly DEFAULT_TTL_SECONDS = 300;
  private readonly DEFAULT_STALE_TIME_SECONDS = 60;

  constructor(
    private readonly repository: AnalyticsCacheRepository,
    private readonly eventQueue: AnalyticsCacheEventQueue,
  ) {}

  async get(dto: GetCacheDto): Promise<any | null> {
    const cacheKey = this.buildCacheKey(dto);

    try {
      const entry = await this.repository.getCacheEntry(cacheKey, dto.workspaceId);

      if (!entry) {
        await this.eventQueue.publish({
          event: CacheEventType.CACHE_MISS,
          workspaceId: dto.workspaceId,
          cacheKey,
          entryType: dto.entryType,
          resourceId: dto.resourceId,
          timestamp: new Date(),
        });

        return null;
      }

      const now = new Date();

      if (now > entry.expiresAt) {
        await this.eventQueue.publish({
          event: CacheEventType.CACHE_EVICTION,
          workspaceId: dto.workspaceId,
          cacheKey,
          entryType: dto.entryType,
          resourceId: dto.resourceId,
          timestamp: new Date(),
        });

        await this.repository.deleteCacheEntry(cacheKey, dto.workspaceId);
        return null;
      }

      const isStale = entry.staleAt && now > entry.staleAt;

      if (isStale && !dto.allowStale) {
        await this.eventQueue.publish({
          event: CacheEventType.CACHE_MISS,
          workspaceId: dto.workspaceId,
          cacheKey,
          entryType: dto.entryType,
          resourceId: dto.resourceId,
          timestamp: new Date(),
          metadata: { reason: 'stale' },
        });

        return null;
      }

      await this.repository.incrementHitCount(cacheKey, dto.workspaceId);

      if (isStale) {
        await this.eventQueue.publish({
          event: CacheEventType.CACHE_STALE_READ,
          workspaceId: dto.workspaceId,
          cacheKey,
          entryType: dto.entryType,
          resourceId: dto.resourceId,
          timestamp: new Date(),
        });

        setImmediate(() => this.refreshStaleEntry(entry));
      } else {
        await this.eventQueue.publish({
          event: CacheEventType.CACHE_HIT,
          workspaceId: dto.workspaceId,
          cacheKey,
          entryType: dto.entryType,
          resourceId: dto.resourceId,
          timestamp: new Date(),
        });
      }

      return entry.data;
    } catch (error) {
      this.logger.error(
        `Cache get failed for key ${cacheKey}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async set(dto: SetCacheDto): Promise<CacheEntryResponseDto> {
    const cacheKey = this.buildCacheKey(dto);
    const version = dto.version || '1';

    const entry = await this.repository.setCacheEntry({
      ...dto,
      cacheKey,
      version,
      ttlSeconds: dto.ttlSeconds ?? this.DEFAULT_TTL_SECONDS,
      staleTimeSeconds: dto.staleWhileRevalidate
        ? dto.staleTimeSeconds ?? this.DEFAULT_STALE_TIME_SECONDS
        : undefined,
    });

    await this.eventQueue.publish({
      event: CacheEventType.CACHE_REFRESH,
      workspaceId: dto.workspaceId,
      cacheKey,
      entryType: dto.entryType,
      resourceId: dto.resourceId,
      timestamp: new Date(),
    });

    return entry as CacheEntryResponseDto;
  }

  async invalidate(dto: InvalidateCacheDto): Promise<CacheInvalidationResponseDto> {
    let invalidatedCount = 0;

    if (dto.pattern) {
      invalidatedCount = await this.repository.invalidateCacheByPattern(
        dto.workspaceId,
        dto.pattern,
      );
    } else if (dto.scopes) {
      invalidatedCount = await this.repository.invalidateCacheByScopes(
        dto.workspaceId,
        dto.scopes,
      );
    } else if (dto.entryTypes) {
      invalidatedCount = await this.repository.invalidateCacheByEntryTypes(
        dto.workspaceId,
        dto.entryTypes,
      );
    } else if (dto.resourceIds) {
      invalidatedCount = await this.repository.invalidateCacheByResourceIds(
        dto.workspaceId,
        dto.resourceIds,
      );
    }

    const invalidation = await this.repository.createInvalidation({
      ...dto,
      invalidatedCount,
    });

    await this.eventQueue.publish({
      event: CacheEventType.CACHE_INVALIDATION,
      workspaceId: dto.workspaceId,
      timestamp: new Date(),
      metadata: {
        trigger: dto.trigger,
        invalidatedCount,
      },
    });

    return invalidation as CacheInvalidationResponseDto;
  }

  async bulkInvalidate(
    workspaceId: string,
    invalidations: InvalidateCacheDto[],
  ): Promise<CacheInvalidationResponseDto[]> {
    const results: CacheInvalidationResponseDto[] = [];

    for (const dto of invalidations) {
      const result = await this.invalidate(dto);
      results.push(result);
    }

    await this.eventQueue.publish({
      event: CacheEventType.BULK_INVALIDATION,
      workspaceId,
      timestamp: new Date(),
      metadata: {
        totalInvalidated: results.reduce((sum, r) => sum + r.invalidatedCount, 0),
        operationsCount: invalidations.length,
      },
    });

    return results;
  }

  async warmCache(dto: WarmCacheDto): Promise<{ warmedCount: number }> {
    await this.eventQueue.publish({
      event: CacheEventType.CACHE_WARMING_STARTED,
      workspaceId: dto.workspaceId,
      timestamp: new Date(),
      metadata: {
        entryTypes: dto.entryTypes,
        resourceIds: dto.resourceIds,
      },
    });

    let warmedCount = 0;

    await this.eventQueue.publish({
      event: CacheEventType.CACHE_WARMING_COMPLETED,
      workspaceId: dto.workspaceId,
      timestamp: new Date(),
      metadata: { warmedCount },
    });

    return { warmedCount };
  }

  async getStats(workspaceId: string): Promise<CacheStatsResponseDto> {
    const stats = await this.repository.getCacheStats(workspaceId);

    const hitRate = stats.totalHits + stats.totalMisses > 0
      ? stats.totalHits / (stats.totalHits + stats.totalMisses)
      : 0;

    return {
      workspaceId,
      totalEntries: stats.totalEntries,
      totalHits: stats.totalHits,
      totalMisses: stats.totalMisses,
      hitRate,
      entriesByType: stats.entriesByType,
      expiringCount: stats.expiringCount,
      staleCount: stats.staleCount,
    };
  }

  async getMetrics(filter: CacheMetricsFilterDto): Promise<CacheMetricsResponseDto[]> {
    const metrics = await this.repository.getMetrics(filter);
    return metrics as CacheMetricsResponseDto[];
  }

  async cleanupExpired(workspaceId: string): Promise<{ cleanedCount: number }> {
    const cleanedCount = await this.repository.cleanupExpiredEntries(workspaceId);

    if (cleanedCount > 0) {
      await this.eventQueue.publish({
        event: CacheEventType.CACHE_EVICTION,
        workspaceId,
        timestamp: new Date(),
        metadata: { cleanedCount },
      });
    }

    return { cleanedCount };
  }

  private async refreshStaleEntry(entry: ICacheEntry): Promise<void> {
    this.logger.debug(`Background refresh triggered for stale entry: ${entry.cacheKey}`);
  }

  private buildCacheKey(dto: GetCacheDto | SetCacheDto): string {
    const parts = [
      dto.workspaceId,
      dto.entryType,
      dto.resourceId,
    ];

    const scopeKeys = Object.keys(dto.scopes).sort();
    for (const key of scopeKeys) {
      parts.push(`${key}:${dto.scopes[key as any]}`);
    }

    if (dto.filters) {
      const filterKeys = Object.keys(dto.filters).sort();
      for (const key of filterKeys) {
        parts.push(`filter:${key}:${JSON.stringify(dto.filters[key])}`);
      }
    }

    if (dto.dateRange) {
      parts.push(`date:${dto.dateRange.start.toISOString()}:${dto.dateRange.end.toISOString()}`);
    }

    if (dto.version) {
      parts.push(`v:${dto.version}`);
    }

    return parts.join(':');
  }
}
