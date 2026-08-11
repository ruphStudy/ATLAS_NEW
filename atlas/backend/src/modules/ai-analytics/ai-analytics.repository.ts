import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiPerformance,
  IAiTrend,
  IAiBreakdown,
  IAiComparison,
  IAiIssueAlert,
  IAiAnalyticsFilters,
  IRequestMetrics,
  IUsageCostMetrics,
  ICacheMetrics,
  IQualityMetrics,
  IAgentWorkflowMetrics,
  IDecisionMetrics,
  AiPeriod,
  AiDimension,
  AiMetricType,
  AiComparisonType,
  AiPerformanceCategory,
} from './interfaces';

@Injectable()
export class AiAnalyticsRepository extends BaseRepository {
  protected readonly logger = new Logger(AiAnalyticsRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async getAiPerformance(
    filters: IAiAnalyticsFilters,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Promise<IAiPerformance[]> {
    const emptyRequestMetrics: IRequestMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      fallbackRequests: 0,
      successRate: 0,
      failureRate: 0,
      retryRate: 0,
      fallbackRate: 0,
      averageLatency: 0,
      medianLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      throughput: 0,
    };

    const emptyUsageCostMetrics: IUsageCostMetrics = {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      inputCost: 0,
      outputCost: 0,
      cachedCost: 0,
      averageCostPerRequest: 0,
      averageTokensPerRequest: 0,
    };

    const emptyCacheMetrics: ICacheMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      tokensSaved: 0,
      costSaved: 0,
      averageHitLatency: 0,
      averageMissLatency: 0,
    };

    const emptyQualityMetrics: IQualityMetrics = {
      validationFailures: 0,
      validationFailureRate: 0,
      guardrailBlocks: 0,
      guardrailBlockRate: 0,
      lowConfidenceOutputs: 0,
      lowConfidenceRate: 0,
      humanReviewRequired: 0,
      humanReviewRate: 0,
      averageConfidenceScore: 0,
    };

    const emptyAgentWorkflowMetrics: IAgentWorkflowMetrics = {
      agentExecutions: 0,
      agentCompletions: 0,
      agentFailures: 0,
      agentCompletionRate: 0,
      averageAgentDuration: 0,
      workflowExecutions: 0,
      workflowCompletions: 0,
      workflowFailures: 0,
      workflowCompletionRate: 0,
      averageWorkflowDuration: 0,
    };

    const emptyDecisionMetrics: IDecisionMetrics = {
      decisionsGenerated: 0,
      decisionsAccepted: 0,
      decisionsRejected: 0,
      decisionsOverridden: 0,
      acceptanceRate: 0,
      rejectionRate: 0,
      overrideRate: 0,
      recommendationsGenerated: 0,
      recommendationsFollowed: 0,
      recommendationFollowRate: 0,
    };

    return [
      {
        workspaceId: filters.workspaceId,
        period: filters.period || AiPeriod.DAY,
        startDate: filters.startDate,
        endDate: filters.endDate,
        performanceCategory: AiPerformanceCategory.NORMAL,
        requestMetrics: emptyRequestMetrics,
        usageCostMetrics: emptyUsageCostMetrics,
        cacheMetrics: emptyCacheMetrics,
        qualityMetrics: emptyQualityMetrics,
        agentWorkflowMetrics: emptyAgentWorkflowMetrics,
        decisionMetrics: emptyDecisionMetrics,
        overallScore: 0,
      },
    ];
  }

  async getAiTrends(
    filters: IAiAnalyticsFilters,
    metricType: AiMetricType,
    period: AiPeriod,
    dimension?: AiDimension,
    dimensionValue?: string,
  ): Promise<IAiTrend[]> {
    return [];
  }

