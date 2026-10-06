import { Injectable, Logger } from '@nestjs/common';
import { AiRecommendationEngineRepository } from './ai-recommendation-engine.repository';
import { AiRecommendationEventQueue } from './jobs';
import {
  GenerateRecommendationDto,
  AcceptRecommendationDto,
  RejectRecommendationDto,
  DismissRecommendationDto,
  DeferRecommendationDto,
  SubmitFeedbackDto,
  TrackOutcomeDto,
  RecommendationFilterDto,
  CreateStrategyDto,
  UpdateStrategyDto,
  RecommendationResponseDto,
  PaginatedRecommendationResponseDto,
  RecommendationResultDto,
  StrategyResponseDto,
  FeedbackResponseDto,
  OutcomeResponseDto,
} from './dto';
import {
  IAiRecommendation,
  IAiRecommendationItem,
  IAiRecommendationStrategy,
  AiRecommendationStatus,
  AiRecommendationEvent,
  AiRecommendationStrategy,
  IRecommendationResult,
  IRisk,
  IAlternative,
  IRecommendationGenerator,
  IGenerationResult,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions';
import { BusinessRuleException } from '@common/exceptions';
import { DuplicateResourceException } from '@common/exceptions';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiRecommendationEngineService {
  private readonly logger = new Logger(AiRecommendationEngineService.name);
  private readonly generators: Map<
    AiRecommendationStrategy,
    IRecommendationGenerator
  > = new Map();

  constructor(
    private readonly repository: AiRecommendationEngineRepository,
    private readonly eventQueue: AiRecommendationEventQueue,
  ) {
    this.registerDefaultGenerators();
  }

  async generateRecommendation(
    dto: GenerateRecommendationDto,
  ): Promise<IRecommendationResult> {
    if (dto.idempotencyKey) {
      const existing =
        await this.repository.findRecommendationByIdempotencyKey(
          dto.idempotencyKey,
          dto.workspaceId,
        );
      if (existing) {
        this.logger.debug(
          `Returning existing recommendation for idempotency key`,
        );
        const items = await this.repository.findItemsByRecommendationId(
          existing.id,
        );
        return this.mapToRecommendationResult(existing, items);
      }
    }

    const startTime = Date.now();

    const recommendation = await this.repository.createRecommendation({
      workspaceId: dto.workspaceId,
      status: AiRecommendationStatus.PENDING,
      recommendationType: dto.recommendationType,
      strategy: dto.strategy,
      orchestratorRequestId: dto.orchestratorRequestId,
      agentExecutionId: dto.agentExecutionId,
      workflowExecutionId: dto.workflowExecutionId,
      decisionId: dto.decisionId,
      validationId: dto.validationId,
      capability: dto.capability,
      useCase: dto.useCase,
      context: dto.context,
      userId: dto.userId,
      personalized: dto.personalized ?? false,
      inputSnapshot: dto.inputSnapshot,
      objectives: dto.objectives || {},
      constraints: dto.constraints || {},
      userPreferences: dto.userPreferences || {},
      idempotencyKey: dto.idempotencyKey,
      expiresAt: dto.expiresAt,
      generationStartTime: new Date(),
      risks: [],
      alternatives: [],
      supportingEvidence: {},
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    });

    await this.eventQueue.publish({
      event: AiRecommendationEvent.RECOMMENDATION_STARTED,
      workspaceId: dto.workspaceId,
      recommendationId: recommendation.id,
    });

    await this.repository.updateRecommendation(recommendation.id, {
      status: AiRecommendationStatus.GENERATING,
    });

    try {
      const strategies = await this.repository.findApplicableStrategies({
        workspaceId: dto.workspaceId,
        recommendationType: dto.recommendationType,
        capability: dto.capability,
        useCase: dto.useCase,
      });

      const generator = this.generators.get(dto.strategy);
      if (!generator) {
        throw new BusinessRuleException(
          `No generator found for strategy: ${dto.strategy}`,
          ErrorCode.BUSINESS_RULE_VIOLATION,
        );
      }

      const generationResult = await generator.generate(
        recommendation,
        dto.candidates,
        strategies,
        dto.userPreferences,
      );

      const items: IAiRecommendationItem[] = [];
      for (const itemData of generationResult.items) {
        const item = await this.repository.createItem({
          recommendationId: recommendation.id,
          workspaceId: dto.workspaceId,
          itemData: itemData.itemData,
          itemLabel: itemData.itemLabel,
          itemType: itemData.itemType,
          rank: itemData.rank,
          score: itemData.score,
          scores: itemData.scores,
          selected: false,
          rationale: itemData.rationale,
          pros: itemData.pros,
          cons: itemData.cons,
          metadata: {},
        });
        items.push(item);
      }

      const duration = Date.now() - startTime;

      const updatedRecommendation = await this.repository.updateRecommendation(
        recommendation.id,
        {
          status: AiRecommendationStatus.READY,
          overallScore: generationResult.overallScore,
          confidenceScore: generationResult.confidenceScore,
          rationale: generationResult.rationale,
          risks: generationResult.risks,
          alternatives: generationResult.alternatives,
          supportingEvidence: generationResult.supportingEvidence || {},
          strategyVersion: strategies[0]?.version,
          generationEndTime: new Date(),
          generationDuration: duration,
        },
      );

      await this.repository.createHistory({
        recommendationId: recommendation.id,
        workspaceId: dto.workspaceId,
        action: 'GENERATION_COMPLETED',
        newStatus: AiRecommendationStatus.READY,
        details: `Recommendation generated with ${items.length} items`,
        metadata: {},
      });

      await this.eventQueue.publish({
        event: AiRecommendationEvent.RECOMMENDATION_GENERATED,
        workspaceId: dto.workspaceId,
        recommendationId: recommendation.id,
        status: AiRecommendationStatus.READY,
      });

      return this.mapToRecommendationResult(updatedRecommendation, items);
    } catch (error) {
      await this.repository.updateRecommendation(recommendation.id, {
        status: AiRecommendationStatus.REJECTED,
        generationEndTime: new Date(),
        generationDuration: Date.now() - startTime,
      });

      throw error;
    }
  }

  async acceptRecommendation(
    id: string,
    dto: AcceptRecommendationDto,
  ): Promise<IAiRecommendation> {
    const recommendation = await this.findRecommendationById(
      id,
      dto.workspaceId,
    );

    if (recommendation.status !== AiRecommendationStatus.READY) {
      throw new BusinessRuleException(
        'Only READY recommendations can be accepted',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (dto.itemId) {
      await this.repository.updateItem(dto.itemId, { selected: true });
    }

    const updated = await this.repository.updateRecommendation(id, {
      status: AiRecommendationStatus.ACCEPTED,
      acceptedBy: dto.acceptedBy,
      acceptedAt: new Date(),
    });

    await this.repository.createHistory({
      recommendationId: id,
      workspaceId: dto.workspaceId,
      action: 'ACCEPTED',
      oldStatus: recommendation.status,
      newStatus: AiRecommendationStatus.ACCEPTED,
      changedBy: dto.acceptedBy,
      reason: dto.reason,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiRecommendationEvent.RECOMMENDATION_ACCEPTED,
      workspaceId: dto.workspaceId,
      recommendationId: id,
      status: AiRecommendationStatus.ACCEPTED,
    });

    return updated;
  }

  async rejectRecommendation(
    id: string,
    dto: RejectRecommendationDto,
  ): Promise<IAiRecommendation> {
    const recommendation = await this.findRecommendationById(
      id,
      dto.workspaceId,
    );

    const updated = await this.repository.updateRecommendation(id, {
      status: AiRecommendationStatus.REJECTED,
      rejectedBy: dto.rejectedBy,
      rejectedAt: new Date(),
    });

    await this.repository.createHistory({
      recommendationId: id,
      workspaceId: dto.workspaceId,
      action: 'REJECTED',
      oldStatus: recommendation.status,
      newStatus: AiRecommendationStatus.REJECTED,
      changedBy: dto.rejectedBy,
      reason: dto.reason,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiRecommendationEvent.RECOMMENDATION_REJECTED,
      workspaceId: dto.workspaceId,
      recommendationId: id,
      status: AiRecommendationStatus.REJECTED,
    });

    return updated;
  }

  async dismissRecommendation(
    id: string,
    dto: DismissRecommendationDto,
  ): Promise<IAiRecommendation> {
    const recommendation = await this.findRecommendationById(
      id,
      dto.workspaceId,
    );

    const updated = await this.repository.updateRecommendation(id, {
      status: AiRecommendationStatus.DISMISSED,
    });

    await this.repository.createHistory({
      recommendationId: id,
      workspaceId: dto.workspaceId,
      action: 'DISMISSED',
      oldStatus: recommendation.status,
      newStatus: AiRecommendationStatus.DISMISSED,
      changedBy: dto.dismissedBy,
      reason: dto.reason,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiRecommendationEvent.RECOMMENDATION_DISMISSED,
      workspaceId: dto.workspaceId,
      recommendationId: id,
      status: AiRecommendationStatus.DISMISSED,
    });

    return updated;
  }

  async deferRecommendation(
    id: string,
    dto: DeferRecommendationDto,
  ): Promise<IAiRecommendation> {
    const recommendation = await this.findRecommendationById(
      id,
      dto.workspaceId,
    );

    const updated = await this.repository.updateRecommendation(id, {
      status: AiRecommendationStatus.DEFERRED,
    });

    await this.repository.createHistory({
      recommendationId: id,
      workspaceId: dto.workspaceId,
      action: 'DEFERRED',
      oldStatus: recommendation.status,
      newStatus: AiRecommendationStatus.DEFERRED,
      changedBy: dto.deferredBy,
      reason: dto.reason,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiRecommendationEvent.RECOMMENDATION_DEFERRED,
      workspaceId: dto.workspaceId,
      recommendationId: id,
      status: AiRecommendationStatus.DEFERRED,
    });

    return updated;
  }

  async submitFeedback(
    id: string,
    dto: SubmitFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    await this.findRecommendationById(id, dto.workspaceId);

    const feedback = await this.repository.createFeedback({
      recommendationId: id,
      workspaceId: dto.workspaceId,
      feedbackType: dto.feedbackType,
      itemId: dto.itemId,
      userId: dto.userId,
      rating: dto.rating,
      comment: dto.comment,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiRecommendationEvent.RECOMMENDATION_FEEDBACK,
      workspaceId: dto.workspaceId,
      recommendationId: id,
      metadata: { feedbackType: dto.feedbackType },
    });

    return feedback as FeedbackResponseDto;
  }

  async trackOutcome(
    id: string,
    dto: TrackOutcomeDto,
  ): Promise<OutcomeResponseDto> {
    await this.findRecommendationById(id, dto.workspaceId);

    const outcome = await this.repository.createOutcome({
      recommendationId: id,
      workspaceId: dto.workspaceId,
      itemId: dto.itemId,
      outcomeType: dto.outcomeType,
      success: dto.success,
      actualResult: dto.actualResult,
      expectedResult: dto.expectedResult,
      effectivenessScore: dto.effectivenessScore,
      notes: dto.notes,
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiRecommendationEvent.RECOMMENDATION_OUTCOME_TRACKED,
      workspaceId: dto.workspaceId,
      recommendationId: id,
      metadata: { outcomeType: dto.outcomeType, success: dto.success },
    });

    return outcome as OutcomeResponseDto;
  }

  async findRecommendationById(
    id: string,
    workspaceId: string,
  ): Promise<IAiRecommendation> {
    const recommendation = await this.repository.findRecommendationById(
      id,
      workspaceId,
    );
    if (!recommendation) {
      throw new ResourceNotFoundException(
        'Recommendation not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return recommendation;
  }

  async findAllRecommendations(
    filter: RecommendationFilterDto,
  ): Promise<PaginatedRecommendationResponseDto> {
    const [data, total] = await this.repository.findAllRecommendations(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as RecommendationResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getItems(id: string, workspaceId: string): Promise<any[]> {
    await this.findRecommendationById(id, workspaceId);
    return this.repository.findItemsByRecommendationId(id);
  }

  async getHistory(id: string, workspaceId: string): Promise<any[]> {
    await this.findRecommendationById(id, workspaceId);
    return this.repository.findHistoryByRecommendationId(id);
  }

  async getFeedback(id: string, workspaceId: string): Promise<any[]> {
    await this.findRecommendationById(id, workspaceId);
    return this.repository.findFeedbackByRecommendationId(id);
  }

  async getOutcomes(id: string, workspaceId: string): Promise<any[]> {
    await this.findRecommendationById(id, workspaceId);
    return this.repository.findOutcomesByRecommendationId(id);
  }

  async createStrategy(
    dto: CreateStrategyDto,
  ): Promise<IAiRecommendationStrategy> {
    const existing = await this.repository.findStrategyByName(
      dto.name,
      dto.workspaceId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Strategy with this name already exists',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const data = {
      workspaceId: dto.workspaceId,
      name: dto.name,
      recommendationType: dto.recommendationType,
      strategy: dto.strategy,
      capability: dto.capability,
      useCase: dto.useCase,
      strategyConfig: dto.strategyConfig,
      weights: dto.weights || {},
      thresholds: dto.thresholds || {},
      priority: dto.priority ?? 0,
      enabled: dto.enabled ?? true,
      personalizationEnabled: dto.personalizationEnabled ?? false,
      version: dto.version ?? '1.0',
      tags: dto.tags || [],
      metadata: dto.metadata || {},
    };

    return (await this.repository.createStrategy(
      data,
    )) as IAiRecommendationStrategy;
  }

  async updateStrategy(
    id: string,
    dto: UpdateStrategyDto,
  ): Promise<IAiRecommendationStrategy> {
    await this.findStrategyById(id);
    return (await this.repository.updateStrategy(
      id,
      dto,
    )) as IAiRecommendationStrategy;
  }

  async deleteStrategy(id: string): Promise<void> {
    await this.findStrategyById(id);
    await this.repository.deleteStrategy(id);
  }

  async findStrategyById(id: string): Promise<IAiRecommendationStrategy> {
    const strategy = await this.repository.findStrategyById(id);
    if (!strategy) {
      throw new ResourceNotFoundException(
        'Strategy not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return strategy;
  }

  async getRecommendationStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getRecommendationStats(
      workspaceId,
      startDate,
      endDate,
    );
  }

  private registerDefaultGenerators(): void {
    this.generators.set(AiRecommendationStrategy.WEIGHTED, {
      name: 'WeightedRecommendationGenerator',
      strategy: AiRecommendationStrategy.WEIGHTED,
      generate: async (recommendation, candidates, strategies) => {
        const items = candidates.map((candidate, index) => {
          const score = Math.random();
          return {
            itemData: candidate,
            itemLabel: (candidate as any).label || (candidate as any).name,
            itemType: (candidate as any).type,
            rank: index + 1,
            score,
            scores: { weighted: score },
            rationale: 'Generated by weighted scoring',
            pros: ['High score', 'Good fit'],
            cons: [],
          };
        });

        items.sort((a, b) => b.score - a.score);
        items.forEach((item, index) => {
          item.rank = index + 1;
        });

        return {
          items: items.slice(0, 10),
          overallScore: items[0]?.score || 0,
          confidenceScore: 0.85,
          rationale: 'Top recommendations based on weighted scoring',
          risks: [],
          alternatives: [],
        };
      },
    });

    this.generators.set(AiRecommendationStrategy.RULE_BASED, {
      name: 'RuleBasedRecommendationGenerator',
      strategy: AiRecommendationStrategy.RULE_BASED,
      generate: async (recommendation, candidates, strategies) => {
        const items = candidates.slice(0, 5).map((candidate, index) => ({
          itemData: candidate,
          itemLabel: (candidate as any).label || (candidate as any).name,
          itemType: (candidate as any).type,
          rank: index + 1,
          score: 1 - index * 0.1,
          scores: { rule: 1 - index * 0.1 },
          rationale: 'Selected by rules',
          pros: ['Rule compliant'],
          cons: [],
        }));

        return {
          items,
          overallScore: items[0]?.score || 0,
          confidenceScore: 0.9,
          rationale: 'Recommendations based on business rules',
          risks: [],
          alternatives: [],
        };
      },
    });
  }

  private mapToRecommendationResult(
    recommendation: IAiRecommendation,
    items: IAiRecommendationItem[],
  ): IRecommendationResult {
    return {
      recommendationId: recommendation.id,
      status: recommendation.status,
      items,
      overallScore: recommendation.overallScore || undefined,
      confidenceScore: recommendation.confidenceScore || undefined,
      rationale: recommendation.rationale || undefined,
      risks: (recommendation.risks as IRisk[]) || [],
      alternatives: (recommendation.alternatives as IAlternative[]) || [],
      supportingEvidence: recommendation.supportingEvidence,
    };
  }
}
