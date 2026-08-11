import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  INotificationProviderConfig,
  INotificationProviderConfigHistory,
} from '../interfaces';
import { ProviderConfigFilterDto } from '../dto';

@Injectable()
export class NotificationProviderConfigurationRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    data: Partial<INotificationProviderConfig>,
  ): Promise<INotificationProviderConfig> {
    return this.prisma.notificationProviderConfig.create({
      data: data as any,
    }) as Promise<INotificationProviderConfig>;
  }

  async update(
    id: string,
    data: Partial<INotificationProviderConfig>,
  ): Promise<INotificationProviderConfig> {
    return this.prisma.notificationProviderConfig.update({
      where: { id },
      data: data as any,
    }) as Promise<INotificationProviderConfig>;
  }

  async findById(id: string): Promise<INotificationProviderConfig | null> {
    return this.prisma.notificationProviderConfig.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<INotificationProviderConfig | null>;
  }

  async findConflicting(
    workspaceId: string,
    providerKey: string,
    channel: string,
  ): Promise<INotificationProviderConfig | null> {
    return this.prisma.notificationProviderConfig.findFirst({
      where: { workspaceId, providerKey, channel, deletedAt: null, status: { not: 'ARCHIVED' } },
    }) as Promise<INotificationProviderConfig | null>;
  }

  async findAll(
    filter: ProviderConfigFilterDto,
  ): Promise<[INotificationProviderConfig[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId, deletedAt: null };
    if (filter.channel) where.channel = filter.channel;
    if (filter.providerKey) where.providerKey = filter.providerKey;
    if (filter.status) where.status = filter.status;

    const [data, total] = await Promise.all([
      this.prisma.notificationProviderConfig.findMany({
        where,
        skip,
        take: limit,
        orderBy: { priority: 'asc' },
      }),
      this.prisma.notificationProviderConfig.count({ where }),
    ]);

    return [data as INotificationProviderConfig[], total];
  }

  /** Enabled, effective-dated configs for a workspace+channel, most-specific/highest-priority first. */
  async findApplicable(
    workspaceId: string,
    channel: string,
    preferredProviderKey?: string,
    at: Date = new Date(),
  ): Promise<INotificationProviderConfig[]> {
    const where: any = {
      workspaceId,
      channel,
      status: 'ACTIVE',
      deletedAt: null,
      AND: [
        { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: at } }] },
        { OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }] },
      ],
    };

    if (preferredProviderKey) where.providerKey = preferredProviderKey;

    return this.prisma.notificationProviderConfig.findMany({
      where,
      orderBy: { priority: 'asc' },
    }) as Promise<INotificationProviderConfig[]>;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.notificationProviderConfig.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  async getNextVersion(configId: string): Promise<number> {
    const latest = await this.prisma.notificationProviderConfigHistory.findFirst({
      where: { configId },
      orderBy: { version: 'desc' },
    });
    return (latest?.version ?? 0) + 1;
  }

  async createHistory(
    data: Partial<INotificationProviderConfigHistory>,
  ): Promise<INotificationProviderConfigHistory> {
    return this.prisma.notificationProviderConfigHistory.create({
      data: data as any,
    }) as Promise<INotificationProviderConfigHistory>;
  }

  async findHistory(configId: string): Promise<INotificationProviderConfigHistory[]> {
    return this.prisma.notificationProviderConfigHistory.findMany({
      where: { configId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<INotificationProviderConfigHistory[]>;
  }

  async findHistoryByVersion(
    configId: string,
    version: number,
  ): Promise<INotificationProviderConfigHistory | null> {
    return this.prisma.notificationProviderConfigHistory.findFirst({
      where: { configId, version },
    }) as Promise<INotificationProviderConfigHistory | null>;
  }
}
