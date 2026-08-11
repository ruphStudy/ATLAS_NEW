import { Injectable, Logger } from '@nestjs/common';
import { ProcurementAnalyticsRepository } from './procurement-analytics.repository';
import { ProcurementAnalyticsEventQueue } from './jobs';
import {
  GetProcurementPerformanceDto,
  GetProcurementTrendsDto,
  GetProcurementBreakdownDto,
  GetProcurementComparisonDto,
  GetProcurementRiskAlertsDto,
  ProcurementPerformanceResponseDto,
  ProcurementTrendResponseDto,
  ProcurementBreakdownResponseDto,
  ProcurementComparisonResponseDto,
  ProcurementRiskAlertResponseDto,
} from './dto';
import {
  IProcurementPerformance,
  IProcurementTrend,
  IProcurementBreakdown,
  IProcurementComparison,
  IProcurementRiskAlert,
  IProcurementAnalyticsFilters,
  ProcurementAnalyticsEventType,
  ProcurementPerformanceCategory,
} from './interfaces';

@Injectable()
export class ProcurementAnalyticsService {
  private readonly logger = new Logger(ProcurementAnalyticsService.name);
  private readonly CACHE_TTL_MINUTES = 30;

  constructor(
    private readonly repository: ProcurementAnalyticsRepository,
    private readonly eventQueue: ProcurementAnalyticsEventQueue,
  ) {}

  async getProcurementPerformance(
    dto: GetProcurementPerformanceDto,
  ): Promise<ProcurementPerformanceResponseDto[]> {
    const cacheKey = this.buildCacheKey('performance', dto);
    const cached = await this.repository.getCachedProcurementPerformance(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as ProcurementPerformanceResponseDto[];
    }

    const filters: IProcurementAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      supplierIds: dto.supplierIds,
      productIds: dto.productIds,
      categories: dto.categories,
      countries: dto.countries,
      currencies: dto.currencies,
      purchaseOrderIds: dto.purchaseOrderIds,
      rfqIds: dto.rfqIds,
      quotationIds: dto.quotationIds,
      statuses: dto.statuses,
      performanceCategories: dto.performanceCategories,
      minOrderValue: dto.minOrderValue,
      maxOrderValue: dto.maxOrderValue,
      minOverallScore: dto.minOverallScore,
      buyerIds: dto.buyerIds,
      warehouseIds: dto.warehouseIds,
    };

    const results = await this.repository.getProcurementPerformance(
      filters,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedProcurementPerformance(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: ProcurementAnalyticsEventType.PERFORMANCE_CALCULATED,
      workspaceId: dto.workspaceId,
    });

    results.forEach((result) => {
      if (result.performanceCategory === ProcurementPerformanceCategory.DELAYED) {
        this.eventQueue.publish({
          event: ProcurementAnalyticsEventType.DELAYED_PROCUREMENT_DETECTED,
          workspaceId: result.workspaceId,
          supplierId: result.supplierId,
          productId: result.productId,
          performanceCategory: result.performanceCategory,
          severity: 'high',
        });
      }

      if (result.performanceCategory === ProcurementPerformanceCategory.HIGH_COST) {
        this.eventQueue.publish({
          event: ProcurementAnalyticsEventType.HIGH_COST_PROCUREMENT_DETECTED,
          workspaceId: result.workspaceId,
          supplierId: result.supplierId,
          productId: result.productId,
          performanceCategory: result.performanceCategory,
          severity: 'high',
        });
      }

      if (result.performanceCategory === ProcurementPerformanceCategory.LOW_QUALITY) {
        this.eventQueue.publish({
          event: ProcurementAnalyticsEventType.LOW_QUALITY_DETECTED,
          workspaceId: result.workspaceId,
          supplierId: result.supplierId,
          productId: result.productId,
          performanceCategory: result.performanceCategory,
          severity: 'critical',
        });
      }

      if (result.performanceCategory === ProcurementPerformanceCategory.RISKY) {
        this.eventQueue.publish({
          event: ProcurementAnalyticsEventType.RISKY_PROCUREMENT_DETECTED,
          workspaceId: result.workspaceId,
          supplierId: result.supplierId,
          productId: result.productId,
          performanceCategory: result.performanceCategory,
          severity: 'high',
        });
      }

      if (result.performanceCategory === ProcurementPerformanceCategory.INCOMPLETE) {
        this.eventQueue.publish({
          event: ProcurementAnalyticsEventType.INCOMPLETE_PROCUREMENT_DETECTED,
          workspaceId: result.workspaceId,
          supplierId: result.supplierId,
          productId: result.productId,
          performanceCategory: result.performanceCategory,
          severity: 'medium',
        });
      }

      if (result.costMetrics.savingsAchieved > 0) {
        this.eventQueue.publish({
          event: ProcurementAnalyticsEventType.SAVINGS_IDENTIFIED,
          workspaceId: result.workspaceId,
          supplierId: result.supplierId,
          productId: result.productId,
          metadata: {
            savingsAmount: result.costMetrics.savingsAchieved,
            savingsPercent: result.costMetrics.savingsPercent,
          },
        });
      }

      if (Math.abs(result.costMetrics.productCostVariancePercent) > 10) {
        this.eventQueue.publish({
          event: ProcurementAnalyticsEventType.COST_VARIANCE_DETECTED,
          workspaceId: result.workspaceId,
          supplierId: result.supplierId,
          productId: result.productId,
          metadata: {
            variance: result.costMetrics.productCostVariance,
            variancePercent: result.costMetrics.productCostVariancePercent,
          },
          severity: Math.abs(result.costMetrics.productCostVariancePercent) > 20 ? 'high' : 'medium',
        });
      }
    });

