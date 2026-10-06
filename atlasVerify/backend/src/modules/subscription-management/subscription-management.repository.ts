import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ISubscription, ISubscriptionHistory, SubscriptionStatus } from './interfaces';
import { SubscriptionFilterDto } from './dto';
import { NON_TERMINAL_SUBSCRIPTION_STATUSES } from './constants';

@Injectable()
export class SubscriptionManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Subscriptions ────────────────────────────────────────────────

  async create(data: Partial<ISubscription>): Promise<ISubscription> {
    return this.prisma.subscription.create({ data: data as any }) as Promise<ISubscription>;
  }

  async findById(id: string): Promise<ISubscription | null> {
    return this.prisma.subscription.findFirst({ where: { id } }) as Promise<ISubscription | null>;
  }

  async findNonTerminalByScopeKey(scopeKey: string): Promise<ISubscription | null> {
    return this.prisma.subscription.findFirst({
      where: { scopeKey, status: { in: NON_TERMINAL_SUBSCRIPTION_STATUSES as any } },
      orderBy: { createdAt: 'desc' },
    }) as Promise<ISubscription | null>;
  }

  async findLatestByScopeKey(scopeKey: string): Promise<ISubscription | null> {
    return this.prisma.subscription.findFirst({
      where: { scopeKey },
      orderBy: { createdAt: 'desc' },
    }) as Promise<ISubscription | null>;
  }

  async findAll(
    ownerFilter: { organizationId?: string; workspaceId?: string },
    filter: SubscriptionFilterDto,
  ): Promise<[ISubscription[], number]> {
    const where: Record<string, unknown> = { ...ownerFilter };
    if (filter.scope) where.scope = filter.scope;
    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.planKey) where.planKey = filter.planKey;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.subscription.count({ where: where as any }),
    ]);

    return [data as ISubscription[], total];
  }

  async update(id: string, data: Partial<ISubscription>): Promise<ISubscription> {
    return this.prisma.subscription.update({ where: { id }, data: data as any }) as Promise<ISubscription>;
  }

  // ── Scheduler-callable sweeps (no active scheduler wired — mirrors Approval Workflow / Task Management / Business Rules Engine's approach) ──

  async findDueForRenewalOrExpiry(before: Date): Promise<ISubscription[]> {
    return this.prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] as any },
        currentPeriodEnd: { lte: before },
      },
    }) as Promise<ISubscription[]>;
  }

  async findTrialsDueForExpiry(before: Date): Promise<ISubscription[]> {
    return this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.TRIAL, trialEndAt: { lte: before } },
    }) as Promise<ISubscription[]>;
  }

  async findPastDueBeyondGrace(before: Date): Promise<ISubscription[]> {
    return this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.PAST_DUE, gracePeriodEndsAt: { lte: before } },
    }) as Promise<ISubscription[]>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<ISubscriptionHistory>): Promise<ISubscriptionHistory> {
    return this.prisma.subscriptionHistory.create({ data: data as any }) as Promise<ISubscriptionHistory>;
  }

  async findHistory(subscriptionId: string): Promise<ISubscriptionHistory[]> {
    return this.prisma.subscriptionHistory.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<ISubscriptionHistory[]>;
  }
}
