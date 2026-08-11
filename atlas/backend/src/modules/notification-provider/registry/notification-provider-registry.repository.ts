import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { INotificationProviderRegistryEntry } from '../interfaces';
import { RegistryEntryFilterDto } from '../dto';

@Injectable()
export class NotificationProviderRegistryRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    data: Partial<INotificationProviderRegistryEntry>,
  ): Promise<INotificationProviderRegistryEntry> {
    return this.prisma.notificationProviderRegistryEntry.create({
      data: data as any,
    }) as Promise<INotificationProviderRegistryEntry>;
  }

  async update(
    id: string,
    data: Partial<INotificationProviderRegistryEntry>,
  ): Promise<INotificationProviderRegistryEntry> {
    return this.prisma.notificationProviderRegistryEntry.update({
      where: { id },
      data: data as any,
    }) as Promise<INotificationProviderRegistryEntry>;
  }

  async findById(id: string): Promise<INotificationProviderRegistryEntry | null> {
    return this.prisma.notificationProviderRegistryEntry.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<INotificationProviderRegistryEntry | null>;
  }

  async findConflicting(
    providerKey: string,
    workspaceId?: string,
  ): Promise<INotificationProviderRegistryEntry | null> {
    return this.prisma.notificationProviderRegistryEntry.findFirst({
      where: {
        providerKey,
        workspaceId: workspaceId ?? null,
        deletedAt: null,
        status: { not: 'ARCHIVED' },
      },
    }) as Promise<INotificationProviderRegistryEntry | null>;
  }

  async findAll(
    filter: RegistryEntryFilterDto,
  ): Promise<[INotificationProviderRegistryEntry[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [{ workspaceId: null }, { workspaceId: filter.workspaceId }],
      deletedAt: null,
    };
    if (filter.channel) where.channel = filter.channel;
    if (filter.status) where.status = filter.status;

    const [data, total] = await Promise.all([
      this.prisma.notificationProviderRegistryEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ workspaceId: 'desc' }, { isDefault: 'desc' }, { priority: 'asc' }],
      }),
      this.prisma.notificationProviderRegistryEntry.count({ where }),
    ]);

    return [data as INotificationProviderRegistryEntry[], total];
  }

  async findActiveByChannel(
    workspaceId: string,
    channel: string,
  ): Promise<INotificationProviderRegistryEntry[]> {
    return this.prisma.notificationProviderRegistryEntry.findMany({
      where: {
        channel,
        status: 'ACTIVE',
        deletedAt: null,
        OR: [{ workspaceId: null }, { workspaceId }],
      },
      orderBy: [{ workspaceId: 'desc' }, { isDefault: 'desc' }, { priority: 'asc' }],
    }) as Promise<INotificationProviderRegistryEntry[]>;
  }
}
