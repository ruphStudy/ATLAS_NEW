import { Injectable, Logger } from '@nestjs/common';
import { CustomerAnalyticsRepository } from './customer-analytics.repository';
import { CustomerAnalyticsEventQueue } from './jobs';
import {
  GetCustomerPerformanceDto,
  GetCustomerTrendsDto,
  GetCustomerBreakdownDto,
  GetCustomerComparisonDto,
  GetCustomerCohortDto,
  GetProductAffinityDto,
  GetCustomerSegmentAlertsDto,
  CustomerPerformanceResponseDto,
  CustomerTrendResponseDto,
  CustomerBreakdownResponseDto,
  CustomerComparisonResponseDto,
  CustomerCohortResponseDto,
  ProductAffinityResponseDto,
  CustomerSegmentAlertResponseDto,
} from './dto';
import {
  ICustomerPerformance,
  ICustomerTrend,
  ICustomerBreakdown,
  ICustomerComparison,
  ICustomerCohort,
  IProductAffinity,
  ICustomerSegmentAlert,
  ICustomerAnalyticsFilters,
  CustomerAnalyticsEventType,
  CustomerSegment,
} from './interfaces';

@Injectable()
export class CustomerAnalyticsService {
  private readonly logger = new Logger(CustomerAnalyticsService.name);
  private readonly CACHE_TTL_MINUTES = 30;

  constructor(
    private readonly repository: CustomerAnalyticsRepository,
    private readonly eventQueue: CustomerAnalyticsEventQueue,
  ) {}

  async getCustomerPerformance(
    dto: GetCustomerPerformanceDto,
  ): Promise<CustomerPerformanceResponseDto[]> {
    const cacheKey = this.buildCacheKey('performance', dto);
    const cached = await this.repository.getCachedCustomerPerformance(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as CustomerPerformanceResponseDto[];
    }

    const filters: ICustomerAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      marketplaceIds: dto.marketplaceIds,
      accountIds: dto.accountIds,
      countries: dto.countries,
      regions: dto.regions,
      segments: dto.segments,
      minLifetimeValue: dto.minLifetimeValue,
      maxLifetimeValue: dto.maxLifetimeValue,
      minOrderCount: dto.minOrderCount,
      minRetentionRate: dto.minRetentionRate,
      minOverallScore: dto.minOverallScore,
    };

    const results = await this.repository.getCustomerPerformance(
      filters,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedCustomerPerformance(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: CustomerAnalyticsEventType.PERFORMANCE_CALCULATED,
      workspaceId: dto.workspaceId,
    });

    results.forEach((result) => {
      if (result.segment === CustomerSegment.HIGH_VALUE) {
        this.eventQueue.publish({
          event: CustomerAnalyticsEventType.HIGH_VALUE_DETECTED,
          workspaceId: result.workspaceId,
          marketplaceId: result.marketplaceId,
          segment: result.segment,
          severity: 'low',
          metadata: {
            customerCount: result.countMetrics.totalCustomers,
            averageLifetimeValue: result.valueMetrics.averageLifetimeValue,
          },
        });
      }

      if (result.segment === CustomerSegment.AT_RISK) {
        this.eventQueue.publish({
          event: CustomerAnalyticsEventType.CHURN_RISK_DETECTED,
          workspaceId: result.workspaceId,
          marketplaceId: result.marketplaceId,
          segment: result.segment,
          severity: 'high',
          metadata: {
            customerCount: result.countMetrics.totalCustomers,
            churnRate: result.countMetrics.churnRate,
            retentionRate: result.countMetrics.retentionRate,
          },
        });
      }

      if (result.segment === CustomerSegment.INACTIVE) {
        this.eventQueue.publish({
          event: CustomerAnalyticsEventType.INACTIVE_DETECTED,
          workspaceId: result.workspaceId,
          marketplaceId: result.marketplaceId,
          segment: result.segment,
          severity: 'medium',
          metadata: {
            inactiveCustomers: result.countMetrics.inactiveCustomers,
          },
        });
      }

      if (result.segment === CustomerSegment.HIGH_RETURN) {
        this.eventQueue.publish({
          event: CustomerAnalyticsEventType.HIGH_RETURN_DETECTED,
          workspaceId: result.workspaceId,
          marketplaceId: result.marketplaceId,
          segment: result.segment,
          severity: 'high',
          metadata: {
            returnRate: result.returnRefundMetrics.returnRate,
            returnImpact: result.returnRefundMetrics.returnImpactAmount,
          },
        });
      }
    });

