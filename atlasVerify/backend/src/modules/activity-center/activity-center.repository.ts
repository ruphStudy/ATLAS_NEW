import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IActivityEntry, ActivityStatus } from './interfaces';
import { ActivityFilterDto } from './dto';

@Injectable()
export class ActivityCenterRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: Partial<IActivityEntry>): Promise<IActivityEntry> {
    return this.prisma.activityEntry.create({
      data: data as any,
    }) as Promise<IActivityEntry>;
  }

  async findExistingByDedupeKey(
    workspaceId: string,
    recipientUserId: string | undefined,
    dedupeKey: string,
  ): Promise<IActivityEntry | null> {
    return this.prisma.activityEntry.findFirst({
      where: { workspaceId, recipientUserId: recipientUserId ?? null, dedupeKey },
    }) as Promise<IActivityEntry | null>;
  }

  async findById(id: string, workspaceId: string): Promise<IActivityEntry | null> {
    return this.prisma.activityEntry.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IActivityEntry | null>;
  }

  async findPersonalFeed(
    workspaceId: string,
    recipientUserId: string,
    filter: ActivityFilterDto,
  ): Promise<[IActivityEntry[], number]> {
    return this.query({ ...this.buildWhere(filter, workspaceId), recipientUserId }, filter);
  }

  async findWorkspaceFeed(
    workspaceId: string,
    filter: ActivityFilterDto,
  ): Promise<[IActivityEntry[], number]> {
    return this.query(this.buildWhere(filter, workspaceId), filter);
  }

  async findEntityFeed(
    workspaceId: string,
    entityType: string,
    entityId: string,
    filter: ActivityFilterDto,
  ): Promise<[IActivityEntry[], number]> {
    return this.query({ ...this.buildWhere(filter, workspaceId), entityType, entityId }, filter);
  }

  async findTimeline(workspaceId: string, timelineId: string): Promise<IActivityEntry[]> {
    return this.prisma.activityEntry.findMany({
      where: { workspaceId, timelineId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    }) as Promise<IActivityEntry[]>;
  }

  async countUnreadPersonal(workspaceId: string, recipientUserId: string): Promise<number> {
    return this.prisma.activityEntry.count({
      where: { workspaceId, recipientUserId, status: ActivityStatus.UNREAD, deletedAt: null },
    });
  }

  async markAllReadPersonal(workspaceId: string, recipientUserId: string): Promise<number> {
    const result = await this.prisma.activityEntry.updateMany({
      where: { workspaceId, recipientUserId, status: ActivityStatus.UNREAD, deletedAt: null },
      data: { status: ActivityStatus.READ, readAt: new Date() },
    });
    return result.count;
  }

  async updateStatus(id: string, data: Partial<IActivityEntry>): Promise<IActivityEntry> {
    return this.prisma.activityEntry.update({
      where: { id },
      data: data as any,
    }) as Promise<IActivityEntry>;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.activityEntry.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async purgeOlderThan(workspaceId: string, cutoff: Date): Promise<number> {
    const result = await this.prisma.activityEntry.deleteMany({
      where: {
        workspaceId,
        createdAt: { lt: cutoff },
        status: { in: [ActivityStatus.ARCHIVED, ActivityStatus.DISMISSED] },
      },
    });
    return result.count;
  }

  private buildWhere(filter: ActivityFilterDto, workspaceId: string): Record<string, unknown> {
    const where: Record<string, unknown> = { workspaceId, deletedAt: null };

    if (filter.status) where.status = filter.status;
    if (filter.actorType) where.actorType = filter.actorType;
    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.sourceModule) where.sourceModule = filter.sourceModule;
    if (filter.action) where.action = filter.action;
    if (filter.outcome) where.outcome = filter.outcome;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.pinned !== undefined) where.pinned = filter.pinned;

    if (filter.startDate || filter.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filter.startDate) createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) createdAt.lte = new Date(filter.endDate);
      where.createdAt = createdAt;
    }

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async query(
    where: Record<string, unknown>,
    filter: ActivityFilterDto,
  ): Promise<[IActivityEntry[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.activityEntry.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: filter.sortOrder ?? 'desc' },
      }),
      this.prisma.activityEntry.count({ where: where as any }),
    ]);

    return [data as IActivityEntry[], total];
  }
}
