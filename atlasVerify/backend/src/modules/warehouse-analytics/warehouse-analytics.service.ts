import { Injectable, Logger } from '@nestjs/common';
import { WarehouseAnalyticsRepository } from './warehouse-analytics.repository';
import { WarehouseAnalyticsEventQueue } from './jobs';
import {
  GetWarehousePerformanceDto,
  GetWarehouseTrendsDto,
  GetWarehouseBreakdownDto,
  GetWarehouseComparisonDto,
  GetWarehouseIssueAlertsDto,
  WarehousePerformanceResponseDto,
  WarehouseTrendResponseDto,
  WarehouseBreakdownResponseDto,
  WarehouseComparisonResponseDto,
  WarehouseIssueAlertResponseDto,
} from './dto';
import {
  IWarehousePerformance,
  IWarehouseTrend,
  IWarehouseBreakdown,
  IWarehouseComparison,
  IWarehouseIssueAlert,
  IWarehouseAnalyticsFilters,
  WarehouseAnalyticsEventType,
  WarehousePerformanceCategory,
} from './interfaces';

@Injectable()
export class WarehouseAnalyticsService {
  private readonly logger = new Logger(WarehouseAnalyticsService.name);
  private readonly CACHE_TTL_MINUTES = 15;

  constructor(
    private readonly repository: WarehouseAnalyticsRepository,
    private readonly eventQueue: WarehouseAnalyticsEventQueue,
  ) {}

  async getWarehousePerformance(
    dto: GetWarehousePerformanceDto,
  ): Promise<WarehousePerformanceResponseDto[]> {
    const cacheKey = this.buildCacheKey('performance', dto);
    const cached = await this.repository.getCachedWarehousePerformance(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as WarehousePerformanceResponseDto[];
    }

    const filters: IWarehouseAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      warehouseIds: dto.warehouseIds,
      zoneIds: dto.zoneIds,
      locationIds: dto.locationIds,
      binIds: dto.binIds,
      shiftIds: dto.shiftIds,
      userIds: dto.userIds,
      productIds: dto.productIds,
      categories: dto.categories,
      operationTypes: dto.operationTypes,
      performanceCategories: dto.performanceCategories,
      minThroughput: dto.minThroughput,
      maxThroughput: dto.maxThroughput,
      minUtilization: dto.minUtilization,
      maxUtilization: dto.maxUtilization,
      minOverallScore: dto.minOverallScore,
    };

    const results = await this.repository.getWarehousePerformance(
      filters,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedWarehousePerformance(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: WarehouseAnalyticsEventType.PERFORMANCE_CALCULATED,
      workspaceId: dto.workspaceId,
    });

    results.forEach((result) => {
      if (result.performanceCategory === WarehousePerformanceCategory.BOTTLENECK) {
        this.eventQueue.publish({
          event: WarehouseAnalyticsEventType.BOTTLENECK_DETECTED,
          workspaceId: result.workspaceId,
          warehouseId: result.warehouseId,
          zoneId: result.zoneId,
          performanceCategory: result.performanceCategory,
          severity: 'high',
          metadata: {
            backlogPercent: result.slaPerformanceMetrics.backlogPercent,
            slaComplianceRate: result.slaPerformanceMetrics.slaComplianceRate,
          },
        });
      }

      if (result.performanceCategory === WarehousePerformanceCategory.IDLE) {
        this.eventQueue.publish({
          event: WarehouseAnalyticsEventType.IDLE_CAPACITY_DETECTED,
          workspaceId: result.workspaceId,
          warehouseId: result.warehouseId,
          zoneId: result.zoneId,
          performanceCategory: result.performanceCategory,
          severity: 'medium',
          metadata: {
            capacityUtilization: result.capacityMetrics.capacityUtilization,
          },
        });
      }

      if (result.performanceCategory === WarehousePerformanceCategory.CONGESTED) {
        this.eventQueue.publish({
          event: WarehouseAnalyticsEventType.CONGESTION_DETECTED,
          workspaceId: result.workspaceId,
          warehouseId: result.warehouseId,
          zoneId: result.zoneId,
          performanceCategory: result.performanceCategory,
          severity: 'high',
          metadata: {
            capacityUtilization: result.capacityMetrics.capacityUtilization,
            occupancyPercent: result.capacityMetrics.occupancyPercent,
          },
        });
      }

      if (result.performanceCategory === WarehousePerformanceCategory.DELAYED) {
        this.eventQueue.publish({
          event: WarehouseAnalyticsEventType.DELAYED_TASK_DETECTED,
          workspaceId: result.workspaceId,
          warehouseId: result.warehouseId,
          zoneId: result.zoneId,
          performanceCategory: result.performanceCategory,
          severity: 'high',
          metadata: {
            delayedTasks: result.slaPerformanceMetrics.delayedTasks,
            slaComplianceRate: result.slaPerformanceMetrics.slaComplianceRate,
          },
        });
      }

      if (result.performanceCategory === WarehousePerformanceCategory.UNDERPERFORMING) {
        this.eventQueue.publish({
          event: WarehouseAnalyticsEventType.UNDERPERFORMING_AREA_DETECTED,
          workspaceId: result.workspaceId,
          warehouseId: result.warehouseId,
          zoneId: result.zoneId,
          performanceCategory: result.performanceCategory,
          severity: 'medium',
          metadata: {
            overallScore: result.overallScore,
          },
        });
      }

      if (result.slaPerformanceMetrics.breachedTasks > 0) {
        this.eventQueue.publish({
          event: WarehouseAnalyticsEventType.SLA_BREACH_DETECTED,
          workspaceId: result.workspaceId,
          warehouseId: result.warehouseId,
          zoneId: result.zoneId,
          severity: 'critical',
          metadata: {
            breachedTasks: result.slaPerformanceMetrics.breachedTasks,
            totalTasks: result.slaPerformanceMetrics.totalTasks,
          },
        });
      }

      if (result.slaPerformanceMetrics.backlogCount > 0) {
        this.eventQueue.publish({
          event: WarehouseAnalyticsEventType.BACKLOG_DETECTED,
          workspaceId: result.workspaceId,
          warehouseId: result.warehouseId,
          zoneId: result.zoneId,
          severity: result.slaPerformanceMetrics.backlogPercent > 30 ? 'high' : 'medium',
          metadata: {
            backlogCount: result.slaPerformanceMetrics.backlogCount,
            backlogPercent: result.slaPerformanceMetrics.backlogPercent,
          },
        });
      }
    });

