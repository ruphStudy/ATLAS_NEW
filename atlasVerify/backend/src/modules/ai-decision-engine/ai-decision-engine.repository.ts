import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiDecision,
  IAiDecisionCandidate,
  IAiDecisionRule,
  IAiDecisionHistory,
  IAiDecisionOverride,
} from './interfaces';
import { DecisionFilterDto } from './dto';

@Injectable()
export class AiDecisionEngineRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createDecision(data: Partial<IAiDecision>): Promise<IAiDecision> {
    return this.prisma.aiDecision.create({
      data: data as any,
    }) as Promise<IAiDecision>;
  }

  async updateDecision(
    id: string,
    data: Partial<IAiDecision>,
  ): Promise<IAiDecision> {
    return this.prisma.aiDecision.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiDecision>;
  }

  async findDecisionById(
    id: string,
    workspaceId: string,
  ): Promise<IAiDecision | null> {
    return this.prisma.aiDecision.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiDecision | null>;
  }

  async findDecisionByIdempotencyKey(
    idempotencyKey: string,
    workspaceId: string,
  ): Promise<IAiDecision | null> {
    return this.prisma.aiDecision.findFirst({
      where: { idempotencyKey, workspaceId },
    }) as Promise<IAiDecision | null>;
  }

  async findAllDecisions(
    filter: DecisionFilterDto,
  ): Promise<[IAiDecision[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId };

    if (filter.status) where.status = filter.status;
    if (filter.decisionType) where.decisionType = filter.decisionType;
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

    const [data, total] = await Promise.all([
      this.prisma.aiDecision.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiDecision.count({ where }),
    ]);

    return [data as IAiDecision[], total];
  }

  async createCandidate(
    data: Partial<IAiDecisionCandidate>,
  ): Promise<IAiDecisionCandidate> {
    return this.prisma.aiDecisionCandidate.create({
      data: data as any,
    }) as Promise<IAiDecisionCandidate>;
  }

  async updateCandidate(
    id: string,
    data: Partial<IAiDecisionCandidate>,
  ): Promise<IAiDecisionCandidate> {
    return this.prisma.aiDecisionCandidate.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiDecisionCandidate>;
  }

  async findCandidatesByDecisionId(
    decisionId: string,
  ): Promise<IAiDecisionCandidate[]> {
    return this.prisma.aiDecisionCandidate.findMany({
      where: { decisionId },
      orderBy: { rank: 'asc' },
    }) as Promise<IAiDecisionCandidate[]>;
  }

  async findCandidateById(id: string): Promise<IAiDecisionCandidate | null> {
    return this.prisma.aiDecisionCandidate.findUnique({
      where: { id },
    }) as Promise<IAiDecisionCandidate | null>;
  }

  async createHistory(
    data: Partial<IAiDecisionHistory>,
  ): Promise<IAiDecisionHistory> {
    return this.prisma.aiDecisionHistory.create({
      data: data as any,
    }) as Promise<IAiDecisionHistory>;
  }

  async findHistoryByDecisionId(
    decisionId: string,
  ): Promise<IAiDecisionHistory[]> {
    return this.prisma.aiDecisionHistory.findMany({
      where: { decisionId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiDecisionHistory[]>;
  }

  async createOverride(
    data: Partial<IAiDecisionOverride>,
  ): Promise<IAiDecisionOverride> {
    return this.prisma.aiDecisionOverride.create({
      data: data as any,
    }) as Promise<IAiDecisionOverride>;
  }

  async findOverridesByDecisionId(
    decisionId: string,
  ): Promise<IAiDecisionOverride[]> {
    return this.prisma.aiDecisionOverride.findMany({
      where: { decisionId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiDecisionOverride[]>;
  }

  async createRule(data: Partial<IAiDecisionRule>): Promise<IAiDecisionRule> {
    return this.prisma.aiDecisionRule.create({
      data: data as any,
    }) as Promise<IAiDecisionRule>;
  }

  async updateRule(
    id: string,
    data: Partial<IAiDecisionRule>,
  ): Promise<IAiDecisionRule> {
    return this.prisma.aiDecisionRule.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiDecisionRule>;
  }

  async findRuleById(id: string): Promise<IAiDecisionRule | null> {
    return this.prisma.aiDecisionRule.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IAiDecisionRule | null>;
  }

  async findRuleByName(
    name: string,
    workspaceId?: string,
  ): Promise<IAiDecisionRule | null> {
    return this.prisma.aiDecisionRule.findFirst({
      where: {
        name,
        workspaceId: workspaceId || null,
        deletedAt: null,
      },
    }) as Promise<IAiDecisionRule | null>;
  }

  async findApplicableRules(params: {
    workspaceId?: string;
    decisionType: string;
    capability?: string;
    useCase?: string;
  }): Promise<IAiDecisionRule[]> {
    const where: any = {
      enabled: true,
      deletedAt: null,
      decisionType: params.decisionType,
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

    return this.prisma.aiDecisionRule.findMany({
      where,
      orderBy: { priority: 'desc' },
    }) as Promise<IAiDecisionRule[]>;
  }

  async deleteRule(id: string): Promise<void> {
    await this.prisma.aiDecisionRule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getDecisionStats(
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

    const [totalDecisions, approvedDecisions, rejectedDecisions, stats] =
      await Promise.all([
        this.prisma.aiDecision.count({ where }),
        this.prisma.aiDecision.count({
          where: { ...where, status: 'APPROVED' },
        }),
        this.prisma.aiDecision.count({
          where: { ...where, status: 'REJECTED' },
        }),
        this.prisma.aiDecision.aggregate({
          where,
          _avg: {
            finalScore: true,
            confidenceScore: true,
            evaluationDuration: true,
          },
        }),
      ]);

    return {
      totalDecisions,
      approvedDecisions,
      rejectedDecisions,
      approvalRate:
        totalDecisions > 0 ? approvedDecisions / totalDecisions : 0,
      avgFinalScore: stats._avg.finalScore || 0,
      avgConfidenceScore: stats._avg.confidenceScore || 0,
      avgEvaluationDuration: stats._avg.evaluationDuration || 0,
    };
  }
}
