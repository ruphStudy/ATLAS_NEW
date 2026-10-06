import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IApprovalWorkflowDefinition,
  IApprovalWorkflowDefinitionHistory,
  IApprovalRequest,
  IApprovalStepInstance,
  IApprovalAssignment,
  IApprovalDecision,
  IApprovalSubstitute,
  ApprovalRequestStatus,
  ApprovalStepStatus,
  ApprovalAssignmentStatus,
  ApproverType,
} from './interfaces';
import { WorkflowDefinitionFilterDto, RequestFilterDto } from './dto';
import { APPROVAL_SLA_SCAN_LIMIT } from './constants';

@Injectable()
export class ApprovalWorkflowRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Workflow definitions ─────────────────────────────────────────

  async createDefinition(data: Partial<IApprovalWorkflowDefinition>): Promise<IApprovalWorkflowDefinition> {
    return this.prisma.approvalWorkflowDefinition.create({
      data: data as any,
    }) as unknown as Promise<IApprovalWorkflowDefinition>;
  }

  async findDefinitionById(id: string): Promise<IApprovalWorkflowDefinition | null> {
    return this.prisma.approvalWorkflowDefinition.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IApprovalWorkflowDefinition | null>;
  }

  async findDefinitionByKey(workspaceId: string, key: string): Promise<IApprovalWorkflowDefinition | null> {
    return this.prisma.approvalWorkflowDefinition.findFirst({
      where: { workspaceId, key, deletedAt: null },
    }) as Promise<IApprovalWorkflowDefinition | null>;
  }

  async findTemplateByKey(workspaceId: string, templateKey: string): Promise<IApprovalWorkflowDefinition | null> {
    return this.prisma.approvalWorkflowDefinition.findFirst({
      where: { workspaceId, key: templateKey, isTemplate: true, deletedAt: null },
    }) as Promise<IApprovalWorkflowDefinition | null>;
  }

  async findAllDefinitions(
    workspaceId: string,
    filter: WorkflowDefinitionFilterDto,
  ): Promise<[IApprovalWorkflowDefinition[], number]> {
    const where: Record<string, unknown> = { workspaceId, deletedAt: null };
    if (filter.module) where.module = filter.module;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { key: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.approvalWorkflowDefinition.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.approvalWorkflowDefinition.count({ where: where as any }),
    ]);

    return [data as unknown as IApprovalWorkflowDefinition[], total];
  }

  async updateDefinition(
    id: string,
    data: Partial<IApprovalWorkflowDefinition>,
  ): Promise<IApprovalWorkflowDefinition> {
    return this.prisma.approvalWorkflowDefinition.update({
      where: { id },
      data: data as any,
    }) as unknown as Promise<IApprovalWorkflowDefinition>;
  }

  async createDefinitionHistory(
    data: Partial<IApprovalWorkflowDefinitionHistory>,
  ): Promise<IApprovalWorkflowDefinitionHistory> {
    return this.prisma.approvalWorkflowDefinitionHistory.create({
      data: data as any,
    }) as Promise<IApprovalWorkflowDefinitionHistory>;
  }

  async findDefinitionHistory(definitionId: string): Promise<IApprovalWorkflowDefinitionHistory[]> {
    return this.prisma.approvalWorkflowDefinitionHistory.findMany({
      where: { definitionId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<IApprovalWorkflowDefinitionHistory[]>;
  }

  async findDefinitionHistoryEntry(
    definitionId: string,
    version: number,
  ): Promise<IApprovalWorkflowDefinitionHistory | null> {
    return this.prisma.approvalWorkflowDefinitionHistory.findFirst({
      where: { definitionId, version },
    }) as Promise<IApprovalWorkflowDefinitionHistory | null>;
  }

  async countActiveRequestsForDefinition(definitionId: string): Promise<number> {
    const where: Record<string, unknown> = {
      definitionId,
      status: {
        in: [ApprovalRequestStatus.PENDING, ApprovalRequestStatus.IN_PROGRESS, ApprovalRequestStatus.CHANGES_REQUESTED],
      },
    };
    return this.prisma.approvalRequest.count({ where: where as any });
  }

  // ── Requests ─────────────────────────────────────────────────────

  async createRequest(data: Partial<IApprovalRequest>): Promise<IApprovalRequest> {
    return this.prisma.approvalRequest.create({ data: data as any }) as Promise<IApprovalRequest>;
  }

  async findRequestById(id: string): Promise<IApprovalRequest | null> {
    return this.prisma.approvalRequest.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IApprovalRequest | null>;
  }

  async updateRequest(id: string, data: Partial<IApprovalRequest>): Promise<IApprovalRequest> {
    return this.prisma.approvalRequest.update({ where: { id }, data: data as any }) as Promise<IApprovalRequest>;
  }

  async findAllRequests(
    workspaceId: string,
    filter: RequestFilterDto,
    restrictToRequestIds?: string[],
  ): Promise<[IApprovalRequest[], number]> {
    const where: Record<string, unknown> = { workspaceId, deletedAt: null };
    if (filter.module) where.module = filter.module;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.definitionId) where.definitionId = filter.definitionId;
    if (filter.status) where.status = filter.status;
    if (filter.requestedBy) where.requestedBy = filter.requestedBy;
    if (restrictToRequestIds) where.id = { in: restrictToRequestIds };

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.approvalRequest.count({ where: where as any }),
    ]);

    return [data as IApprovalRequest[], total];
  }

  async findRequestsPastSla(now: Date, limit = APPROVAL_SLA_SCAN_LIMIT): Promise<IApprovalRequest[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      slaDueAt: { lt: now },
      status: { in: [ApprovalRequestStatus.PENDING, ApprovalRequestStatus.IN_PROGRESS] },
    };
    return this.prisma.approvalRequest.findMany({ where: where as any, take: limit }) as Promise<IApprovalRequest[]>;
  }

  // ── Step instances ───────────────────────────────────────────────

  async createStepInstance(data: Partial<IApprovalStepInstance>): Promise<IApprovalStepInstance> {
    return this.prisma.approvalStepInstance.create({ data: data as any }) as Promise<IApprovalStepInstance>;
  }

  async findStepInstanceById(id: string): Promise<IApprovalStepInstance | null> {
    return this.prisma.approvalStepInstance.findUnique({ where: { id } }) as Promise<IApprovalStepInstance | null>;
  }

  async findStepInstanceByRequestAndIndex(
    requestId: string,
    stepIndex: number,
  ): Promise<IApprovalStepInstance | null> {
    return this.prisma.approvalStepInstance.findUnique({
      where: { requestId_stepIndex: { requestId, stepIndex } },
    }) as Promise<IApprovalStepInstance | null>;
  }

  async listStepInstances(requestId: string): Promise<IApprovalStepInstance[]> {
    return this.prisma.approvalStepInstance.findMany({
      where: { requestId },
      orderBy: { stepIndex: 'asc' },
    }) as Promise<IApprovalStepInstance[]>;
  }

  async updateStepInstance(id: string, data: Partial<IApprovalStepInstance>): Promise<IApprovalStepInstance> {
    return this.prisma.approvalStepInstance.update({
      where: { id },
      data: data as any,
    }) as Promise<IApprovalStepInstance>;
  }

  async findStepsPastDue(now: Date, limit = APPROVAL_SLA_SCAN_LIMIT): Promise<IApprovalStepInstance[]> {
    const where: Record<string, unknown> = {
      status: ApprovalStepStatus.IN_PROGRESS,
      dueAt: { lt: now },
      escalatedAt: null,
    };
    return this.prisma.approvalStepInstance.findMany({ where: where as any, take: limit }) as Promise<
      IApprovalStepInstance[]
    >;
  }

  // ── Assignments ──────────────────────────────────────────────────

  async createAssignment(data: Partial<IApprovalAssignment>): Promise<IApprovalAssignment> {
    return this.prisma.approvalAssignment.create({ data: data as any }) as Promise<IApprovalAssignment>;
  }

  async findAssignmentById(id: string): Promise<IApprovalAssignment | null> {
    return this.prisma.approvalAssignment.findUnique({ where: { id } }) as Promise<IApprovalAssignment | null>;
  }

  async listAssignmentsForStep(stepInstanceId: string): Promise<IApprovalAssignment[]> {
    return this.prisma.approvalAssignment.findMany({
      where: { stepInstanceId },
    }) as Promise<IApprovalAssignment[]>;
  }

  async updateAssignment(id: string, data: Partial<IApprovalAssignment>): Promise<IApprovalAssignment> {
    return this.prisma.approvalAssignment.update({
      where: { id },
      data: data as any,
    }) as Promise<IApprovalAssignment>;
  }

  /** Distinct request ids that currently have a PENDING assignment matching this user directly, or one of their held role keys. */
  async findRequestIdsWithPendingAssignmentFor(
    workspaceId: string,
    userId: string,
    roleKeys: string[],
  ): Promise<string[]> {
    const where: Record<string, unknown> = {
      workspaceId,
      status: ApprovalAssignmentStatus.PENDING,
      OR: [
        { approverType: 'USER', approverRef: userId },
        ...(roleKeys.length > 0 ? [{ approverType: 'ROLE', approverRef: { in: roleKeys } }] : []),
      ],
    };

    const rows = await this.prisma.approvalAssignment.findMany({
      where: where as any,
      select: { requestId: true },
      distinct: ['requestId'],
    });
    return rows.map((r: { requestId: string }) => r.requestId);
  }

  // ── Decisions (append-only) ──────────────────────────────────────

  async createDecision(data: Partial<IApprovalDecision>): Promise<IApprovalDecision> {
    return this.prisma.approvalDecision.create({ data: data as any }) as Promise<IApprovalDecision>;
  }

  async listDecisionsForRequest(requestId: string): Promise<IApprovalDecision[]> {
    return this.prisma.approvalDecision.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<IApprovalDecision[]>;
  }

  async findDecisionByIdempotencyKey(
    stepInstanceId: string | null,
    decidedBy: string,
    idempotencyKey: string,
  ): Promise<IApprovalDecision | null> {
    return this.prisma.approvalDecision.findFirst({
      where: { stepInstanceId, decidedBy, idempotencyKey },
    }) as Promise<IApprovalDecision | null>;
  }

  // ── Substitute approvers ─────────────────────────────────────────

  async createSubstitute(data: Partial<IApprovalSubstitute>): Promise<IApprovalSubstitute> {
    return this.prisma.approvalSubstitute.create({ data: data as any }) as Promise<IApprovalSubstitute>;
  }

  async findSubstituteById(id: string): Promise<IApprovalSubstitute | null> {
    return this.prisma.approvalSubstitute.findFirst({ where: { id } }) as Promise<IApprovalSubstitute | null>;
  }

  async listSubstitutes(workspaceId: string): Promise<IApprovalSubstitute[]> {
    return this.prisma.approvalSubstitute.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IApprovalSubstitute[]>;
  }

  /** The currently-effective substitute for a primary approver reference, if any. */
  async findActiveSubstitute(
    workspaceId: string,
    approverType: ApproverType,
    approverRef: string,
    at: Date,
  ): Promise<IApprovalSubstitute | null> {
    return this.prisma.approvalSubstitute.findFirst({
      where: {
        workspaceId,
        approverType,
        approverRef,
        isActive: true,
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: at } }],
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }] }],
      },
    }) as Promise<IApprovalSubstitute | null>;
  }

  async deactivateSubstitute(id: string): Promise<IApprovalSubstitute> {
    return this.prisma.approvalSubstitute.update({
      where: { id },
      data: { isActive: false },
    }) as Promise<IApprovalSubstitute>;
  }
}
