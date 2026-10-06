import { Injectable, Logger } from '@nestjs/common';
import { ProductAnalyticsRepository } from './product-analytics.repository';
import { ProductAnalyticsEventQueue } from './jobs';
import {
  GetProductPerformanceDto,
  GetProductTrendsDto,
  GetProductBreakdownDto,
  GetProductComparisonDto,
  GetProductCohortDto,
  GetListingPerformanceDto,
  GetMarketplacePerformanceDto,
  ProductPerformanceResponseDto,
  ProductTrendResponseDto,
  ProductBreakdownResponseDto,
  ProductComparisonResponseDto,
  ProductCohortResponseDto,
  ListingPerformanceResponseDto,
  MarketplacePerformanceResponseDto,
} from './dto';
import {
  IProductPerformance,
  IProductTrend,
  IProductBreakdown,
  IProductComparison,
  IProductCohort,
  IListingPerformance,
  IMarketplacePerformance,
  ProductAnalyticsEventType,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class ProductAnalyticsService {
  private readonly logger = new Logger(ProductAnalyticsService.name);
  private readonly CACHE_TTL_MINUTES = 30;

  constructor(
    private readonly repository: ProductAnalyticsRepository,
    private readonly eventQueue: ProductAnalyticsEventQueue,
  ) {}

  async getProductPerformance(dto: GetProductPerformanceDto): Promise<ProductPerformanceResponseDto[]> {
    const cacheKey = this.buildCacheKey('performance', dto);
    const cached = await this.repository.getCachedProductPerformance(dto.workspaceId, cacheKey);

    if (cached) {
      return cached as ProductPerformanceResponseDto[];
    }

    const performance = await this.repository.getProductPerformance(
      dto,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedProductPerformance(
      dto.workspaceId,
      cacheKey,
      performance,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: ProductAnalyticsEventType.PERFORMANCE_CALCULATED,
      workspaceId: dto.workspaceId,
      metadata: { count: performance.length },
    });

    return performance as ProductPerformanceResponseDto[];
  }

  async getProductTrends(dto: GetProductTrendsDto): Promise<ProductTrendResponseDto[]> {
    const trends = await this.repository.getProductTrends(
      dto.productId,
      dto,
      dto.metricType,
      dto.period,
    );

    await this.eventQueue.publish({
      event: ProductAnalyticsEventType.TREND_UPDATED,
      workspaceId: dto.workspaceId,
      productId: dto.productId,
      metadata: { metricType: dto.metricType, period: dto.period },
    });

    return trends as ProductTrendResponseDto[];
  }

  async getProductBreakdown(dto: GetProductBreakdownDto): Promise<ProductBreakdownResponseDto[]> {
    const breakdown = await this.repository.getProductBreakdown(
      dto,
      dto.dimension,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    return breakdown as ProductBreakdownResponseDto[];
  }

  async getProductComparison(dto: GetProductComparisonDto): Promise<ProductComparisonResponseDto> {
    const comparison = await this.repository.getProductComparison(
      dto.workspaceId,
      dto.productId,
      dto.startDate,
      dto.endDate,
      dto.comparisonType,
      dto.comparisonStartDate,
      dto.comparisonEndDate,
      dto.currency,
    );

    if (!comparison) {
      throw new ResourceNotFoundException(
        'Product comparison data not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    await this.eventQueue.publish({
      event: ProductAnalyticsEventType.COMPARISON_GENERATED,
      workspaceId: dto.workspaceId,
      productId: dto.productId,
      metadata: { comparisonType: dto.comparisonType },
    });

    return comparison as ProductComparisonResponseDto;
  }

  async getProductCohort(dto: GetProductCohortDto): Promise<ProductCohortResponseDto[]> {
    const cohorts = await this.repository.getProductCohort(
      dto.workspaceId,
      dto.launchDateStart,
      dto.launchDateEnd,
      dto.startDate,
      dto.endDate,
      dto.period,
      dto.currency,
    );

    await this.eventQueue.publish({
      event: ProductAnalyticsEventType.COHORT_ANALYZED,
      workspaceId: dto.workspaceId,
      metadata: { cohortCount: cohorts.length },
    });

    return cohorts as ProductCohortResponseDto[];
  }

  async getListingPerformance(dto: GetListingPerformanceDto): Promise<ListingPerformanceResponseDto[]> {
    const listings = await this.repository.getListingPerformance(
      dto.workspaceId,
      dto.productId,
      dto.sku,
      dto.marketplaceIds,
      dto.accountIds,
      dto.minQuality,
      dto.limit,
    );

    await this.eventQueue.publish({
      event: ProductAnalyticsEventType.LISTING_QUALITY_UPDATED,
      workspaceId: dto.workspaceId,
      productId: dto.productId,
      metadata: { listingCount: listings.length },
    });

    return listings as ListingPerformanceResponseDto[];
  }

  async getMarketplacePerformance(dto: GetMarketplacePerformanceDto): Promise<MarketplacePerformanceResponseDto[]> {
    const performance = await this.repository.getMarketplacePerformance(
      dto,
      dto.productId,
      dto.sku,
      dto.limit,
    );

    return performance as MarketplacePerformanceResponseDto[];
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
    if (dto.lifecycleStage) {
      parts.push(dto.lifecycleStage);
    }
    if (dto.currency) {
      parts.push(dto.currency);
    }

    return parts.filter(Boolean).join(':');
  }
}