    return results as ProcurementPerformanceResponseDto[];
  }

  async getProcurementTrends(
    dto: GetProcurementTrendsDto,
  ): Promise<ProcurementTrendResponseDto[]> {
    const cacheKey = this.buildCacheKey('trends', dto);
    const cached = await this.repository.getCachedProcurementTrends(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as ProcurementTrendResponseDto[];
    }

    const filters: IProcurementAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      supplierIds: dto.supplierIds,
      productIds: dto.productIds,
      categories: dto.categories,
      countries: dto.countries,
      currencies: dto.currencies,
    };

    const results = await this.repository.getProcurementTrends(
      filters,
      dto.metricType,
      dto.period,
      dto.dimension,
      dto.dimensionValue,
    );

    await this.repository.setCachedProcurementTrends(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: ProcurementAnalyticsEventType.TREND_UPDATED,
      workspaceId: dto.workspaceId,
      metadata: {
        metricType: dto.metricType,
        period: dto.period,
      },
    });

    return results as ProcurementTrendResponseDto[];
  }

  async getProcurementBreakdown(
    dto: GetProcurementBreakdownDto,
  ): Promise<ProcurementBreakdownResponseDto[]> {
    const cacheKey = this.buildCacheKey('breakdown', dto);
    const cached = await this.repository.getCachedProcurementBreakdown(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as ProcurementBreakdownResponseDto[];
    }

    const filters: IProcurementAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      supplierIds: dto.supplierIds,
      productIds: dto.productIds,
      categories: dto.categories,
      countries: dto.countries,
      currencies: dto.currencies,
    };

    const results = await this.repository.getProcurementBreakdown(
      filters,
      dto.dimension,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedProcurementBreakdown(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    return results as ProcurementBreakdownResponseDto[];
  }

  async getProcurementComparison(
    dto: GetProcurementComparisonDto,
  ): Promise<ProcurementComparisonResponseDto | null> {
    const cacheKey = this.buildCacheKey('comparison', dto);
    const cached = await this.repository.getCachedProcurementComparison(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as ProcurementComparisonResponseDto;
    }

    const result = await this.repository.getProcurementComparison(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      dto.comparisonType,
      dto.period,
      dto.comparisonStartDate,
      dto.comparisonEndDate,
      dto.supplierId,
      dto.productId,
      dto.category,
      dto.currency,
    );

    if (result) {
      await this.repository.setCachedProcurementComparison(
        dto.workspaceId,
        cacheKey,
        result,
        this.CACHE_TTL_MINUTES,
      );

      await this.eventQueue.publish({
        event: ProcurementAnalyticsEventType.COMPARISON_GENERATED,
        workspaceId: dto.workspaceId,
        supplierId: dto.supplierId,
        productId: dto.productId,
        metadata: {
          comparisonType: dto.comparisonType,
        },
      });
    }

    return result as ProcurementComparisonResponseDto | null;
  }

  async getProcurementRiskAlerts(
    dto: GetProcurementRiskAlertsDto,
  ): Promise<ProcurementRiskAlertResponseDto[]> {
    const results = await this.repository.getProcurementRiskAlerts(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      dto.alertTypes,
      dto.severities,
      dto.supplierIds,
      dto.productIds,
      dto.limit,
    );

    return results as ProcurementRiskAlertResponseDto[];
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    return this.repository.invalidateProcurementCache(workspaceId, pattern);
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

    if (dto.supplierIds && dto.supplierIds.length > 0) {
      parts.push(`s:${dto.supplierIds.sort().join(',')}`);
    }

    if (dto.productIds && dto.productIds.length > 0) {
      parts.push(`p:${dto.productIds.sort().join(',')}`);
    }

    if (dto.supplierId) {
      parts.push(`s:${dto.supplierId}`);
    }

    if (dto.productId) {
      parts.push(`p:${dto.productId}`);
    }

    return parts.join(':');
  }
}
