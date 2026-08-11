import { Injectable, Logger } from '@nestjs/common';
import { AiAnalyticsRepository } from './ai-analytics.repository';
import { AiAnalyticsEventQueue } from './jobs';
import {
  GetAiPerformanceDto,
  GetAiTrendsDto,
  GetAiBreakdownDto,
  GetAiComparisonDto,
  GetAiIssueAlertsDto,
  AiPerformanceResponseDto,
  AiTrendResponseDto,
  AiBreakdownResponseDto,
  AiComparisonResponseDto,
  AiIssueAlertResponseDto,
} from './dto';
import {
  IAiPerformance,
  IAiTrend,
  IAiBreakdown,
  IAiComparison,
  IAiIssueAlert,
  IAiAnalyticsFilters,
  AiAnalyticsEventType,
  AiPerformanceCategory,
} from './interfaces';

@Injectable()
export class AiAnalyticsService {
  private readonly logger = new Logger(AiAnalyticsService.name);
  private readonly CACHE_TTL_MINUTES = 30;

  constructor(
    private readonly repository: AiAnalyticsRepository,
    private readonly eventQueue: AiAnalyticsEventQueue,
  ) {}

  async getAiPerformance(
    dto: GetAiPerformanceDto,
  ): Promise<AiPerformanceResponseDto[]> {
    const cacheKey = this.buildCacheKey('performance', dto);
    const cached = await this.repository.getCachedAiPerformance(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as AiPerformanceResponseDto[];
    }

    const filters: IAiAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      providerKeys: dto.providerKeys,
      modelKeys: dto.modelKeys,
      capabilities: dto.capabilities,
      useCases: dto.useCases,
      agentIds: dto.agentIds,
      workflowIds: dto.workflowIds,
      features: dto.features,
      userIds: dto.userIds,
      performanceCategories: dto.performanceCategories,
      minCost: dto.minCost,
      maxCost: dto.maxCost,
      minLatency: dto.minLatency,
      maxLatency: dto.maxLatency,
      minSuccessRate: dto.minSuccessRate,
      minOverallScore: dto.minOverallScore,
    };

    const results = await this.repository.getAiPerformance(
      filters,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedAiPerformance(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: AiAnalyticsEventType.PERFORMANCE_CALCULATED,
      workspaceId: dto.workspaceId,
    });

    results.forEach((result) => {
      if (result.performanceCategory === AiPerformanceCategory.EXPENSIVE) {
        this.eventQueue.publish({
          event: AiAnalyticsEventType.EXPENSIVE_OPERATION_DETECTED,
          workspaceId: result.workspaceId,
          providerKey: result.providerKey,
          modelKey: result.modelKey,
          capability: result.capability,
          performanceCategory: result.performanceCategory,
          severity: 'high',
          metadata: {
            averageCost: result.usageCostMetrics.averageCostPerRequest,
            totalCost: result.usageCostMetrics.totalCost,
          },
        });
      }

      if (result.performanceCategory === AiPerformanceCategory.SLOW) {
        this.eventQueue.publish({
          event: AiAnalyticsEventType.SLOW_OPERATION_DETECTED,
          workspaceId: result.workspaceId,
          providerKey: result.providerKey,
          modelKey: result.modelKey,
          capability: result.capability,
          performanceCategory: result.performanceCategory,
          severity: 'medium',
          metadata: {
            averageLatency: result.requestMetrics.averageLatency,
            p95Latency: result.requestMetrics.p95Latency,
          },
        });
      }

      if (result.performanceCategory === AiPerformanceCategory.UNRELIABLE) {
        this.eventQueue.publish({
          event: AiAnalyticsEventType.UNRELIABLE_OPERATION_DETECTED,
          workspaceId: result.workspaceId,
          providerKey: result.providerKey,
          modelKey: result.modelKey,
          capability: result.capability,
          performanceCategory: result.performanceCategory,
          severity: 'high',
          metadata: {
            successRate: result.requestMetrics.successRate,
            failureRate: result.requestMetrics.failureRate,
          },
        });
      }

      if (result.performanceCategory === AiPerformanceCategory.UNDERUSED) {
        this.eventQueue.publish({
          event: AiAnalyticsEventType.UNDERUSED_OPERATION_DETECTED,
          workspaceId: result.workspaceId,
          providerKey: result.providerKey,
          modelKey: result.modelKey,
          capability: result.capability,
          performanceCategory: result.performanceCategory,
          severity: 'low',
          metadata: {
            totalRequests: result.requestMetrics.totalRequests,
          },
        });
      }

      if (result.usageCostMetrics.totalCost > 100) {
        this.eventQueue.publish({
          event: AiAnalyticsEventType.BUDGET_WARNING,
          workspaceId: result.workspaceId,
          providerKey: result.providerKey,
          modelKey: result.modelKey,
          severity: 'medium',
          metadata: {
            totalCost: result.usageCostMetrics.totalCost,
          },
        });
      }

      if (result.requestMetrics.totalRequests > 1000) {
        this.eventQueue.publish({
          event: AiAnalyticsEventType.QUOTA_WARNING,
          workspaceId: result.workspaceId,
          providerKey: result.providerKey,
          modelKey: result.modelKey,
          severity: 'low',
          metadata: {
            totalRequests: result.requestMetrics.totalRequests,
          },
        });
      }
    });