    return results as CustomerPerformanceResponseDto[];
  }

  async getCustomerTrends(
    dto: GetCustomerTrendsDto,
  ): Promise<CustomerTrendResponseDto[]> {
    const cacheKey = this.buildCacheKey('trends', dto);
    const cached = await this.repository.getCachedCustomerTrends(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as CustomerTrendResponseDto[];
    }

    const filters: ICustomerAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      marketplaceIds: dto.marketplaceIds,
    };

    const results = await this.repository.getCustomerTrends(
      filters,
      dto.metricType,
      dto.period,
      dto.dimension,
      dto.dimensionValue,
    );

    await this.repository.setCachedCustomerTrends(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: CustomerAnalyticsEventType.TREND_UPDATED,
      workspaceId: dto.workspaceId,
      metadata: {
        metricType: dto.metricType,
        period: dto.period,
      },
    });

    return results as CustomerTrendResponseDto[];
  }

  async getCustomerBreakdown(
    dto: GetCustomerBreakdownDto,
  ): Promise<CustomerBreakdownResponseDto[]> {
    const cacheKey = this.buildCacheKey('breakdown', dto);
    const cached = await this.repository.getCachedCustomerBreakdown(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as CustomerBreakdownResponseDto[];
    }

    const filters: ICustomerAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      marketplaceIds: dto.marketplaceIds,
    };

    const results = await this.repository.getCustomerBreakdown(
      filters,
      dto.dimension,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedCustomerBreakdown(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    return results as CustomerBreakdownResponseDto[];
  }

  async getCustomerComparison(
    dto: GetCustomerComparisonDto,
  ): Promise<CustomerComparisonResponseDto | null> {
    const cacheKey = this.buildCacheKey('comparison', dto);
    const cached = await this.repository.getCachedCustomerComparison(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as CustomerComparisonResponseDto;
    }

    const result = await this.repository.getCustomerComparison(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      dto.comparisonType,
      dto.period,
      dto.comparisonStartDate,
      dto.comparisonEndDate,
      dto.marketplaceId,
      dto.segment,
    );

    if (result) {
      await this.repository.setCachedCustomerComparison(
        dto.workspaceId,
        cacheKey,
        result,
        this.CACHE_TTL_MINUTES,
      );

      await this.eventQueue.publish({
        event: CustomerAnalyticsEventType.COMPARISON_GENERATED,
        workspaceId: dto.workspaceId,
        marketplaceId: dto.marketplaceId,
        metadata: {
          comparisonType: dto.comparisonType,
        },
      });
    }

    return result as CustomerComparisonResponseDto | null;
  }

  async getCustomerCohort(
    dto: GetCustomerCohortDto,
  ): Promise<CustomerCohortResponseDto> {
    const periodsToTrack = dto.periodsToTrack || 12;

    const result = await this.repository.getCustomerCohort(
      dto.workspaceId,
      dto.cohortStart,
      dto.cohortEnd,
      dto.cohortPeriod,
      periodsToTrack,
      dto.marketplaceIds,
    );

    await this.eventQueue.publish({
      event: CustomerAnalyticsEventType.COHORT_ANALYZED,
      workspaceId: dto.workspaceId,
      metadata: {
        cohortPeriod: dto.cohortPeriod,
        customersInCohort: result.customersInCohort,
      },
    });

    return result as CustomerCohortResponseDto;
  }

  async getProductAffinity(
    dto: GetProductAffinityDto,
  ): Promise<ProductAffinityResponseDto[]> {
    const results = await this.repository.getProductAffinity(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      dto.productIds,
      dto.categoryIds,
      dto.minAffinityScore,
      dto.limit,
    );

    return results as ProductAffinityResponseDto[];
  }

  async getCustomerSegmentAlerts(
    dto: GetCustomerSegmentAlertsDto,
  ): Promise<CustomerSegmentAlertResponseDto[]> {
    const results = await this.repository.getCustomerSegmentAlerts(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      dto.alertTypes,
      dto.severities,
      dto.marketplaceIds,
      dto.limit,
    );

    return results as CustomerSegmentAlertResponseDto[];
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    return this.repository.invalidateCustomerCache(workspaceId, pattern);
  }

  private buildCacheKey(type: string, dto: any): string {
    const parts = [type];

    if (dto.startDate) {
      parts.push(dto.startDate.toISOString().split('T')[0]);
    }

    if (dto.endDate) {
      parts.push(dto.endDate.toISOString().split('T')[0]);
    }

    if (dto.period) {
      parts.push(dto.period);
    }

    if (dto.dimension) {
      parts.push(dto.dimension);
    }

    if (dto.metricType) {
      parts.push(dto.metricType);
    }

    if (dto.comparisonType) {
      parts.push(dto.comparisonType);
    }

    if (dto.marketplaceIds && dto.marketplaceIds.length > 0) {
      parts.push(`m:${dto.marketplaceIds.sort().join(',')}`);
    }

    if (dto.marketplaceId) {
      parts.push(`m:${dto.marketplaceId}`);
    }

    if (dto.segment) {
      parts.push(`s:${dto.segment}`);
    }

    return parts.join(':');
  }
}
