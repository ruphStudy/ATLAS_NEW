import { Injectable, Logger } from '@nestjs/common';
import { BusinessInsightsRepository } from './business-insights.repository';
import { BusinessInsightsEventQueue } from './jobs';
import {
  GenerateInsightDto,
  BulkGenerateInsightsDto,
  ReviewInsightDto,
  AcceptInsightDto,
  DismissInsightDto,
  ResolveInsightDto,
  RecordOutcomeDto,
  ChangePriorityDto,
  InsightFilterDto,
  HistoryFilterDto,
  InsightResponseDto,
  InsightHistoryResponseDto,
  InsightOutcomeResponseDto,
  PaginatedInsightResponseDto,
  PaginatedHistoryResponseDto,
} from './dto';
import {
  IInsight,
  IInsightRanking,
  InsightStatus,
  InsightPriority,
  InsightStrategy,
  InsightEventType,
  InsightType,
  InsightDomain,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions';
import { BusinessRuleException } from '@common/exceptions';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class BusinessInsightsService {
  private readonly logger = new Logger(BusinessInsightsService.name);
  private readonly CACHE_TTL_MINUTES = 60;
  private readonly SIMILARITY_THRESHOLD = 0.75;

  constructor(
    private readonly repository: BusinessInsightsRepository,
    private readonly eventQueue: BusinessInsightsEventQueue,
  ) {}

  async generateInsight(dto: GenerateInsightDto): Promise<InsightResponseDto> {
    const cacheKey = this.buildCacheKey(dto);
    const cached = await this.repository.getCachedInsight(dto.workspaceId, cacheKey);

    if (cached && cached.validUntil && new Date() < cached.validUntil) {
      return cached as InsightResponseDto;
    }

    const strategy = dto.strategy ?? InsightStrategy.HYBRID;
    const insight = await this.executeInsightGeneration(dto, strategy);

    const similarInsights = await this.repository.findSimilarInsights(
      dto.workspaceId,
      dto.domain,
      dto.type,
      (insight.affectedEntities ?? []).map((e) => e.entityId),
    );

    if (similarInsights.length > 0) {
      const duplicateScore = this.calculateSimilarityScore(insight, similarInsights[0]);
      if (duplicateScore > this.SIMILARITY_THRESHOLD) {
        await this.eventQueue.publish({
          event: InsightEventType.DUPLICATE_DETECTED,
          workspaceId: dto.workspaceId,
          insightId: similarInsights[0].id,
          domain: dto.domain,
          type: dto.type,
          timestamp: new Date(),
          metadata: { newInsightKey: insight.insightKey, score: duplicateScore },
        });

        return similarInsights[0] as InsightResponseDto;
      }
    }

    const created = await this.repository.createInsight(insight);

    await this.repository.setCachedInsight(dto.workspaceId, cacheKey, created, this.CACHE_TTL_MINUTES);

    await this.eventQueue.publish({
      event: InsightEventType.INSIGHT_GENERATED,
      workspaceId: created.workspaceId,
      insightId: created.id,
      insightKey: created.insightKey,
      domain: created.domain,
      type: created.type,
      priority: created.priority,
      timestamp: new Date(),
    });

    return created as InsightResponseDto;
  }

  async bulkGenerate(dto: BulkGenerateInsightsDto): Promise<InsightResponseDto[]> {
    const insights: InsightResponseDto[] = [];

    for (const request of dto.requests) {
      const insight = await this.generateInsight({
        ...request,
        userId: dto.userId,
      });
      insights.push(insight);
    }

    return this.rankInsights(insights);
  }

  async reviewInsight(dto: ReviewInsightDto): Promise<InsightResponseDto> {
    const existing = await this.repository.findInsightById(dto.insightId, dto.workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(`Insight ${dto.insightId} not found`, ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (existing.status !== InsightStatus.NEW) {
      throw new BusinessRuleException(
        'Only new insights can be reviewed',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const reviewed = await this.repository.reviewInsight(
      dto.insightId,
      dto.workspaceId,
      dto.reviewedBy,
      dto.feedback,
    );

    await this.repository.createHistory({
      insightId: reviewed.id,
      workspaceId: reviewed.workspaceId,
      version: reviewed.version,
      previousStatus: existing.status,
      newStatus: reviewed.status,
      changedBy: dto.reviewedBy,
    });

    await this.eventQueue.publish({
      event: InsightEventType.INSIGHT_REVIEWED,
      workspaceId: reviewed.workspaceId,
      insightId: reviewed.id,
      status: reviewed.status,
      timestamp: new Date(),
    });

    return reviewed as InsightResponseDto;
  }

  async acceptInsight(dto: AcceptInsightDto): Promise<InsightResponseDto> {
    const existing = await this.repository.findInsightById(dto.insightId, dto.workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(`Insight ${dto.insightId} not found`, ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (existing.status !== InsightStatus.NEW && existing.status !== InsightStatus.REVIEWED) {
      throw new BusinessRuleException(
        'Only new or reviewed insights can be accepted',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const accepted = await this.repository.acceptInsight(
      dto.insightId,
      dto.workspaceId,
      dto.acceptedBy,
      dto.ownerId,
      dto.dueDate,
    );

    await this.repository.createHistory({
      insightId: accepted.id,
      workspaceId: accepted.workspaceId,
      version: accepted.version,
      previousStatus: existing.status,
      newStatus: accepted.status,
      changedBy: dto.acceptedBy,
    });

    await this.eventQueue.publish({
      event: InsightEventType.INSIGHT_ACCEPTED,
      workspaceId: accepted.workspaceId,
      insightId: accepted.id,
      status: accepted.status,
      timestamp: new Date(),
    });

    return accepted as InsightResponseDto;
  }

  async dismissInsight(dto: DismissInsightDto): Promise<InsightResponseDto> {
    const existing = await this.repository.findInsightById(dto.insightId, dto.workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(`Insight ${dto.insightId} not found`, ErrorCode.RESOURCE_NOT_FOUND);
    }

    const dismissed = await this.repository.dismissInsight(
      dto.insightId,
      dto.workspaceId,
      dto.dismissedBy,
      dto.reason,
    );

    await this.repository.createHistory({
      insightId: dismissed.id,
      workspaceId: dismissed.workspaceId,
      version: dismissed.version,
      previousStatus: existing.status,
      newStatus: dismissed.status,
      changeReason: dto.reason,
      changedBy: dto.dismissedBy,
    });

    await this.eventQueue.publish({
      event: InsightEventType.INSIGHT_DISMISSED,
      workspaceId: dismissed.workspaceId,
      insightId: dismissed.id,
      status: dismissed.status,
      timestamp: new Date(),
    });

    return dismissed as InsightResponseDto;
  }

  async resolveInsight(dto: ResolveInsightDto): Promise<InsightResponseDto> {
    const existing = await this.repository.findInsightById(dto.insightId, dto.workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(`Insight ${dto.insightId} not found`, ErrorCode.RESOURCE_NOT_FOUND);
    }

    if (existing.status !== InsightStatus.ACCEPTED) {
      throw new BusinessRuleException(
        'Only accepted insights can be resolved',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const resolved = await this.repository.resolveInsight(
      dto.insightId,
      dto.workspaceId,
      dto.resolvedBy,
      dto.actionReferences,
    );

    await this.repository.createHistory({
      insightId: resolved.id,
      workspaceId: resolved.workspaceId,
      version: resolved.version,
      previousStatus: existing.status,
      newStatus: resolved.status,
      changedBy: dto.resolvedBy,
    });

    await this.eventQueue.publish({
      event: InsightEventType.INSIGHT_RESOLVED,
      workspaceId: resolved.workspaceId,
      insightId: resolved.id,
      status: resolved.status,
      timestamp: new Date(),
    });

    return resolved as InsightResponseDto;
  }

  async recordOutcome(dto: RecordOutcomeDto): Promise<InsightOutcomeResponseDto> {
    const existing = await this.repository.findInsightById(dto.insightId, dto.workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(`Insight ${dto.insightId} not found`, ErrorCode.RESOURCE_NOT_FOUND);
    }

    const outcome = await this.repository.createOutcome({
      insightId: dto.insightId,
      workspaceId: dto.workspaceId,
      actualImpact: dto.actualImpact,
      actionsTaken: dto.actionsTaken,
      resultSummary: dto.resultSummary,
      successRate: dto.successRate,
      recordedBy: dto.recordedBy,
    });

    await this.eventQueue.publish({
      event: InsightEventType.OUTCOME_RECORDED,
      workspaceId: outcome.workspaceId,
      insightId: outcome.insightId,
      timestamp: new Date(),
      metadata: { successRate: outcome.successRate },
    });

    return outcome as InsightOutcomeResponseDto;
  }

  async changePriority(dto: ChangePriorityDto): Promise<InsightResponseDto> {
    const existing = await this.repository.findInsightById(dto.insightId, dto.workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(`Insight ${dto.insightId} not found`, ErrorCode.RESOURCE_NOT_FOUND);
    }

    const updated = await this.repository.changePriority(dto.insightId, dto.workspaceId, dto.newPriority);

    await this.repository.createHistory({
      insightId: updated.id,
      workspaceId: updated.workspaceId,
      version: updated.version,
      previousStatus: existing.status,
      newStatus: updated.status,
      previousPriority: existing.priority,
      newPriority: dto.newPriority,
      changeReason: dto.reason,
      changedBy: dto.changedBy,
    });

    await this.eventQueue.publish({
      event: InsightEventType.PRIORITY_CHANGED,
      workspaceId: updated.workspaceId,
      insightId: updated.id,
      priority: dto.newPriority,
      timestamp: new Date(),
    });

    return updated as InsightResponseDto;
  }

  async getInsightById(id: string, workspaceId: string): Promise<InsightResponseDto> {
    const insight = await this.repository.findInsightById(id, workspaceId);
    if (!insight) {
      throw new ResourceNotFoundException(`Insight ${id} not found`, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return insight as InsightResponseDto;
  }

  async getAllInsights(filter: InsightFilterDto): Promise<PaginatedInsightResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const { insights, total } = await this.repository.findAllInsights({
      ...filter,
      page,
      limit,
    });

    const ranked = this.rankInsights(insights as InsightResponseDto[]);

    return {
      data: ranked,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getHistory(filter: HistoryFilterDto): Promise<PaginatedHistoryResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const { history, total } = await this.repository.findHistory({
      ...filter,
      page,
      limit,
    });

    return {
      data: history as InsightHistoryResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOutcomes(insightId: string, workspaceId: string): Promise<InsightOutcomeResponseDto[]> {
    const outcomes = await this.repository.findOutcomesByInsight(insightId, workspaceId);
    return outcomes as InsightOutcomeResponseDto[];
  }

  async deleteInsight(id: string, workspaceId: string): Promise<void> {
    const existing = await this.repository.findInsightById(id, workspaceId);
    if (!existing) {
      throw new ResourceNotFoundException(`Insight ${id} not found`, ErrorCode.RESOURCE_NOT_FOUND);
    }

    await this.repository.deleteInsight(id, workspaceId);
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    return this.repository.invalidateCache(workspaceId, pattern);
  }

  async expireStaleInsights(workspaceId: string): Promise<number> {
    return this.repository.expireStaleInsights(workspaceId);
  }

  private async executeInsightGeneration(dto: GenerateInsightDto, strategy: InsightStrategy): Promise<Partial<IInsight>> {
    const insightKey = `${dto.domain}-${dto.type}-${Date.now()}`;
    const title = this.generateTitle(dto.domain, dto.type);
    const summary = this.generateSummary(dto.domain, dto.type, strategy);
    const evidence = this.generateEvidence(dto.sourceIds ?? []);
    const impact = this.calculateImpact(dto.domain, dto.type);
    const confidence = this.calculateConfidence(strategy, evidence.length);
    const priority = this.determinePriority(impact, confidence);
    const recommendedActions = this.generateRecommendedActions(dto.domain, dto.type);
    const affectedEntities = this.identifyAffectedEntities(dto.sourceIds ?? [], dto.domain);
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return {
      workspaceId: dto.workspaceId,
      insightKey,
      domain: dto.domain,
      type: dto.type,
      priority,
      strategy,
      title,
      summary,
      evidence,
      impact,
      confidence,
      recommendedActions,
      affectedEntities,
      sourceSnapshot: dto.context,
      validUntil,
    };
  }

  private generateTitle(domain: InsightDomain, type: InsightType): string {
    return `${type.toUpperCase()}: ${domain} analysis`;
  }

  private generateSummary(domain: InsightDomain, type: InsightType, strategy: InsightStrategy): string {
    return `${strategy} detected ${type} in ${domain} domain`;
  }

  private generateEvidence(sourceIds: string[]): any[] {
    return sourceIds.map((id) => ({
      sourceType: 'analytics',
      sourceId: id,
      metric: 'performance',
      value: Math.random() * 100,
      timestamp: new Date(),
    }));
  }

  private calculateImpact(domain: InsightDomain, type: InsightType): any {
    return {
      revenue: Math.random() * 10000,
      cost: Math.random() * 5000,
      margin: Math.random() * 0.3,
    };
  }

  private calculateConfidence(strategy: InsightStrategy, evidenceCount: number): number {
    const baseConfidence = strategy === InsightStrategy.AI_ASSISTED ? 0.85 : 0.75;
    const evidenceBonus = Math.min(evidenceCount * 0.05, 0.15);
    return Math.min(baseConfidence + evidenceBonus, 0.99);
  }

  private determinePriority(impact: any, confidence: number): InsightPriority {
    const impactScore = (impact.revenue || 0) - (impact.cost || 0);
    const weightedScore = impactScore * confidence;

    if (weightedScore > 5000) return InsightPriority.CRITICAL;
    if (weightedScore > 2000) return InsightPriority.HIGH;
    if (weightedScore > 500) return InsightPriority.MEDIUM;
    return InsightPriority.LOW;
  }

  private generateRecommendedActions(domain: InsightDomain, type: InsightType): any[] {
    return [
      {
        title: `Address ${type} in ${domain}`,
        description: `Recommended action for ${domain} ${type}`,
        targetModule: domain,
        actionType: 'review',
        parameters: {},
      },
    ];
  }

  private identifyAffectedEntities(sourceIds: string[], domain: InsightDomain): any[] {
    return sourceIds.map((id) => ({
      entityType: domain,
      entityId: id,
      entityName: `${domain}-${id}`,
    }));
  }

  private rankInsights(insights: InsightResponseDto[]): InsightResponseDto[] {
    const rankings: IInsightRanking[] = insights.map((insight) => ({
      insightId: insight.id,
      score: this.calculateRankingScore(insight),
      factors: {
        priorityWeight: this.getPriorityWeight(insight.priority),
        confidenceWeight: insight.confidence,
        impactWeight: this.getImpactWeight(insight.impact),
        freshnessWeight: this.getFreshnessWeight(insight.createdAt),
      },
    }));

    rankings.sort((a, b) => b.score - a.score);

    return rankings.map((ranking) => insights.find((i) => i.id === ranking.insightId)!);
  }

  private calculateRankingScore(insight: InsightResponseDto): number {
    const priorityWeight = this.getPriorityWeight(insight.priority) * 0.3;
    const confidenceWeight = insight.confidence * 0.25;
    const impactWeight = this.getImpactWeight(insight.impact) * 0.3;
    const freshnessWeight = this.getFreshnessWeight(insight.createdAt) * 0.15;

    return priorityWeight + confidenceWeight + impactWeight + freshnessWeight;
  }

  private getPriorityWeight(priority: InsightPriority): number {
    const weights = {
      [InsightPriority.CRITICAL]: 1.0,
      [InsightPriority.HIGH]: 0.75,
      [InsightPriority.MEDIUM]: 0.5,
      [InsightPriority.LOW]: 0.25,
    };
    return weights[priority] || 0.5;
  }

  private getImpactWeight(impact?: any): number {
    if (!impact) return 0.5;
    const netImpact = (impact.revenue || 0) - (impact.cost || 0);
    return Math.min(Math.max(netImpact / 10000, 0), 1);
  }

  private getFreshnessWeight(createdAt: Date): number {
    const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    return Math.max(1 - ageHours / 168, 0);
  }

  private calculateSimilarityScore(insight1: Partial<IInsight>, insight2: IInsight): number {
    let score = 0;

    if (insight1.domain === insight2.domain) score += 0.3;
    if (insight1.type === insight2.type) score += 0.3;

    const entity1Ids = new Set(insight1.affectedEntities?.map((e) => e.entityId) || []);
    const entity2Ids = new Set(insight2.affectedEntities.map((e) => e.entityId));
    const intersection = new Set([...entity1Ids].filter((x) => entity2Ids.has(x)));
    const union = new Set([...entity1Ids, ...entity2Ids]);

    if (union.size > 0) {
      score += (intersection.size / union.size) * 0.4;
    }

    return score;
  }

  private buildCacheKey(dto: GenerateInsightDto): string {
    return `insight:${dto.domain}:${dto.type}:${(dto.sourceIds || []).sort().join(',')}`;
  }
}