    return results as AiPerformanceResponseDto[];
  }

  async getAiTrends(
    dto: GetAiTrendsDto,
  ): Promise<AiTrendResponseDto[]> {
    const cacheKey = this.buildCacheKey('trends', dto);
    const cached = await this.repository.getCachedAiTrends(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as AiTrendResponseDto[];
    }

    const filters: IAiAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      providerKeys: dto.providerKeys,
      modelKeys: dto.modelKeys,
      capabilities: dto.capabilities,
    };

    const results = await this.repository.getAiTrends(
      filters,
      dto.metricType,
      dto.period,
      dto.dimension,
      dto.dimensionValue,
    );

    await this.repository.setCachedAiTrends(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: AiAnalyticsEventType.TREND_UPDATED,
      workspaceId: dto.workspaceId,
      metadata: {
        metricType: dto.metricType,
        period: dto.period,
      },
    });

    return results as AiTrendResponseDto[];
  }

  async getAiBreakdown(
    dto: GetAiBreakdownDto,
  ): Promise<AiBreakdownResponseDto[]> {
    const cacheKey = this.buildCacheKey('breakdown', dto);
    const cached = await this.repository.getCachedAiBreakdown(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as AiBreakdownResponseDto[];
    }

    const filters: IAiAnalyticsFilters = {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      providerKeys: dto.providerKeys,
      modelKeys: dto.modelKeys,
      capabilities: dto.capabilities,
    };

    const results = await this.repository.getAiBreakdown(
      filters,
      dto.dimension,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.repository.setCachedAiBreakdown(
      dto.workspaceId,
      cacheKey,
      results,
      this.CACHE_TTL_MINUTES,
    );

    return results as AiBreakdownResponseDto[];
  }

  async getAiComparison(
    dto: GetAiComparisonDto,
  ): Promise<AiComparisonResponseDto | null> {
    const cacheKey = this.buildCacheKey('comparison', dto);
    const cached = await this.repository.getCachedAiComparison(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      return cached as AiComparisonResponseDto;
    }

    const result = await this.repository.getAiComparison(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      dto.comparisonType,
      dto.period,
      dto.comparisonStartDate,
      dto.comparisonEndDate,
      dto.providerKey,
      dto.modelKey,
      dto.capability,
    );

    if (result) {
      await this.repository.setCachedAiComparison(
        dto.workspaceId,
        cacheKey,
        result,
        this.CACHE_TTL_MINUTES,
      );

      await this.eventQueue.publish({
        event: AiAnalyticsEventType.COMPARISON_GENERATED,
        workspaceId: dto.workspaceId,
        providerKey: dto.providerKey,
        modelKey: dto.modelKey,
        metadata: {
          comparisonType: dto.comparisonType,
        },
      });
    }

    return result as AiComparisonResponseDto | null;
  }

  async getAiIssueAlerts(
    dto: GetAiIssueAlertsDto,
  ): Promise<AiIssueAlertResponseDto[]> {
    const results = await this.repository.getAiIssueAlerts(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      dto.alertTypes,
      dto.severities,
      dto.providerKeys,
      dto.modelKeys,
      dto.capabilities,
      dto.limit,
    );

    return results as AiIssueAlertResponseDto[];
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    return this.repository.invalidateAiCache(workspaceId, pattern);
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

    if (dto.providerKeys && dto.providerKeys.length > 0) {
      parts.push(`pr:${dto.providerKeys.sort().join(',')}`);
    }

    if (dto.modelKeys && dto.modelKeys.length > 0) {
      parts.push(`m:${dto.modelKeys.sort().join(',')}`);
    }

    if (dto.providerKey) {
      parts.push(`pr:${dto.providerKey}`);
    }

    if (dto.modelKey) {
      parts.push(`m:${dto.modelKey}`);
    }

    return parts.join(':');
  }
}