  async getAiBreakdown(
    filters: IAiAnalyticsFilters,
    dimension: AiDimension,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Promise<IAiBreakdown[]> {
    return [];
  }

  async getAiComparison(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
    comparisonType: AiComparisonType,
    period?: AiPeriod,
    comparisonStartDate?: Date,
    comparisonEndDate?: Date,
    providerKey?: string,
    modelKey?: string,
    capability?: string,
  ): Promise<IAiComparison | null> {
    const emptyRequestMetrics: IRequestMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      fallbackRequests: 0,
      successRate: 0,
      failureRate: 0,
      retryRate: 0,
      fallbackRate: 0,
      averageLatency: 0,
      medianLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      throughput: 0,
    };

    const emptyUsageCostMetrics: IUsageCostMetrics = {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      inputCost: 0,
      outputCost: 0,
      cachedCost: 0,
      averageCostPerRequest: 0,
      averageTokensPerRequest: 0,
    };

    const emptyCacheMetrics: ICacheMetrics = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      tokensSaved: 0,
      costSaved: 0,
      averageHitLatency: 0,
      averageMissLatency: 0,
    };

    const emptyQualityMetrics: IQualityMetrics = {
      validationFailures: 0,
      validationFailureRate: 0,
      guardrailBlocks: 0,
      guardrailBlockRate: 0,
      lowConfidenceOutputs: 0,
      lowConfidenceRate: 0,
      humanReviewRequired: 0,
      humanReviewRate: 0,
      averageConfidenceScore: 0,
    };

    const emptyAgentWorkflowMetrics: IAgentWorkflowMetrics = {
      agentExecutions: 0,
      agentCompletions: 0,
      agentFailures: 0,
      agentCompletionRate: 0,
      averageAgentDuration: 0,
      workflowExecutions: 0,
      workflowCompletions: 0,
      workflowFailures: 0,
      workflowCompletionRate: 0,
      averageWorkflowDuration: 0,
    };

    const emptyDecisionMetrics: IDecisionMetrics = {
      decisionsGenerated: 0,
      decisionsAccepted: 0,
      decisionsRejected: 0,
      decisionsOverridden: 0,
      acceptanceRate: 0,
      rejectionRate: 0,
      overrideRate: 0,
      recommendationsGenerated: 0,
      recommendationsFollowed: 0,
      recommendationFollowRate: 0,
    };

