import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceAnalyticsRepository } from './marketplace-analytics.repository';
import { MarketplaceAnalyticsEventQueue } from './jobs';
import {
  GetMarketplacePerformanceDto,
  GetMarketplaceTrendsDto,
  GetMarketplaceBreakdownDto,
  GetMarketplaceComparisonDto,
  GetProductMarketplaceComparisonDto,
  MarketplacePerformanceResponseDto,
  MarketplaceTrendResponseDto,
  MarketplaceBreakdownResponseDto,
  MarketplaceComparisonResponseDto,
  ProductMarketplaceComparisonResponseDto,
} from './dto';
import {
  IMarketplacePerformance,
  IMarketplaceTrend,
  IMarketplaceBreakdown,
  IMarketplaceComparison,
  IProductMarketplaceComparison,
  MarketplaceAnalyticsEventType,
  MarketplacePerformanceCategory,
  AccountHealthStatus,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class MarketplaceAnalyticsService {
  private readonly logger = new Logger(MarketplaceAnalyticsService.name);
  private readonly CACHE_TTL_MINUTES = 30;

  constructor(
    private readonly repository: MarketplaceAnalyticsRepository,
    private readonly eventQueue: MarketplaceAnalyticsEventQueue,
  ) {}

  async getMarketplacePerformance(dto: GetMarketplacePerformanceDto): Promise<MarketplacePerformanceResponseDto[]> {
    const cacheKey = this.buildCacheKey('performance', dto);
    const cached = await this.repository.getCachedMarketplacePerformance(dto.workspaceId, cacheKey);

    if (cached) {
      return cached as MarketplacePerformanceResponseDto[];
    }

    const performance = await this.repository.getMarketplacePerformance(
      dto,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedMarketplacePerformance(
      dto.workspaceId,
      cacheKey,
      performance,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: MarketplaceAnalyticsEventType.PERFORMANCE_CALCULATED,
      workspaceId: dto.workspaceId,
      metadata: { count: performance.length },
    });

    const underperformingMarketplaces = performance.filter(
      (m) => m.performanceCategory === MarketplacePerformanceCategory.UNDERPERFORMING,
    );
    if (underperformingMarketplaces.length > 0) {
      for (const marketplace of underperformingMarketplaces) {
        await this.eventQueue.publish({
          event: MarketplaceAnalyticsEventType.UNDERPERFORMING_DETECTED,
          workspaceId: dto.workspaceId,
          marketplaceId: marketplace.marketplaceId,
        });
      }
    }

    const highCostMarketplaces = performance.filter(
      (m) => m.performanceCategory === MarketplacePerformanceCategory.HIGH_COST,
    );
    if (highCostMarketplaces.length > 0) {
      for (const marketplace of highCostMarketplaces) {
        await this.eventQueue.publish({
          event: MarketplaceAnalyticsEventType.HIGH_COST_DETECTED,
          workspaceId: dto.workspaceId,
          marketplaceId: marketplace.marketplaceId,
        });
      }
    }

    const criticalAccounts = performance.filter(
      (m) =>
        m.accountHealth.healthStatus === AccountHealthStatus.CRITICAL ||
        m.accountHealth.healthStatus === AccountHealthStatus.SUSPENDED,
    );
    if (criticalAccounts.length > 0) {
      for (const marketplace of criticalAccounts) {
        await this.eventQueue.publish({
          event: MarketplaceAnalyticsEventType.ACCOUNT_HEALTH_CHANGED,
          workspaceId: dto.workspaceId,
          marketplaceId: marketplace.marketplaceId,
          accountId: marketplace.accountId,
          metadata: { healthStatus: marketplace.accountHealth.healthStatus },
        });
      }
    }

    return performance as MarketplacePerformanceResponseDto[];
  }

  async getMarketplaceTrends(dto: GetMarketplaceTrendsDto): Promise<MarketplaceTrendResponseDto[]> {
    const trends = await this.repository.getMarketplaceTrends(
      dto.marketplaceId,
      dto,
      dto.metricType,
      dto.period,
    );

    await this.eventQueue.publish({
      event: MarketplaceAnalyticsEventType.TREND_UPDATED,
      workspaceId: dto.workspaceId,
      marketplaceId: dto.marketplaceId,
      metadata: { metricType: dto.metricType, period: dto.period },
    });

    return trends as MarketplaceTrendResponseDto[];
  }

  async getMarketplaceBreakdown(dto: GetMarketplaceBreakdownDto): Promise<MarketplaceBreakdownResponseDto[]> {
    const breakdown = await this.repository.getMarketplaceBreakdown(
      dto,
      dto.dimension,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    return breakdown as MarketplaceBreakdownResponseDto[];
  }

  async getMarketplaceComparison(dto: GetMarketplaceComparisonDto): Promise<MarketplaceComparisonResponseDto> {
    const comparison = await this.repository.getMarketplaceComparison(
      dto.workspaceId,
      dto.marketplaceId,
      dto.startDate,
      dto.endDate,
      dto.comparisonType,
      dto.comparisonStartDate,
      dto.comparisonEndDate,
      dto.comparisonMarketplaceId,
      dto.currency,
    );

    if (!comparison) {
      throw new ResourceNotFoundException(
        'Marketplace comparison data not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    await this.eventQueue.publish({
      event: MarketplaceAnalyticsEventType.COMPARISON_GENERATED,
      workspaceId: dto.workspaceId,
      marketplaceId: dto.marketplaceId,
      metadata: { comparisonType: dto.comparisonType },
    });

    return comparison as MarketplaceComparisonResponseDto;
  }

  async getProductMarketplaceComparison(
    dto: GetProductMarketplaceComparisonDto,
  ): Promise<ProductMarketplaceComparisonResponseDto> {
    const comparison = await this.repository.getProductMarketplaceComparison(
      dto.workspaceId,
      dto.productId,
      dto.startDate,
      dto.endDate,
      dto.period,
      dto.currency,
    );

    if (!comparison) {
      throw new ResourceNotFoundException(
        'Product marketplace comparison data not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    return comparison as ProductMarketplaceComparisonResponseDto;
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    return this.repository.invalidateCache(workspaceId, pattern);
  }

  private buildCacheKey(type: string, dto: any): string {
    const parts = [
      type,
      dto.startDate?.toISOString().split('T')[0],
      dto.endDate?.toISOString().split('T')[0],
    ];

    if (dto.period) {
      parts.push(dto.period);
    }
    if (dto.dimension) {
      parts.push(dto.dimension);
    }
    if (dto.metricType) {
      parts.push(dto.metricType);
    }
    if (dto.performanceCategory) {
      parts.push(dto.performanceCategory);
    }
    if (dto.currency) {
      parts.push(dto.currency);
    }

    return parts.filter(Boolean).join(':');
  }
}
