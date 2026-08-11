import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiGuardrailRule,
  IAiGuardrailRuleVersion,
  IAiGuardrailOverride,
  IAiGuardrailEvaluation,
  IAiGuardrailEvaluationResult,
  IAiGuardrailIncident,
  IAiGuardrailIncidentHistory,
  IAiGuardrailApproval,
  IAiGuardrailApprovalHistory,
  GuardrailStage,
} from './interfaces';
import {
  GuardrailRuleFilterDto,
  GuardrailOverrideFilterDto,
  GuardrailEvaluationFilterDto,
  GuardrailIncidentFilterDto,
  GuardrailApprovalFilterDto,
} from './dto';

@Injectable()
export class AiGuardrailsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Rules ────────────────────────────────────────────────────────

  async createRule(data: Partial<IAiGuardrailRule>): Promise<IAiGuardrailRule> {
    return this.prisma.aiGuardrailRule.create({
      data: data as any,
    }) as Promise<IAiGuardrailRule>;
  }

  async updateRule(
    id: string,
    data: Partial<IAiGuardrailRule>,
  ): Promise<IAiGuardrailRule> {
    return this.prisma.aiGuardrailRule.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiGuardrailRule>;
  }

  async findRuleById(id: string): Promise<IAiGuardrailRule | null> {
    return this.prisma.aiGuardrailRule.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IAiGuardrailRule | null>;
  }

  async findRuleByName(
    name: string,
    workspaceId?: string,
  ): Promise<IAiGuardrailRule | null> {
    return this.prisma.aiGuardrailRule.findFirst({
      where: { name, workspaceId: workspaceId || null, deletedAt: null },
    }) as Promise<IAiGuardrailRule | null>;
  }

  async findAllRules(
    filter: GuardrailRuleFilterDto,
  ): Promise<[IAiGuardrailRule[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [{ workspaceId: null }, { workspaceId: filter.workspaceId }],
      deletedAt: null,
    };

    if (filter.stage) where.stage = filter.stage;
    if (filter.category) where.category = filter.category;
    if (filter.checkType) where.checkType = filter.checkType;
    if (filter.capability) where.capability = filter.capability;
    if (filter.enabled !== undefined) where.enabled = filter.enabled;

    const [data, total] = await Promise.all([
      this.prisma.aiGuardrailRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { priority: 'desc' },
      }),
      this.prisma.aiGuardrailRule.count({ where }),
    ]);

    return [data as IAiGuardrailRule[], total];
  }

  async findApplicableRules(params: {
    workspaceId: string;
    stage: GuardrailStage;
    capability?: string;
    useCase?: string;
    modelProvider?: string;
  }): Promise<IAiGuardrailRule[]> {
    const where: any = {
      enabled: true,
      deletedAt: null,
      stage: params.stage,
      OR: [{ workspaceId: null }, { workspaceId: params.workspaceId }],
    };

    if (params.capability) {
      where.AND = [
        ...(where.AND || []),
        { OR: [{ capability: params.capability }, { capability: null }] },
      ];
    }

    if (params.useCase) {
      where.AND = [
        ...(where.AND || []),
        { OR: [{ useCase: params.useCase }, { useCase: null }] },
      ];
    }

    if (params.modelProvider) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { modelProvider: params.modelProvider },
            { modelProvider: null },
          ],
        },
      ];
    }

    return this.prisma.aiGuardrailRule.findMany({
      where,
      orderBy: { priority: 'desc' },
    }) as Promise<IAiGuardrailRule[]>;
  }

  async deleteRule(id: string): Promise<void> {
    await this.prisma.aiGuardrailRule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createRuleVersion(
    data: Partial<IAiGuardrailRuleVersion>,
  ): Promise<IAiGuardrailRuleVersion> {
    return this.prisma.aiGuardrailRuleVersion.create({
      data: data as any,
    }) as Promise<IAiGuardrailRuleVersion>;
  }

  async findRuleVersions(ruleId: string): Promise<IAiGuardrailRuleVersion[]> {
    return this.prisma.aiGuardrailRuleVersion.findMany({
      where: { ruleId },
      orderBy: { version: 'desc' },
    }) as Promise<IAiGuardrailRuleVersion[]>;
  }

  async getLatestRuleVersionNumber(ruleId: string): Promise<number> {
    const latest = await this.prisma.aiGuardrailRuleVersion.findFirst({
      where: { ruleId },
      orderBy: { version: 'desc' },
    });
    return latest?.version ?? 0;
  }

  // ── Overrides ────────────────────────────────────────────────────

  async createOverride(
    data: Partial<IAiGuardrailOverride>,
  ): Promise<IAiGuardrailOverride> {
    return this.prisma.aiGuardrailOverride.create({
      data: data as any,
    }) as Promise<IAiGuardrailOverride>;
  }

  async updateOverride(
    id: string,
    data: Partial<IAiGuardrailOverride>,
  ): Promise<IAiGuardrailOverride> {
    return this.prisma.aiGuardrailOverride.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiGuardrailOverride>;
  }

  async findOverrideById(id: string): Promise<IAiGuardrailOverride | null> {
    return this.prisma.aiGuardrailOverride.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IAiGuardrailOverride | null>;
  }

  async findAllOverrides(
    filter: GuardrailOverrideFilterDto,
  ): Promise<[IAiGuardrailOverride[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      OR: [{ workspaceId: null }, { workspaceId: filter.workspaceId }],
    };

    if (filter.scope) where.scope = filter.scope;
    if (filter.ruleId) where.ruleId = filter.ruleId;

    const [data, total] = await Promise.all([
      this.prisma.aiGuardrailOverride.findMany({
        where,
        skip,
        take: limit,
        orderBy: { priority: 'desc' },
      }),
      this.prisma.aiGuardrailOverride.count({ where }),
    ]);

    return [data as IAiGuardrailOverride[], total];
  }

  async findApplicableOverrides(params: {
    workspaceId: string;
    providerKey?: string;
    modelId?: string;
    ruleIds: string[];
  }): Promise<IAiGuardrailOverride[]> {
    return this.prisma.aiGuardrailOverride.findMany({
      where: {
        deletedAt: null,
        OR: [{ ruleId: null }, { ruleId: { in: params.ruleIds } }],
        AND: [
          { OR: [{ workspaceId: null }, { workspaceId: params.workspaceId }] },
          { OR: [{ providerKey: null }, { providerKey: params.providerKey ?? null }] },
          { OR: [{ modelId: null }, { modelId: params.modelId ?? null }] },
        ],
      },
      orderBy: { priority: 'desc' },
    }) as Promise<IAiGuardrailOverride[]>;
  }

  async deleteOverride(id: string): Promise<void> {
    await this.prisma.aiGuardrailOverride.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Evaluations ──────────────────────────────────────────────────

  async createEvaluation(
    data: Partial<IAiGuardrailEvaluation>,
  ): Promise<IAiGuardrailEvaluation> {
    return this.prisma.aiGuardrailEvaluation.create({
      data: data as any,
    }) as Promise<IAiGuardrailEvaluation>;
  }

  async createEvaluationResult(
    data: Partial<IAiGuardrailEvaluationResult>,
  ): Promise<IAiGuardrailEvaluationResult> {
    return this.prisma.aiGuardrailEvaluationResult.create({
      data: data as any,
    }) as Promise<IAiGuardrailEvaluationResult>;
  }

  async findEvaluationById(
    id: string,
    workspaceId: string,
  ): Promise<IAiGuardrailEvaluation | null> {
    return this.prisma.aiGuardrailEvaluation.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiGuardrailEvaluation | null>;
  }

  async findAllEvaluations(
    filter: GuardrailEvaluationFilterDto,
  ): Promise<[IAiGuardrailEvaluation[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId };
    if (filter.stage) where.stage = filter.stage;
    if (filter.decision) where.decision = filter.decision;
    if (filter.severity) where.severity = filter.severity;
    if (filter.orchestratorRequestId) {
      where.orchestratorRequestId = filter.orchestratorRequestId;
    }
    if (filter.agentExecutionId) where.agentExecutionId = filter.agentExecutionId;

    const [data, total] = await Promise.all([
      this.prisma.aiGuardrailEvaluation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiGuardrailEvaluation.count({ where }),
    ]);

    return [data as IAiGuardrailEvaluation[], total];
  }

  async findEvaluationResults(
    evaluationId: string,
  ): Promise<IAiGuardrailEvaluationResult[]> {
    return this.prisma.aiGuardrailEvaluationResult.findMany({
      where: { evaluationId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<IAiGuardrailEvaluationResult[]>;
  }

  // ── Incidents ────────────────────────────────────────────────────

  async createIncident(
    data: Partial<IAiGuardrailIncident>,
  ): Promise<IAiGuardrailIncident> {
    return this.prisma.aiGuardrailIncident.create({
      data: data as any,
    }) as Promise<IAiGuardrailIncident>;
  }

  async updateIncident(
    id: string,
    data: Partial<IAiGuardrailIncident>,
  ): Promise<IAiGuardrailIncident> {
    return this.prisma.aiGuardrailIncident.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiGuardrailIncident>;
  }

  async findIncidentById(
    id: string,
    workspaceId: string,
  ): Promise<IAiGuardrailIncident | null> {
    return this.prisma.aiGuardrailIncident.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiGuardrailIncident | null>;
  }

  async findAllIncidents(
    filter: GuardrailIncidentFilterDto,
  ): Promise<[IAiGuardrailIncident[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId };
    if (filter.status) where.status = filter.status;
    if (filter.severity) where.severity = filter.severity;
    if (filter.category) where.category = filter.category;

    const [data, total] = await Promise.all([
      this.prisma.aiGuardrailIncident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiGuardrailIncident.count({ where }),
    ]);

    return [data as IAiGuardrailIncident[], total];
  }

  async createIncidentHistory(
    data: Partial<IAiGuardrailIncidentHistory>,
  ): Promise<IAiGuardrailIncidentHistory> {
    return this.prisma.aiGuardrailIncidentHistory.create({
      data: data as any,
    }) as Promise<IAiGuardrailIncidentHistory>;
  }

  async findIncidentHistory(
    incidentId: string,
  ): Promise<IAiGuardrailIncidentHistory[]> {
    return this.prisma.aiGuardrailIncidentHistory.findMany({
      where: { incidentId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiGuardrailIncidentHistory[]>;
  }

  // ── Approvals ────────────────────────────────────────────────────

  async createApproval(
    data: Partial<IAiGuardrailApproval>,
  ): Promise<IAiGuardrailApproval> {
    return this.prisma.aiGuardrailApproval.create({
      data: data as any,
    }) as Promise<IAiGuardrailApproval>;
  }

  async updateApproval(
    id: string,
    data: Partial<IAiGuardrailApproval>,
  ): Promise<IAiGuardrailApproval> {
    return this.prisma.aiGuardrailApproval.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiGuardrailApproval>;
  }

  async findApprovalById(
    id: string,
    workspaceId: string,
  ): Promise<IAiGuardrailApproval | null> {
    return this.prisma.aiGuardrailApproval.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiGuardrailApproval | null>;
  }

  async findAllApprovals(
    filter: GuardrailApprovalFilterDto,
  ): Promise<[IAiGuardrailApproval[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId };
    if (filter.status) where.status = filter.status;

    const [data, total] = await Promise.all([
      this.prisma.aiGuardrailApproval.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiGuardrailApproval.count({ where }),
    ]);

    return [data as IAiGuardrailApproval[], total];
  }

  async createApprovalHistory(
    data: Partial<IAiGuardrailApprovalHistory>,
  ): Promise<IAiGuardrailApprovalHistory> {
    return this.prisma.aiGuardrailApprovalHistory.create({
      data: data as any,
    }) as Promise<IAiGuardrailApprovalHistory>;
  }

  async findApprovalHistory(
    approvalId: string,
  ): Promise<IAiGuardrailApprovalHistory[]> {
    return this.prisma.aiGuardrailApprovalHistory.findMany({
      where: { approvalId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiGuardrailApprovalHistory[]>;
  }

  // ── Stats ────────────────────────────────────────────────────────

  async getGuardrailStats(
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

    const [totalEvaluations, blocked, requireReview, avgRisk, openIncidents, pendingApprovals] =
      await Promise.all([
        this.prisma.aiGuardrailEvaluation.count({ where }),
        this.prisma.aiGuardrailEvaluation.count({
          where: { ...where, decision: 'BLOCK' },
        }),
        this.prisma.aiGuardrailEvaluation.count({
          where: { ...where, decision: 'REQUIRE_REVIEW' },
        }),
        this.prisma.aiGuardrailEvaluation.aggregate({
          where,
          _avg: { riskScore: true },
        }),
        this.prisma.aiGuardrailIncident.count({
          where: { workspaceId, status: 'OPEN' },
        }),
        this.prisma.aiGuardrailApproval.count({
          where: { workspaceId, status: 'PENDING' },
        }),
      ]);

    return {
      totalEvaluations,
      blocked,
      requireReview,
      avgRiskScore: avgRisk._avg.riskScore || 0,
      openIncidents,
      pendingApprovals,
    };
  }
}
