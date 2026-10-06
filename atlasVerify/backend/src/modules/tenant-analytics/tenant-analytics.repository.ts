import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ITenantHealthSnapshot } from './interfaces';
import { TenantSegmentFilterDto } from './dto';

@Injectable()
export class TenantAnalyticsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findSnapshot(workspaceId: string): Promise<ITenantHealthSnapshot | null> {
    return this.prisma.tenantHealthSnapshot.findFirst({ where: { workspaceId } }) as Promise<ITenantHealthSnapshot | null>;
  }

  async createSnapshot(data: Partial<ITenantHealthSnapshot>): Promise<ITenantHealthSnapshot> {
    return this.prisma.tenantHealthSnapshot.create({ data: data as any }) as Promise<ITenantHealthSnapshot>;
  }

  async updateSnapshot(id: string, data: Partial<ITenantHealthSnapshot>): Promise<ITenantHealthSnapshot> {
    return this.prisma.tenantHealthSnapshot.update({ where: { id }, data: data as any }) as Promise<ITenantHealthSnapshot>;
  }

  async findAllSnapshots(filter: TenantSegmentFilterDto): Promise<[ITenantHealthSnapshot[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.riskLevel) where.riskLevel = filter.riskLevel;
    if (filter.segment) where.segments = { has: filter.segment };

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.tenantHealthSnapshot.findMany({ where: where as any, skip, take: limit, orderBy: { healthScore: 'asc' } }),
      this.prisma.tenantHealthSnapshot.count({ where: where as any }),
    ]);

    return [data as ITenantHealthSnapshot[], total];
  }

  async findAllSnapshotsUnpaged(): Promise<ITenantHealthSnapshot[]> {
    return this.prisma.tenantHealthSnapshot.findMany() as Promise<ITenantHealthSnapshot[]>;
  }
}
