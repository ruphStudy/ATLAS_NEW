import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IPushDeviceToken, PushPlatform } from './push-device-token.interfaces';
import { DeviceTokenFilterDto } from './push-device-token.dto';

@Injectable()
export class PushDeviceTokenRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async upsert(data: Partial<IPushDeviceToken>): Promise<IPushDeviceToken> {
    return this.prisma.pushDeviceToken.upsert({
      where: {
        workspaceId_token: {
          workspaceId: data.workspaceId as string,
          token: data.token as string,
        } as any,
      },
      create: data as any,
      update: {
        userId: data.userId,
        platform: data.platform,
        providerKey: data.providerKey,
        topics: data.topics,
        status: data.status,
        lastSeenAt: data.lastSeenAt,
        metadata: data.metadata,
      } as any,
    }) as Promise<IPushDeviceToken>;
  }

  async findById(id: string, workspaceId: string): Promise<IPushDeviceToken | null> {
    return this.prisma.pushDeviceToken.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IPushDeviceToken | null>;
  }

  async findByToken(workspaceId: string, token: string): Promise<IPushDeviceToken | null> {
    return this.prisma.pushDeviceToken.findFirst({
      where: { workspaceId, token, deletedAt: null },
    }) as Promise<IPushDeviceToken | null>;
  }

  async findActiveByUserId(workspaceId: string, userId: string): Promise<IPushDeviceToken[]> {
    return this.prisma.pushDeviceToken.findMany({
      where: { workspaceId, userId, status: 'ACTIVE', deletedAt: null },
    }) as Promise<IPushDeviceToken[]>;
  }

  async findActiveByTopic(workspaceId: string, topic: string): Promise<IPushDeviceToken[]> {
    return this.prisma.pushDeviceToken.findMany({
      where: { workspaceId, topics: { has: topic }, status: 'ACTIVE', deletedAt: null },
    }) as Promise<IPushDeviceToken[]>;
  }

  async findActiveByPlatform(workspaceId: string, platform: PushPlatform): Promise<IPushDeviceToken[]> {
    return this.prisma.pushDeviceToken.findMany({
      where: { workspaceId, platform, status: 'ACTIVE', deletedAt: null },
    }) as Promise<IPushDeviceToken[]>;
  }

  async findAll(filter: DeviceTokenFilterDto): Promise<[IPushDeviceToken[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId, deletedAt: null };
    if (filter.userId) where.userId = filter.userId;
    if (filter.platform) where.platform = filter.platform;
    if (filter.status) where.status = filter.status;
    if (filter.topic) where.topics = { has: filter.topic };

    const [data, total] = await Promise.all([
      this.prisma.pushDeviceToken.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pushDeviceToken.count({ where }),
    ]);

    return [data as IPushDeviceToken[], total];
  }

  async update(id: string, data: Partial<IPushDeviceToken>): Promise<IPushDeviceToken> {
    return this.prisma.pushDeviceToken.update({
      where: { id },
      data: data as any,
    }) as Promise<IPushDeviceToken>;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.pushDeviceToken.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
