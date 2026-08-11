import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IRule, IRuleExecution, IRuleHistory, RuleStatus, RuleTriggerType } from './interfaces';
import { RuleFilterDto, RuleExecutionFilterDto } from './dto';

@Injectable()
export class BusinessRulesEngineRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Rules ────────────────────────────────────────────────────────

  async create(data: Partial<IRule>): Promise<IRule> {
    return this.prisma.ruleDefinition.create({ data: data as any }) as Promise<IRule>;
  }

  async findById(id: string): Promise<IRule | null> {
    return this.prisma.ruleDefinition.findFirst({ where: { id, deletedAt: null } }) as Promise<IRule | null>;
  }

  async findByScopeKeyModuleAndKey(scopeKey: string, module: string, key: string): Promise<IRule | null> {
    return this.prisma.ruleDefinition.findFirst({
      where: { scopeKey, module, key, deletedAt: null },
    }) as Promise<IRule | null>;
  }

  async findAll(visibleScopeKeys: string[], filter: RuleFilterDto): Promise<[IRule[], number]> {
    const where: Record<string, unknown> = { scopeKey: { in: visibleScopeKeys }, deletedAt: null };
    if (filter.module) where.module = filter.module;
    if (filter.scope) where.scope = filter.scope;
    if (filter.status) where.status = filter.status;
    if (filter.triggerType) where.triggerType = filter.triggerType;
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
      this.prisma.ruleDefinition.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.ruleDefinition.count({ where: where as any }),
    ]);

    return [data as IRule[], total];
  }

  /** All non-deleted rules visible to a scope, matched for evaluation (PUBLISHED only) by module + triggerType (+ triggerRef when EVENT/WORKFLOW), ordered for deterministic precedence. */
  async findMatchCandidates(
    visibleScopeKeys: string[],
    module: string,
    triggerType: RuleTriggerType,
    triggerRef?: string,
  ): Promise<IRule[]> {
    const where: Record<string, unknown> = {
      scopeKey: { in: visibleScopeKeys },
      module,
      triggerType,
      status: RuleStatus.PUBLISHED,
      deletedAt: null,
    };
    if (triggerRef) where.triggerRef = triggerRef;

    return this.prisma.ruleDefinition.findMany({
      where: where as any,
      orderBy: [{ priority: 'desc' }, { executionOrder: 'asc' }],
    }) as Promise<IRule[]>;
  }

  /** All non-deleted EVENT-triggered rules visible to a scope — used only for static circular-execution graph construction at validate/publish time. */
  async findAllEventTriggeredForValidation(visibleScopeKeys: string[]): Promise<IRule[]> {
    return this.prisma.ruleDefinition.findMany({
      where: { scopeKey: { in: visibleScopeKeys }, triggerType: RuleTriggerType.EVENT, deletedAt: null },
    }) as Promise<IRule[]>;
  }

  async findDueScheduledRules(before: Date): Promise<IRule[]> {
    return this.prisma.ruleDefinition.findMany({
      where: {
        triggerType: RuleTriggerType.SCHEDULE,
        status: RuleStatus.PUBLISHED,
        deletedAt: null,
        nextRunAt: { lte: before },
      },
    }) as Promise<IRule[]>;
  }

  async update(id: string, data: Partial<IRule>): Promise<IRule> {
    return this.prisma.ruleDefinition.update({ where: { id }, data: data as any }) as Promise<IRule>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<IRuleHistory>): Promise<IRuleHistory> {
    return this.prisma.ruleDefinitionHistory.create({ data: data as any }) as Promise<IRuleHistory>;
  }

  async findHistory(ruleId: string): Promise<IRuleHistory[]> {
    return this.prisma.ruleDefinitionHistory.findMany({
      where: { ruleId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<IRuleHistory[]>;
  }

  async findHistoryById(id: string): Promise<IRuleHistory | null> {
    return this.prisma.ruleDefinitionHistory.findFirst({ where: { id } }) as Promise<IRuleHistory | null>;
  }

  // ── Executions ───────────────────────────────────────────────────

  async createExecution(data: Partial<IRuleExecution>): Promise<IRuleExecution> {
    return this.prisma.ruleExecution.create({ data: data as any }) as Promise<IRuleExecution>;
  }

  async findExecutionByIdempotencyKey(ruleId: string, idempotencyKey: string): Promise<IRuleExecution | null> {
    return this.prisma.ruleExecution.findFirst({
      where: { ruleId, idempotencyKey },
    }) as Promise<IRuleExecution | null>;
  }

  async findExecutionById(id: string): Promise<IRuleExecution | null> {
    return this.prisma.ruleExecution.findFirst({ where: { id } }) as Promise<IRuleExecution | null>;
  }

  async findExecutions(workspaceId: string, filter: RuleExecutionFilterDto): Promise<[IRuleExecution[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.ruleId) where.ruleId = filter.ruleId;
    if (filter.module) where.module = filter.module;
    if (filter.status) where.status = filter.status;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.ruleExecution.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ruleExecution.count({ where: where as any }),
    ]);

    return [data as IRuleExecution[], total];
  }
}
