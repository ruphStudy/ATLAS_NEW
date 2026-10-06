import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiRecommendation,
  IAiRecommendationItem,
  IAiRecommendationStrategy,
  IAiRecommendationFeedback,
  IAiRecommendationOutcome,
  IAiRecommendationHistory,
} from './interfaces';
import { RecommendationFilterDto } from './dto';

@Injectable()
export class AiRecommendationEngineRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createRecommendation(
    data: Partial<IAiRecommendation>,
  ): Promise<IAiRecommendation> {
    return this.prisma.aiRecommendation.create({
      data: data as any,
    }) as Promise<IAiRecommendation>;
  }

  async updateRecommendation(
    id: string,
    data: Partial<IAiRecommendation>,
  ): Promise<IAiRecommendation> {
    return this.prisma.aiRecommendation.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiRecommendation>;
  }

  async findRecommendationById(
    id: string,
    workspaceId: string,
  ): Promise<IAiRecommendation | null> {
    return this.prisma.aiRecommendation.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiRecommendation | null>;
  }

  async findRecommendationByIdempotencyKey(
    idempotencyKey: string,
    workspaceId: string,
  ): Promise<IAiRecommendation | null> {
    return this.prisma.aiRecommendation.findFirst({
      where: { idempotencyKey, workspaceId },
    }) as Promise<IAiRecommendation | null>;
  }

  async findAllRecommendations(
    filter: RecommendationFilterDto,
  ): Promise<[IAiRecommendation[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId };

    if (filter.status) where.status = filter.status;
    if (filter.recommendationType)
      where.recommendationType = filter.recommendationType;
    if (filter.userId) where.userId = filter.userId;
    if (filter.capability) where.capability = filter.capability;
    if (filter.orchestratorRequestId) {
      where.orchestratorRequestId = filter.orchestratorRequestId;
    }
    if (filter.agentExecutionId) {
      where.agentExecutionId = filter.agentExecutionId;
    }
    if (filter.workflowExecutionId) {
      where.workflowExecutionId = filter.workflowExecutionId;
    }
    if (filter.decisionId) {
      where.decisionId = filter.decisionId;
    }

    const [data, total] = await Promise.all([
      this.prisma.aiRecommendation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiRecommendation.count({ where }),
    ]);

    return [data as IAiRecommendation[], total];
  }

  async createItem(
    data: Partial<IAiRecommendationItem>,
  ): Promise<IAiRecommendationItem> {
    return this.prisma.aiRecommendationItem.create({
      data: data as any,
    }) as Promise<IAiRecommendationItem>;
  }

  async updateItem(
    id: string,
    data: Partial<IAiRecommendationItem>,
  ): Promise<IAiRecommendationItem> {
    return this.prisma.aiRecommendationItem.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiRecommendationItem>;
  }

  async findItemsByRecommendationId(
    recommendationId: string,
  ): Promise<IAiRecommendationItem[]> {
    return this.prisma.aiRecommendationItem.findMany({
      where: { recommendationId },
      orderBy: { rank: 'asc' },
    }) as Promise<IAiRecommendationItem[]>;
  }

  async findItemById(id: string): Promise<IAiRecommendationItem | null> {
    return this.prisma.aiRecommendationItem.findUnique({
      where: { id },
    }) as Promise<IAiRecommendationItem | null>;
  }

  async createHistory(
    data: Partial<IAiRecommendationHistory>,
  ): Promise<IAiRecommendationHistory> {
    return this.prisma.aiRecommendationHistory.create({
      data: data as any,
    }) as Promise<IAiRecommendationHistory>;
  }

  async findHistoryByRecommendationId(
    recommendationId: string,
  ): Promise<IAiRecommendationHistory[]> {
    return this.prisma.aiRecommendationHistory.findMany({
      where: { recommendationId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiRecommendationHistory[]>;
  }

  async createFeedback(
    data: Partial<IAiRecommendationFeedback>,
  ): Promise<IAiRecommendationFeedback> {
    return this.prisma.aiRecommendationFeedback.create({
      data: data as any,
    }) as Promise<IAiRecommendationFeedback>;
  }

  async findFeedbackByRecommendationId(
    recommendationId: string,
  ): Promise<IAiRecommendationFeedback[]> {
    return this.prisma.aiRecommendationFeedback.findMany({
      where: { recommendationId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiRecommendationFeedback[]>;
  }

  async createOutcome(
    data: Partial<IAiRecommendationOutcome>,
  ): Promise<IAiRecommendationOutcome> {
    return this.prisma.aiRecommendationOutcome.create({
      data: data as any,
    }) as Promise<IAiRecommendationOutcome>;
  }

  async findOutcomesByRecommendationId(
    recommendationId: string,
  ): Promise<IAiRecommendationOutcome[]> {
    return this.prisma.aiRecommendationOutcome.findMany({
      where: { recommendationId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiRecommendationOutcome[]>;
  }

  async createStrategy(
    data: Partial<IAiRecommendationStrategy>,
  ): Promise<IAiRecommendationStrategy> {
    return this.prisma.aiRecommendationStrategy.create({
      data: data as any,
    }) as Promise<IAiRecommendationStrategy>;
  }

  async updateStrategy(
    id: string,
    data: Partial<IAiRecommendationStrategy>,
  ): Promise<IAiRecommendationStrategy> {
    return this.prisma.aiRecommendationStrategy.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiRecommendationStrategy>;
  }

  async findStrategyById(
    id: string,
  ): Promise<IAiRecommendationStrategy | null> {
    return this.prisma.aiRecommendationStrategy.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IAiRecommendationStrategy | null>;
  }

  async findStrategyByName(
    name: string,
    workspaceId?: string,
  ): Promise<IAiRecommendationStrategy | null> {
    return this.prisma.aiRecommendationStrategy.findFirst({
      where: {
        name,
        workspaceId: workspaceId || null,
        deletedAt: null,
      },
    }) as Promise<IAiRecommendationStrategy | null>;
  }

  async findApplicableStrategies(params: {
    workspaceId?: string;
    recommendationType: string;
    capability?: string;
    useCase?: string;
  }): Promise<IAiRecommendationStrategy[]> {
    const where: any = {
      enabled: true,
      deletedAt: null,
      recommendationType: params.recommendationType,
      OR: [{ workspaceId: null }, { workspaceId: params.workspaceId }],
    };

    if (params.capability) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [{ capability: params.capability }, { capability: null }],
        },
      ];
    }

    if (params.useCase) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [{ useCase: params.useCase }, { useCase: null }],
        },
      ];
    }

    return this.prisma.aiRecommendationStrategy.findMany({
      where,
      orderBy: { priority: 'desc' },
    }) as Promise<IAiRecommendationStrategy[]>;
  }

  async deleteStrategy(id: string): Promise<void> {
    await this.prisma.aiRecommendationStrategy.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getRecommendationStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = { workspaceId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalRecommendations, acceptedRecommendations, stats] =
      await Promise.all([
        this.prisma.aiRecommendation.count({ where }),
        this.prisma.aiRecommendation.count({
          where: { ...where, status: 'ACCEPTED' },
        }),
        this.prisma.aiRecommendation.aggregate({
          where,
          _avg: {
            overallScore: true,
            confidenceScore: true,
            generationDuration: true,
          },
        }),
      ]);

    return {
      totalRecommendations,
      acceptedRecommendations,
      acceptanceRate:
        totalRecommendations > 0
          ? acceptedRecommendations / totalRecommendations
          : 0,
      avgOverallScore: stats._avg.overallScore || 0,
      avgConfidenceScore: stats._avg.confidenceScore || 0,
      avgGenerationDuration: stats._avg.generationDuration || 0,
    };
  }
}
