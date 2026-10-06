import { Injectable, Logger } from '@nestjs/common';
import { SupplierAnalyticsRepository } from './supplier-analytics.repository';
import { SupplierAnalyticsEventQueue } from './jobs';
import {
  GetSupplierPerformanceDto,
  GetSupplierTrendsDto,
  GetSupplierBreakdownDto,
  GetSupplierComparisonDto,
  GetSupplierRankingDto,
  SupplierPerformanceResponseDto,
  SupplierTrendResponseDto,
  SupplierBreakdownResponseDto,
  SupplierComparisonResponseDto,
  SupplierRankingResponseDto,
} from './dto';
import {
  ISupplierPerformance,
  ISupplierTrend,
  ISupplierBreakdown,
  ISupplierComparison,
  ISupplierRanking,
  SupplierAnalyticsEventType,
  SupplierPerformanceCategory,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class SupplierAnalyticsService {
  private readonly logger = new Logger(SupplierAnalyticsService.name);
  private readonly CACHE_TTL_MINUTES = 30;

  constructor(
    private readonly repository: SupplierAnalyticsRepository,
    private readonly eventQueue: SupplierAnalyticsEventQueue,
  ) {}

  async getSupplierPerformance(dto: GetSupplierPerformanceDto): Promise<SupplierPerformanceResponseDto[]> {
    const cacheKey = this.buildCacheKey('performance', dto);
    const cached = await this.repository.getCachedSupplierPerformance(dto.workspaceId, cacheKey);

    if (cached) {
      return cached as SupplierPerformanceResponseDto[];
    }

    const performance = await this.repository.getSupplierPerformance(
      dto,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedSupplierPerformance(
      dto.workspaceId,
      cacheKey,
      performance,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: SupplierAnalyticsEventType.PERFORMANCE_CALCULATED,
      workspaceId: dto.workspaceId,
      metadata: { count: performance.length },
    });

    const riskySuppliers = performance.filter(
      (s) => s.performanceCategory === SupplierPerformanceCategory.RISKY,
    );
    if (riskySuppliers.length > 0) {
      for (const supplier of riskySuppliers) {
        await this.eventQueue.publish({
          event: SupplierAnalyticsEventType.RISKY_DETECTED,
          workspaceId: dto.workspaceId,
          supplierId: supplier.supplierId,
        });
      }
    }

    const inactiveSuppliers = performance.filter(
      (s) => s.performanceCategory === SupplierPerformanceCategory.INACTIVE,
    );
    if (inactiveSuppliers.length > 0) {
      for (const supplier of inactiveSuppliers) {
        await this.eventQueue.publish({
          event: SupplierAnalyticsEventType.INACTIVE_DETECTED,
          workspaceId: dto.workspaceId,
          supplierId: supplier.supplierId,
        });
      }
    }

    return performance as SupplierPerformanceResponseDto[];
  }

  async getSupplierTrends(dto: GetSupplierTrendsDto): Promise<SupplierTrendResponseDto[]> {
    const trends = await this.repository.getSupplierTrends(
      dto.supplierId,
      dto,
      dto.metricType,
      dto.period,
    );

    await this.eventQueue.publish({
      event: SupplierAnalyticsEventType.TREND_UPDATED,
      workspaceId: dto.workspaceId,
      supplierId: dto.supplierId,
      metadata: { metricType: dto.metricType, period: dto.period },
    });

    return trends as SupplierTrendResponseDto[];
  }

  async getSupplierBreakdown(dto: GetSupplierBreakdownDto): Promise<SupplierBreakdownResponseDto[]> {
    const breakdown = await this.repository.getSupplierBreakdown(
      dto,
      dto.dimension,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    return breakdown as SupplierBreakdownResponseDto[];
  }

  async getSupplierComparison(dto: GetSupplierComparisonDto): Promise<SupplierComparisonResponseDto> {
    const comparison = await this.repository.getSupplierComparison(
      dto.workspaceId,
      dto.supplierId,
      dto.startDate,
      dto.endDate,
      dto.comparisonType,
      dto.comparisonStartDate,
      dto.comparisonEndDate,
      dto.currency,
    );

    if (!comparison) {
      throw new ResourceNotFoundException(
        'Supplier comparison data not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    await this.eventQueue.publish({
      event: SupplierAnalyticsEventType.COMPARISON_GENERATED,
      workspaceId: dto.workspaceId,
      supplierId: dto.supplierId,
      metadata: { comparisonType: dto.comparisonType },
    });

    return comparison as SupplierComparisonResponseDto;
  }

  async getSupplierRanking(dto: GetSupplierRankingDto): Promise<SupplierRankingResponseDto[]> {
    const rankings = await this.repository.getSupplierRanking(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      dto.period,
      dto.category,
      dto.limit,
    );

    await this.eventQueue.publish({
      event: SupplierAnalyticsEventType.RANKING_UPDATED,
      workspaceId: dto.workspaceId,
      metadata: { rankingCount: rankings.length },
    });

    return rankings as SupplierRankingResponseDto[];
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