    return results as WarehousePerformanceResponseDto[];
  }

  async getWarehouseTrends(
    dto: GetWarehouseTrendsDto,
  ): Promise<WarehouseTrendResponseDto[]> {
    const cacheKey = this.buildCacheKey('trends', dto);
    const cached = await this.repository.getCachedWarehouseTrends(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as WarehouseTrendResponseDto[];
    }

    const filters: IWarehouseAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      warehouseIds: dto.warehouseIds,
      zoneIds: dto.zoneIds,
    };

    const results = await this.repository.getWarehouseTrends(
      filters,
      dto.metricType,
      dto.period,
      dto.dimension,
      dto.dimensionValue,
    );

    await this.repository.setCachedWarehouseTrends(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: WarehouseAnalyticsEventType.TREND_UPDATED,
      workspaceId: dto.workspaceId,
      metadata: {
        metricType: dto.metricType,
        period: dto.period,
      },
    });

    return results as WarehouseTrendResponseDto[];
  }

  async getWarehouseBreakdown(
    dto: GetWarehouseBreakdownDto,
  ): Promise<WarehouseBreakdownResponseDto[]> {
    const cacheKey = this.buildCacheKey('breakdown', dto);
    const cached = await this.repository.getCachedWarehouseBreakdown(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as WarehouseBreakdownResponseDto[];
    }

    const filters: IWarehouseAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      warehouseIds: dto.warehouseIds,
      zoneIds: dto.zoneIds,
    };

    const results = await this.repository.getWarehouseBreakdown(
      filters,
      dto.dimension,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedWarehouseBreakdown(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    return results as WarehouseBreakdownResponseDto[];
  }

  async getWarehouseComparison(
    dto: GetWarehouseComparisonDto,
  ): Promise<WarehouseComparisonResponseDto | null> {
    const cacheKey = this.buildCacheKey('comparison', dto);
    const cached = await this.repository.getCachedWarehouseComparison(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as WarehouseComparisonResponseDto;
    }

    const result = await this.repository.getWarehouseComparison(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      dto.comparisonType,
      dto.period,
      dto.comparisonStartDate,
      dto.comparisonEndDate,
      dto.warehouseId,
      dto.zoneId,
    );

    if (result) {
      await this.repository.setCachedWarehouseComparison(
        dto.workspaceId,
        cacheKey,
        result,
        this.CACHE_TTL_MINUTES,
      );

      await this.eventQueue.publish({
        event: WarehouseAnalyticsEventType.COMPARISON_GENERATED,
        workspaceId: dto.workspaceId,
        warehouseId: dto.warehouseId,
        zoneId: dto.zoneId,
        metadata: {
          comparisonType: dto.comparisonType,
        },
      });
    }

    return result as WarehouseComparisonResponseDto | null;
  }

  async getWarehouseIssueAlerts(
    dto: GetWarehouseIssueAlertsDto,
  ): Promise<WarehouseIssueAlertResponseDto[]> {
    const results = await this.repository.getWarehouseIssueAlerts(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      dto.alertTypes,
      dto.severities,
      dto.warehouseIds,
      dto.zoneIds,
      dto.operationTypes,
      dto.limit,
    );

    return results as WarehouseIssueAlertResponseDto[];
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    return this.repository.invalidateWarehouseCache(workspaceId, pattern);
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

    if (dto.warehouseIds && dto.warehouseIds.length > 0) {
      parts.push(`w:${dto.warehouseIds.sort().join(',')}`);
    }

    if (dto.zoneIds && dto.zoneIds.length > 0) {
      parts.push(`z:${dto.zoneIds.sort().join(',')}`);
    }

    if (dto.warehouseId) {
      parts.push(`w:${dto.warehouseId}`);
    }

    if (dto.zoneId) {
      parts.push(`z:${dto.zoneId}`);
    }

    return parts.join(':');
  }
}
