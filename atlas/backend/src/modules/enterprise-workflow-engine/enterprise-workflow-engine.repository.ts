import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IWorkflowDefinitionFilterOptions, IWorkflowExecutionFilterOptions } from './interfaces';
import { WORKFLOW_ENGINE_CONSTANTS } from './constants';

@Injectable()
export class EnterpriseWorkflowEngineRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Definitions ───────────────────────────────────────────────

  async createDefinition(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.prisma.workflowDefinition.create({ data: data as any }) as unknown as Record<string, unknown>;
  }

  async findDefinitionById(id: string): Promise<Record<string, unknown> | null> {
    return this.prisma.workflowDefinition.findFirst({ where: { id, deletedAt: null } }) as unknown as Record<string, unknown> | null;
  }

  async findLatestByKey(key: string, workspaceId: string | null): Promise<Record<string, unknown> | null> {
    return this.prisma.workflowDefinition.findFirst({
      where: { key, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    }) as unknown as Record<string, unknown> | null;
  }

  async updateDefinition(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.prisma.workflowDefinition.update({ where: { id }, data: data as any }) as unknown as Record<string, unknown>;
  }

  async findDefinitions(workspaceId: string | undefined, filter: IWorkflowDefinitionFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (workspaceId !== undefined) where['OR'] = [{ workspaceId }, { workspaceId: null }];
    if (filter.key) where['key'] = filter.key;
    if (filter.status) where['status'] = filter.status;
    if (filter.workflowKind) where['workflowKind'] = filter.workflowKind;
    if (filter.businessId !== undefined) where['businessId'] = filter.businessId;
    if (filter.isTemplate !== undefined) where['isTemplate'] = filter.isTemplate;
    if (filter.search) where['name'] = { contains: filter.search, mode: 'insensitive' };

    const sortField = WORKFLOW_ENGINE_CONSTANTS.DEFINITION_SORT_FIELDS.includes((filter.sortBy ?? 'updatedAt') as any)
      ? (filter.sortBy ?? 'updatedAt')
      : 'updatedAt';
    const take = Math.min(filter.limit ?? WORKFLOW_ENGINE_CONSTANTS.DEFAULT_PAGE_SIZE, WORKFLOW_ENGINE_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.prisma.workflowDefinition.findMany({ where: where as any, orderBy: { [sortField]: filter.sortOrder ?? 'desc' }, take, skip }),
      this.prisma.workflowDefinition.count({ where: where as any }),
    ]);
    return [items as unknown as Record<string, unknown>[], total];
  }

  async createDefinitionHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.prisma.workflowDefinitionHistory.create({ data: data as any }) as unknown as Record<string, unknown>;
  }

  async findDefinitionHistory(definitionId: string, limit = 20): Promise<Record<string, unknown>[]> {
    return this.prisma.workflowDefinitionHistory.findMany({
      where: { definitionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as unknown as Record<string, unknown>[];
  }

  // ── Executions ────────────────────────────────────────────────

  async createExecution(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.prisma.workflowExecution.create({ data: data as any }) as unknown as Record<string, unknown>;
  }

  async findExecutionById(id: string, workspaceId?: string): Promise<Record<string, unknown> | null> {
    return this.prisma.workflowExecution.findFirst({
      where: workspaceId ? { id, workspaceId } : { id },
      include: { stepExecutions: { orderBy: { stepIndex: 'asc' } } },
    }) as unknown as Record<string, unknown> | null;
  }

  async findExecutionByIdempotencyKey(workspaceId: string, definitionId: string, idempotencyKey: string): Promise<Record<string, unknown> | null> {
    return this.prisma.workflowExecution.findFirst({
      where: { workspaceId, definitionId, idempotencyKey },
    }) as unknown as Record<string, unknown> | null;
  }

  async updateExecution(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.prisma.workflowExecution.update({ where: { id }, data: data as any }) as unknown as Record<string, unknown>;
  }

  async findExecutions(filter: IWorkflowExecutionFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { workspaceId: filter.workspaceId };
    if (filter.definitionId) where['definitionId'] = filter.definitionId;
    if (filter.status) where['status'] = filter.status;

    const sortField = WORKFLOW_ENGINE_CONSTANTS.EXECUTION_SORT_FIELDS.includes((filter.sortBy ?? 'startTime') as any)
      ? (filter.sortBy ?? 'startTime')
      : 'startTime';
    const take = Math.min(filter.limit ?? WORKFLOW_ENGINE_CONSTANTS.DEFAULT_PAGE_SIZE, WORKFLOW_ENGINE_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.prisma.workflowExecution.findMany({ where: where as any, orderBy: { [sortField]: filter.sortOrder ?? 'desc' }, take, skip }),
      this.prisma.workflowExecution.count({ where: where as any }),
    ]);
    return [items as unknown as Record<string, unknown>[], total];
  }

  // ── Step Executions ──────────────────────────────────────────

  async createStepExecution(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.prisma.workflowStepExecution.create({ data: data as any }) as unknown as Record<string, unknown>;
  }

  async findStepExecutionById(id: string): Promise<Record<string, unknown> | null> {
    return this.prisma.workflowStepExecution.findFirst({ where: { id } }) as unknown as Record<string, unknown> | null;
  }

  async updateStepExecution(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.prisma.workflowStepExecution.update({ where: { id }, data: data as any }) as unknown as Record<string, unknown>;
  }

  async findWaitingStepExecutions(workspaceId: string, executionId: string): Promise<Record<string, unknown>[]> {
    return this.prisma.workflowStepExecution.findMany({
      where: { workspaceId, executionId, status: 'WAITING' as any },
    }) as unknown as Record<string, unknown>[];
  }

  async findOverdueStepExecutions(now: Date, limit = 100): Promise<Record<string, unknown>[]> {
    return this.prisma.workflowStepExecution.findMany({
      where: { status: 'WAITING' as any, dueAt: { lte: now }, escalatedAt: null },
      take: limit,
    }) as unknown as Record<string, unknown>[];
  }

  // ── Checkpoints ───────────────────────────────────────────────

  async createCheckpoint(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.prisma.workflowCheckpoint.create({ data: data as any }) as unknown as Record<string, unknown>;
  }

  async findCheckpoints(executionId: string): Promise<Record<string, unknown>[]> {
    return this.prisma.workflowCheckpoint.findMany({
      where: { executionId },
      orderBy: { sequence: 'asc' },
    }) as unknown as Record<string, unknown>[];
  }

  async findLatestCheckpoint(executionId: string): Promise<Record<string, unknown> | null> {
    return this.prisma.workflowCheckpoint.findFirst({
      where: { executionId },
      orderBy: { sequence: 'desc' },
    }) as unknown as Record<string, unknown> | null;
  }
}
