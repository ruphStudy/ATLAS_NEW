import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  INotificationProviderCredential,
  INotificationProviderCredentialHistory,
} from '../interfaces';
import { ProviderCredentialFilterDto } from '../dto';

@Injectable()
export class NotificationProviderCredentialRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    data: Partial<INotificationProviderCredential>,
  ): Promise<INotificationProviderCredential> {
    return this.prisma.notificationProviderCredential.create({
      data: data as any,
    }) as Promise<INotificationProviderCredential>;
  }

  async update(
    id: string,
    data: Partial<INotificationProviderCredential>,
  ): Promise<INotificationProviderCredential> {
    return this.prisma.notificationProviderCredential.update({
      where: { id },
      data: data as any,
    }) as Promise<INotificationProviderCredential>;
  }

  async findById(id: string): Promise<INotificationProviderCredential | null> {
    return this.prisma.notificationProviderCredential.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<INotificationProviderCredential | null>;
  }

  async findConflicting(
    workspaceId: string,
    providerKey: string,
    credentialSetName: string,
  ): Promise<INotificationProviderCredential | null> {
    return this.prisma.notificationProviderCredential.findFirst({
      where: { workspaceId, providerKey, credentialSetName, deletedAt: null },
    }) as Promise<INotificationProviderCredential | null>;
  }

  async findActiveForProvider(
    workspaceId: string,
    providerKey: string,
  ): Promise<INotificationProviderCredential | null> {
    return this.prisma.notificationProviderCredential.findFirst({
      where: { workspaceId, providerKey, status: 'ACTIVE', deletedAt: null },
      orderBy: { createdAt: 'desc' },
    }) as Promise<INotificationProviderCredential | null>;
  }

  async findAll(
    filter: ProviderCredentialFilterDto,
  ): Promise<[INotificationProviderCredential[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId, deletedAt: null };
    if (filter.providerKey) where.providerKey = filter.providerKey;
    if (filter.channel) where.channel = filter.channel;
    if (filter.status) where.status = filter.status;

    const [data, total] = await Promise.all([
      this.prisma.notificationProviderCredential.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notificationProviderCredential.count({ where }),
    ]);

    return [data as INotificationProviderCredential[], total];
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.notificationProviderCredential.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'REVOKED' },
    });
  }

  async getNextVersion(credentialId: string): Promise<number> {
    const latest = await this.prisma.notificationProviderCredentialHistory.findFirst({
      where: { credentialId },
      orderBy: { version: 'desc' },
    });
    return (latest?.version ?? 0) + 1;
  }

  async createHistory(
    data: Partial<INotificationProviderCredentialHistory>,
  ): Promise<INotificationProviderCredentialHistory> {
    return this.prisma.notificationProviderCredentialHistory.create({
      data: data as any,
    }) as Promise<INotificationProviderCredentialHistory>;
  }

  async findHistory(
    credentialId: string,
  ): Promise<INotificationProviderCredentialHistory[]> {
    return this.prisma.notificationProviderCredentialHistory.findMany({
      where: { credentialId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<INotificationProviderCredentialHistory[]>;
  }
}