    return {
      workspaceId,
      comparisonType,
      period: period || AiPeriod.DAY,
      startDate,
      endDate,
      actualMetrics: {
        requestMetrics: emptyRequestMetrics,
        usageCostMetrics: emptyUsageCostMetrics,
        cacheMetrics: emptyCacheMetrics,
        qualityMetrics: emptyQualityMetrics,
        agentWorkflowMetrics: emptyAgentWorkflowMetrics,
        decisionMetrics: emptyDecisionMetrics,
        overallScore: 0,
      },
      comparisonMetrics: {
        requestMetrics: emptyRequestMetrics,
        usageCostMetrics: emptyUsageCostMetrics,
        cacheMetrics: emptyCacheMetrics,
        qualityMetrics: emptyQualityMetrics,
        agentWorkflowMetrics: emptyAgentWorkflowMetrics,
        decisionMetrics: emptyDecisionMetrics,
        overallScore: 0,
      },
      variance: {
        costVariance: 0,
        costVariancePercent: 0,
        latencyVariance: 0,
        latencyVariancePercent: 0,
        successRatePoints: 0,
        cacheHitRatePoints: 0,
        qualityScorePoints: 0,
        overallScorePoints: 0,
      },
      providerKey,
      modelKey,
    };
  }

  async getAiIssueAlerts(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
    alertTypes?: AiPerformanceCategory[],
    severities?: Array<'low' | 'medium' | 'high' | 'critical'>,
    providerKeys?: string[],
    modelKeys?: string[],
    capabilities?: string[],
    limit?: number,
  ): Promise<IAiIssueAlert[]> {
    return [];
  }

  async getCachedAiPerformance(
    workspaceId: string,
    cacheKey: string,
  ): Promise<IAiPerformance[] | null> {
    const cached = await this.getFromCache<IAiPerformance[]>(
      `ai:performance:${workspaceId}:${cacheKey}`,
    );
    return cached;
  }

  async setCachedAiPerformance(
    workspaceId: string,
    cacheKey: string,
    data: IAiPerformance[],
    ttlMinutes: number,
  ): Promise<void> {
    await this.setCache(
      `ai:performance:${workspaceId}:${cacheKey}`,
      data,
      ttlMinutes,
    );
  }

  async getCachedAiTrends(
    workspaceId: string,
    cacheKey: string,
  ): Promise<IAiTrend[] | null> {
    const cached = await this.getFromCache<IAiTrend[]>(
      `ai:trends:${workspaceId}:${cacheKey}`,
    );
    return cached;
  }

  async setCachedAiTrends(
    workspaceId: string,
    cacheKey: string,
    data: IAiTrend[],
    ttlMinutes: number,
  ): Promise<void> {
    await this.setCache(
      `ai:trends:${workspaceId}:${cacheKey}`,
      data,
      ttlMinutes,
    );
  }

  async getCachedAiBreakdown(
    workspaceId: string,
    cacheKey: string,
  ): Promise<IAiBreakdown[] | null> {
    const cached = await this.getFromCache<IAiBreakdown[]>(
      `ai:breakdown:${workspaceId}:${cacheKey}`,
    );
    return cached;
  }

  async setCachedAiBreakdown(
    workspaceId: string,
    cacheKey: string,
    data: IAiBreakdown[],
    ttlMinutes: number,
  ): Promise<void> {
    await this.setCache(
      `ai:breakdown:${workspaceId}:${cacheKey}`,
      data,
      ttlMinutes,
    );
  }

  async getCachedAiComparison(
    workspaceId: string,
    cacheKey: string,
  ): Promise<IAiComparison | null> {
    const cached = await this.getFromCache<IAiComparison>(
      `ai:comparison:${workspaceId}:${cacheKey}`,
    );
    return cached;
  }

  async setCachedAiComparison(
    workspaceId: string,
    cacheKey: string,
    data: IAiComparison,
    ttlMinutes: number,
  ): Promise<void> {
    await this.setCache(
      `ai:comparison:${workspaceId}:${cacheKey}`,
      data,
      ttlMinutes,
    );
  }

  async invalidateAiCache(
    workspaceId: string,
    pattern?: string,
  ): Promise<number> {
    const basePattern = `ai:*:${workspaceId}:*`;
    const fullPattern = pattern
      ? `ai:${pattern}:${workspaceId}:*`
      : basePattern;
    return this.invalidateCachePattern(fullPattern);
  }

  calculateOverallScore(
    requestMetrics: IRequestMetrics,
    usageCostMetrics: IUsageCostMetrics,
    cacheMetrics: ICacheMetrics,
    qualityMetrics: IQualityMetrics,
  ): number {
    const successScore = requestMetrics.successRate * 0.3;
    const cacheScore = cacheMetrics.cacheHitRate * 0.15;
    const qualityScore = (100 - qualityMetrics.validationFailureRate - qualityMetrics.guardrailBlockRate) * 0.25;
    const latencyScore = Math.max(0, 100 - (requestMetrics.averageLatency / 10)) * 0.15;
    const costEfficiencyScore = usageCostMetrics.averageCostPerRequest > 0
      ? Math.max(0, 100 - (usageCostMetrics.averageCostPerRequest * 100))
      : 0;
    const costScore = costEfficiencyScore * 0.15;

    return Math.round(successScore + cacheScore + qualityScore + latencyScore + costScore);
  }

  determinePerformanceCategory(
    overallScore: number,
    requestMetrics: IRequestMetrics,
    usageCostMetrics: IUsageCostMetrics,
    qualityMetrics: IQualityMetrics,
  ): AiPerformanceCategory {
    if (usageCostMetrics.averageCostPerRequest > 1.0) {
      return AiPerformanceCategory.EXPENSIVE;
    }

    if (requestMetrics.averageLatency > 5000) {
      return AiPerformanceCategory.SLOW;
    }

    if (requestMetrics.successRate < 70) {
      return AiPerformanceCategory.UNRELIABLE;
    }

    if (requestMetrics.totalRequests < 10) {
      return AiPerformanceCategory.UNDERUSED;
    }

    if (qualityMetrics.validationFailureRate < 5 && qualityMetrics.guardrailBlockRate < 2) {
      return AiPerformanceCategory.HIGH_QUALITY;
    }

    if (qualityMetrics.validationFailureRate > 20 || qualityMetrics.guardrailBlockRate > 10) {
      return AiPerformanceCategory.LOW_QUALITY;
    }

    if (overallScore >= 80) {
      return AiPerformanceCategory.EFFICIENT;
    }

    return AiPerformanceCategory.NORMAL;
  }
}
