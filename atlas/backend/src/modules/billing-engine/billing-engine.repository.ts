import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IBillingHistory, IBillingItem, IBillingPeriod, IBillingRule, BillingPeriodStatus } from './interfaces';
import { BillingFilterDto } from './dto';

@Injectable()
export class BillingEngineRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Billing periods ──────────────────────────────────────────────

  async create(data: Partial<IBillingPeriod>): Promise<IBillingPeriod> {
    return this.prisma.billingPeriod.create({ data: data as any }) as Promise<IBillingPeriod>;
  }

  async findById(id: string): Promise<IBillingPeriod | null> {
    return this.prisma.billingPeriod.findFirst({ where: { id } }) as Promise<IBillingPeriod | null>;
  }

  async findByIdempotencyKey(workspaceId: string, idempotencyKey: string): Promise<IBillingPeriod | null> {
    return this.prisma.billingPeriod.findFirst({ where: { workspaceId, idempotencyKey } }) as Promise<IBillingPeriod | null>;
  }

  async findAll(workspaceId: string, filter: BillingFilterDto): Promise<[IBillingPeriod[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.subscriptionId) where.subscriptionId = filter.subscriptionId;
    if (filter.status) where.status = filter.status;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.billingPeriod.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.billingPeriod.count({ where: where as any }),
    ]);

    return [data as IBillingPeriod[], total];
  }

  async update(id: string, data: Partial<IBillingPeriod>): Promise<IBillingPeriod> {
    return this.prisma.billingPeriod.update({ where: { id }, data: data as any }) as Promise<IBillingPeriod>;
  }

  async findDueForOverdue(before: Date): Promise<IBillingPeriod[]> {
    return this.prisma.billingPeriod.findMany({
      where: {
        status: { in: [BillingPeriodStatus.BILLED, BillingPeriodStatus.PARTIALLY_PAID] as any },
        dueDate: { lte: before },
      },
    }) as Promise<IBillingPeriod[]>;
  }

  // ── Items ────────────────────────────────────────────────────────

  async createItem(data: Partial<IBillingItem>): Promise<IBillingItem> {
    return this.prisma.billingItem.create({ data: data as any }) as Promise<IBillingItem>;
  }

  async createItems(items: Partial<IBillingItem>[]): Promise<void> {
    if (items.length === 0) return;
    await this.prisma.billingItem.createMany({ data: items as any });
  }

  async findItems(billingPeriodId: string): Promise<IBillingItem[]> {
    return this.prisma.billingItem.findMany({ where: { billingPeriodId }, orderBy: { createdAt: 'asc' } }) as Promise<IBillingItem[]>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<IBillingHistory>): Promise<IBillingHistory> {
    return this.prisma.billingHistory.create({ data: data as any }) as Promise<IBillingHistory>;
  }

  async findHistory(billingPeriodId: string): Promise<IBillingHistory[]> {
    return this.prisma.billingHistory.findMany({ where: { billingPeriodId }, orderBy: { createdAt: 'asc' } }) as Promise<IBillingHistory[]>;
  }

  // ── Billing rules ────────────────────────────────────────────────

  async createRule(data: Partial<IBillingRule>): Promise<IBillingRule> {
    return this.prisma.billingRule.create({ data: data as any }) as Promise<IBillingRule>;
  }

  async findRuleById(id: string): Promise<IBillingRule | null> {
    return this.prisma.billingRule.findFirst({ where: { id } }) as Promise<IBillingRule | null>;
  }

  async updateRule(id: string, data: Partial<IBillingRule>): Promise<IBillingRule> {
    return this.prisma.billingRule.update({ where: { id }, data: data as any }) as Promise<IBillingRule>;
  }

  async findAllRules(workspaceId?: string): Promise<IBillingRule[]> {
    return this.prisma.billingRule.findMany({
      where: workspaceId ? { OR: [{ workspaceId }, { workspaceId: null }] } : {},
      orderBy: { priority: 'desc' },
    }) as Promise<IBillingRule[]>;
  }

  /** All active rules whose scope key matches any of the caller's resolution candidates — the service picks the highest-priority match. */
  async findActiveRulesForResolution(scopeKeys: string[]): Promise<IBillingRule[]> {
    return this.prisma.billingRule.findMany({
      where: { scopeKey: { in: scopeKeys }, isActive: true },
      orderBy: { priority: 'desc' },
    }) as Promise<IBillingRule[]>;
  }
}
