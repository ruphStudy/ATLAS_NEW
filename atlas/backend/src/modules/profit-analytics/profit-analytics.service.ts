import { Injectable, Logger } from '@nestjs/common';
import { ProfitAnalyticsRepository } from './profit-analytics.repository';
import { ProfitAnalyticsEventQueue } from './jobs';
import {
  GetProfitSummaryDto,
  GetProfitTrendsDto,
  GetProfitBreakdownDto,
  GetProfitComparisonDto,
  GetProfitabilityAnalysisDto,
  GetProfitLeakageDto,
  CreateProfitTargetDto,
  UpdateProfitTargetDto,
  ProfitSummaryResponseDto,
  ProfitTrendResponseDto,
  ProfitBreakdownResponseDto,
  ProfitComparisonResponseDto,
  ProfitabilityAnalysisResponseDto,
  ProfitLeakageResponseDto,
  ProfitTargetResponseDto,
  ProfitTargetPerformanceResponseDto,
} from './dto';
import {
  IProfitSummary,
  IProfitTrend,
  IProfitBreakdown,
  IProfitComparison,
  IProfitabilityAnalysis,
  IProfitLeakage,
  IProfitTarget,
  IProfitTargetPerformance,
  ProfitAnalyticsEventType,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions';
import { BusinessRuleException } from '@common/exceptions';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class ProfitAnalyticsService {
  private readonly logger = new Logger(ProfitAnalyticsService.name);
  private readonly CACHE_TTL_MINUTES = 30;

  constructor(
    private readonly repository: ProfitAnalyticsRepository,
    private readonly eventQueue: ProfitAnalyticsEventQueue,
  ) {}

  async getProfitSummary(dto: GetProfitSummaryDto): Promise<ProfitSummaryResponseDto> {
    const cacheKey = this.buildCacheKey('summary', dto);
    const cached = await this.repository.getCachedProfitSummary(dto.workspaceId, cacheKey);

    if (cached) {
      return cached as ProfitSummaryResponseDto;
    }

    const summary = await this.repository.getProfitSummary(dto);

    await this.repository.setCachedProfitSummary(dto.workspaceId, cacheKey, summary, this.CACHE_TTL_MINUTES);

    await this.eventQueue.publish({
      event: ProfitAnalyticsEventType.PROFIT_CALCULATED,
      workspaceId: dto.workspaceId,
      metadata: { period: dto.period },
    });

    return summary as ProfitSummaryResponseDto;
  }

  async getProfitTrends(dto: GetProfitTrendsDto): Promise<ProfitTrendResponseDto[]> {
    const trends = await this.repository.getProfitTrends(dto, dto.metricType, dto.period);

    await this.eventQueue.publish({
      event: ProfitAnalyticsEventType.MARGIN_UPDATED,
      workspaceId: dto.workspaceId,
      metadata: { metricType: dto.metricType, period: dto.period },
    });

    return trends as ProfitTrendResponseDto[];
  }

  async getProfitBreakdown(dto: GetProfitBreakdownDto): Promise<ProfitBreakdownResponseDto[]> {
    const breakdown = await this.repository.getProfitBreakdown(
      dto,
      dto.dimension,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.eventQueue.publish({
      event: ProfitAnalyticsEventType.BREAKDOWN_CALCULATED,
      workspaceId: dto.workspaceId,
      metadata: { dimension: dto.dimension },
    });

    return breakdown as ProfitBreakdownResponseDto[];
  }

  async getProfitComparison(dto: GetProfitComparisonDto): Promise<ProfitComparisonResponseDto> {
    const comparison = await this.repository.getProfitComparison(
      dto.workspaceId,
      dto.currentStartDate,
      dto.currentEndDate,
      dto.comparisonType,
      dto.comparisonStartDate,
      dto.comparisonEndDate,
      {
        marketplaceIds: dto.marketplaceIds,
        accountIds: dto.accountIds,
        currency: dto.currency,
      },
    );

    await this.eventQueue.publish({
      event: ProfitAnalyticsEventType.COMPARISON_GENERATED,
      workspaceId: dto.workspaceId,
      metadata: { comparisonType: dto.comparisonType },
    });

    return comparison as ProfitComparisonResponseDto;
  }

  async getProfitabilityAnalysis(dto: GetProfitabilityAnalysisDto): Promise<ProfitabilityAnalysisResponseDto[]> {
    const analysis = await this.repository.getProfitabilityAnalysis(
      dto,
      dto.profitabilityCategory,
      dto.limit,
    );

    await this.eventQueue.publish({
      event: ProfitAnalyticsEventType.PROFITABILITY_CHANGED,
      workspaceId: dto.workspaceId,
      metadata: { category: dto.profitabilityCategory },
    });

    return analysis as ProfitabilityAnalysisResponseDto[];
  }

  async getProfitLeakage(dto: GetProfitLeakageDto): Promise<ProfitLeakageResponseDto[]> {
    const leakages = await this.repository.getProfitLeakage(
      dto,
      dto.leakageType,
      dto.dimension,
      dto.minImpactAmount,
      dto.limit,
    );

    if (leakages.length > 0) {
      await this.eventQueue.publish({
        event: ProfitAnalyticsEventType.LEAKAGE_DETECTED,
        workspaceId: dto.workspaceId,
        metadata: { leakageCount: leakages.length },
      });
    }

    return leakages as ProfitLeakageResponseDto[];
  }

  async createTarget(dto: CreateProfitTargetDto): Promise<ProfitTargetResponseDto> {
    const existing = await this.repository.findTargetByKey(dto.targetKey, dto.workspaceId);
    if (existing) {
      throw new BusinessRuleException(
        'Target with this key already exists',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const target = await this.repository.createTarget(dto);

    await this.eventQueue.publish({
      event: ProfitAnalyticsEventType.TARGET_ACHIEVED,
      workspaceId: dto.workspaceId,
      metadata: { targetId: target.id, targetKey: dto.targetKey },
    });

    return target as ProfitTargetResponseDto;
  }

  async updateTarget(
    id: string,
    workspaceId: string,
    dto: UpdateProfitTargetDto,
  ): Promise<ProfitTargetResponseDto> {
    const target = await this.findTargetById(id, workspaceId);
    const updated = await this.repository.updateTarget(id, workspaceId, dto);

    await this.repository.invalidateCache(workspaceId, 'target:*');

    return updated as ProfitTargetResponseDto;
  }

  async findTargetById(id: string, workspaceId: string): Promise<ProfitTargetResponseDto> {
    const target = await this.repository.findTargetById(id, workspaceId);
    if (!target) {
      throw new ResourceNotFoundException(
        'Profit target not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return target as ProfitTargetResponseDto;
  }

  async findAllTargets(workspaceId: string, isActive?: boolean): Promise<ProfitTargetResponseDto[]> {
    const targets = await this.repository.findAllTargets(workspaceId, isActive);
    return targets as ProfitTargetResponseDto[];
  }

  async deleteTarget(id: string, workspaceId: string): Promise<void> {
    await this.findTargetById(id, workspaceId);
    await this.repository.deleteTarget(id);
    await this.repository.invalidateCache(workspaceId, 'target:*');
  }

  async getTargetPerformance(targetId: string, workspaceId: string): Promise<ProfitTargetPerformanceResponseDto> {
    const performance = await this.repository.getTargetPerformance(targetId, workspaceId);
    if (!performance) {
      throw new ResourceNotFoundException(
        'Target performance not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (performance.achievementPercent >= 100) {
      await this.eventQueue.publish({
        event: ProfitAnalyticsEventType.TARGET_ACHIEVED,
        workspaceId,
        metadata: { targetId },
      });
    } else if (performance.achievementPercent < 80) {
      await this.eventQueue.publish({
        event: ProfitAnalyticsEventType.TARGET_MISSED,
        workspaceId,
        metadata: { targetId, achievementPercent: performance.achievementPercent },
      });
    }

    return performance as ProfitTargetPerformanceResponseDto;
  }

  async getAllTargetPerformances(
    workspaceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProfitTargetPerformanceResponseDto[]> {
    const performances = await this.repository.getAllTargetPerformances(workspaceId, startDate, endDate);
    return performances as ProfitTargetPerformanceResponseDto[];
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
    if (dto.currency) {
      parts.push(dto.currency);
    }

    return parts.filter(Boolean).join(':');
  }
}
