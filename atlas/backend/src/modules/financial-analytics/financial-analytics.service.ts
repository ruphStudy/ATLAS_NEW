import { Injectable, Logger } from '@nestjs/common';
import { FinancialAnalyticsRepository } from './financial-analytics.repository';
import { FinancialAnalyticsEventQueue } from './jobs';
import {
  GetFinancialPerformanceDto,
  GetFinancialTrendsDto,
  GetFinancialBreakdownDto,
  GetFinancialComparisonDto,
  GetFinancialAlertsDto,
  FinancialPerformanceResponseDto,
  FinancialTrendResponseDto,
  FinancialBreakdownResponseDto,
  FinancialComparisonResponseDto,
  FinancialAlertResponseDto,
} from './dto';
import {
  IFinancialPerformance,
  IFinancialTrend,
  IFinancialBreakdown,
  IFinancialComparison,
  IFinancialAlert,
  IFinancialAnalyticsFilters,
  FinancialAnalyticsEventType,
  FinancialHealthStatus,
} from './interfaces';

@Injectable()
export class FinancialAnalyticsService {
  private readonly logger = new Logger(FinancialAnalyticsService.name);
  private readonly CACHE_TTL_MINUTES = 30;

  constructor(
    private readonly repository: FinancialAnalyticsRepository,
    private readonly eventQueue: FinancialAnalyticsEventQueue,
  ) {}

  async getFinancialPerformance(
    dto: GetFinancialPerformanceDto,
  ): Promise<FinancialPerformanceResponseDto[]> {
    const cacheKey = this.buildCacheKey('performance', dto);
    const cached = await this.repository.getCachedFinancialPerformance(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as FinancialPerformanceResponseDto[];
    }

    const filters: IFinancialAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      currency: dto.currency,
      productIds: dto.productIds,
      productSkus: dto.productSkus,
      categoryIds: dto.categoryIds,
      supplierIds: dto.supplierIds,
      marketplaceIds: dto.marketplaceIds,
      accountIds: dto.accountIds,
      warehouseIds: dto.warehouseIds,
      countries: dto.countries,
      regions: dto.regions,
      minRevenue: dto.minRevenue,
      maxRevenue: dto.maxRevenue,
      minMargin: dto.minMargin,
      maxMargin: dto.maxMargin,
      healthStatuses: dto.healthStatuses,
      minOverallScore: dto.minOverallScore,
    };

    const results = await this.repository.getFinancialPerformance(
      filters,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedFinancialPerformance(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: FinancialAnalyticsEventType.PERFORMANCE_CALCULATED,
      workspaceId: dto.workspaceId,
    });

    results.forEach((result) => {
      if (result.profitMetrics.profitVariancePercent < -20) {
        this.eventQueue.publish({
          event: FinancialAnalyticsEventType.PROFIT_LEAKAGE_DETECTED,
          workspaceId: result.workspaceId,
          productId: result.productId,
          marketplaceId: result.marketplaceId,
          severity: 'high',
          amount: Math.abs(result.profitMetrics.profitVariance),
          currency: result.currency,
          metadata: {
            expectedProfit: result.profitMetrics.expectedProfit,
            actualProfit: result.profitMetrics.actualProfit,
          },
        });
      }

      if (
        result.costBreakdown.marketplaceFees >
        result.revenueMetrics.totalRevenue * 0.3
      ) {
        this.eventQueue.publish({
          event: FinancialAnalyticsEventType.FEE_ANOMALY_DETECTED,
          workspaceId: result.workspaceId,
          marketplaceId: result.marketplaceId,
          severity: 'medium',
          amount: result.costBreakdown.marketplaceFees,
          currency: result.currency,
          metadata: {
            feePercentage:
              (result.costBreakdown.marketplaceFees /
                result.revenueMetrics.totalRevenue) *
              100,
          },
        });
      }

      if (result.settlementMetrics.averageSettlementDays > 30) {
        this.eventQueue.publish({
          event: FinancialAnalyticsEventType.SETTLEMENT_DELAY_DETECTED,
          workspaceId: result.workspaceId,
          marketplaceId: result.marketplaceId,
          severity: 'high',
          metadata: {
            averageSettlementDays: result.settlementMetrics.averageSettlementDays,
            pendingAmount: result.cashFlowMetrics.pendingSettlements,
          },
        });
      }

      if (result.healthStatus === FinancialHealthStatus.LOSS_MAKING) {
        this.eventQueue.publish({
          event: FinancialAnalyticsEventType.LOSS_MAKING_PRODUCT_DETECTED,
          workspaceId: result.workspaceId,
          productId: result.productId,
          productSku: result.productSku,
          severity: 'critical',
          amount: Math.abs(result.profitMetrics.netProfit),
          currency: result.currency,
          metadata: {
            netMargin: result.profitMetrics.netMargin,
          },
        });
      }

      if (result.cashFlowMetrics.netCashFlow < 0) {
        this.eventQueue.publish({
          event: FinancialAnalyticsEventType.CASH_FLOW_RISK_DETECTED,
          workspaceId: result.workspaceId,
          marketplaceId: result.marketplaceId,
          severity: 'critical',
          amount: Math.abs(result.cashFlowMetrics.netCashFlow),
          currency: result.currency,
          metadata: {
            cashInflow: result.cashFlowMetrics.cashInflow,
            cashOutflow: result.cashFlowMetrics.cashOutflow,
          },
        });
      }
    });

