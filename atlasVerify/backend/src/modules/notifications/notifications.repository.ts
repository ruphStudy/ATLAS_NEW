import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  INotification,
  INotificationPreference,
  NotificationChannel,
  NotificationStatus,
} from './interfaces';
import { NotificationFilterDto } from './dto';

@Injectable()
export class NotificationsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Recipient resolution ─────────────────────────────────────────

  async findUserIdsByWorkspace(workspaceId: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async findUserIdsByRole(workspaceId: string, role: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { workspaceId, role: role as any, deletedAt: null },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  // ── Notifications ────────────────────────────────────────────────

  async findExistingByDedupeKey(
    recipientUserId: string,
    dedupeKey: string,
  ): Promise<INotification | null> {
    return this.prisma.notification.findFirst({
      where: { recipientUserId, dedupeKey },
    }) as Promise<INotification | null>;
  }

  async createNotification(
    data: Partial<INotification>,
  ): Promise<INotification> {
    return this.prisma.notification.create({
      data: data as any,
    }) as Promise<INotification>;
  }

  async findById(
    id: string,
    workspaceId: string,
    recipientUserId: string,
  ): Promise<INotification | null> {
    return this.prisma.notification.findFirst({
      where: { id, workspaceId, recipientUserId, deletedAt: null },
    }) as Promise<INotification | null>;
  }

  async findAll(
    workspaceId: string,
    recipientUserId: string,
    filter: NotificationFilterDto,
  ): Promise<[INotification[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId, recipientUserId, deletedAt: null };
    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.priority) where.priority = filter.priority;
    if (filter.category) where.category = filter.category;
    if (filter.sourceModule) where.sourceModule = filter.sourceModule;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
    }

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { message: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const orderBy =
      filter.sortBy === 'priority'
        ? { priority: filter.sortOrder ?? 'desc' }
        : { createdAt: filter.sortOrder ?? 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderBy as any,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return [data as INotification[], total];
  }

  async countUnread(
    workspaceId: string,
    recipientUserId: string,
  ): Promise<number> {
    return this.prisma.notification.count({
      where: {
        workspaceId,
        recipientUserId,
        status: NotificationStatus.UNREAD,
        deletedAt: null,
      },
    });
  }

  async expireDueNotifications(
    workspaceId: string,
    recipientUserId: string,
    now: Date,
  ): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        workspaceId,
        recipientUserId,
        deletedAt: null,
        expiresAt: { lte: now },
        status: { in: [NotificationStatus.UNREAD, NotificationStatus.READ] },
      },
      data: { status: NotificationStatus.EXPIRED },
    });
    return result.count;
  }

  async updateStatus(
    id: string,
    data: Partial<INotification>,
  ): Promise<INotification> {
    return this.prisma.notification.update({
      where: { id },
      data: data as any,
    }) as Promise<INotification>;
  }

  async markAllRead(
    workspaceId: string,
    recipientUserId: string,
  ): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        workspaceId,
        recipientUserId,
        status: NotificationStatus.UNREAD,
        deletedAt: null,
      },
      data: { status: NotificationStatus.READ, readAt: new Date() },
    });
    return result.count;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async purgeOlderThan(
    workspaceId: string,
    cutoff: Date,
  ): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        workspaceId,
        createdAt: { lt: cutoff },
        status: {
          in: [
            NotificationStatus.ARCHIVED,
            NotificationStatus.DISMISSED,
            NotificationStatus.EXPIRED,
          ],
        },
      },
    });
    return result.count;
  }

  // ── Preferences ──────────────────────────────────────────────────

  async upsertPreference(params: {
    userId: string;
    workspaceId: string;
    category: string | null;
    channel: NotificationChannel;
    minPriority?: string | null;
    enabled: boolean;
    metadata: unknown;
  }): Promise<INotificationPreference> {
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_category_channel: {
          userId: params.userId,
          category: params.category,
          channel: params.channel,
        } as any,
      },
      create: {
        userId: params.userId,
        workspaceId: params.workspaceId,
        category: params.category,
        channel: params.channel,
        minPriority: params.minPriority as any,
        enabled: params.enabled,
        metadata: params.metadata as any,
      },
      update: {
        minPriority: params.minPriority as any,
        enabled: params.enabled,
        metadata: params.metadata as any,
      },
    }) as Promise<INotificationPreference>;
  }

  async updatePreferenceById(
    id: string,
    data: Partial<INotificationPreference>,
  ): Promise<INotificationPreference> {
    return this.prisma.notificationPreference.update({
      where: { id },
      data: data as any,
    }) as Promise<INotificationPreference>;
  }

  async findPreferenceById(
    id: string,
    userId: string,
  ): Promise<INotificationPreference | null> {
    return this.prisma.notificationPreference.findFirst({
      where: { id, userId },
    }) as Promise<INotificationPreference | null>;
  }

  async findPreferencesByUser(
    userId: string,
    workspaceId: string,
    channel?: NotificationChannel,
  ): Promise<INotificationPreference[]> {
    const where: any = { userId, workspaceId };
    if (channel) where.channel = channel;

    return this.prisma.notificationPreference.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    }) as Promise<INotificationPreference[]>;
  }

  async findApplicablePreference(
    userId: string,
    category: string | undefined,
    channel: NotificationChannel,
  ): Promise<INotificationPreference | null> {
    if (category) {
      const specific = await this.prisma.notificationPreference.findFirst({
        where: { userId, category, channel },
      });
      if (specific) return specific as INotificationPreference;
    }

    return this.prisma.notificationPreference.findFirst({
      where: { userId, category: null, channel },
    }) as Promise<INotificationPreference | null>;
  }

  async deletePreference(id: string): Promise<void> {
    await this.prisma.notificationPreference.delete({ where: { id } });
  }
}