    return results as FinancialPerformanceResponseDto[];
  }

  async getFinancialTrends(
    dto: GetFinancialTrendsDto,
  ): Promise<FinancialTrendResponseDto[]> {
    const cacheKey = this.buildCacheKey('trends', dto);
    const cached = await this.repository.getCachedFinancialTrends(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as FinancialTrendResponseDto[];
    }

    const filters: IFinancialAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      currency: dto.currency,
      marketplaceIds: dto.marketplaceIds,
    };

    const results = await this.repository.getFinancialTrends(
      filters,
      dto.metricType,
      dto.period,
      dto.dimension,
      dto.dimensionValue,
    );

    await this.repository.setCachedFinancialTrends(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: FinancialAnalyticsEventType.TREND_UPDATED,
      workspaceId: dto.workspaceId,
      metadata: {
        metricType: dto.metricType,
        period: dto.period,
      },
    });

    return results as FinancialTrendResponseDto[];
  }

  async getFinancialBreakdown(
    dto: GetFinancialBreakdownDto,
  ): Promise<FinancialBreakdownResponseDto[]> {
    const cacheKey = this.buildCacheKey('breakdown', dto);
    const cached = await this.repository.getCachedFinancialBreakdown(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as FinancialBreakdownResponseDto[];
    }

    const filters: IFinancialAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      currency: dto.currency,
      marketplaceIds: dto.marketplaceIds,
    };

    const results = await this.repository.getFinancialBreakdown(
      filters,
      dto.dimension,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedFinancialBreakdown(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    return results as FinancialBreakdownResponseDto[];
  }

  async getFinancialComparison(
    dto: GetFinancialComparisonDto,
  ): Promise<FinancialComparisonResponseDto | null> {
    const cacheKey = this.buildCacheKey('comparison', dto);
    const cached = await this.repository.getCachedFinancialComparison(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as FinancialComparisonResponseDto;
    }

    const result = await this.repository.getFinancialComparison(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      dto.comparisonType,
      dto.currency,
      dto.period,
      dto.comparisonStartDate,
      dto.comparisonEndDate,
      dto.marketplaceId,
      dto.productId,
    );

    if (result) {
      await this.repository.setCachedFinancialComparison(
        dto.workspaceId,
        cacheKey,
        result,
        this.CACHE_TTL_MINUTES,
      );

      await this.eventQueue.publish({
        event: FinancialAnalyticsEventType.COMPARISON_GENERATED,
        workspaceId: dto.workspaceId,
        marketplaceId: dto.marketplaceId,
        productId: dto.productId,
        metadata: {
          comparisonType: dto.comparisonType,
        },
      });
    }

    return result as FinancialComparisonResponseDto | null;
  }

  async getFinancialAlerts(
    dto: GetFinancialAlertsDto,
  ): Promise<FinancialAlertResponseDto[]> {
    const results = await this.repository.getFinancialAlerts(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      dto.alertTypes,
      dto.severities,
      dto.marketplaceIds,
      dto.productIds,
      dto.limit,
    );

    return results as FinancialAlertResponseDto[];
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    return this.repository.invalidateFinancialCache(workspaceId, pattern);
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

    if (dto.currency) {
      parts.push(dto.currency);
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

    if (dto.productId) {
      parts.push(`p:${dto.productId}`);
    }

    return parts.join(':');
  }
}
