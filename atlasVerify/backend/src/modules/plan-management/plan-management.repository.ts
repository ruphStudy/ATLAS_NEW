import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IPlan, IPlanHistory, PlanStatus } from './interfaces';
import { PlanFilterDto } from './dto';

@Injectable()
export class PlanManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Plans ────────────────────────────────────────────────────────

  async create(data: Partial<IPlan>): Promise<IPlan> {
    return this.prisma.plan.create({ data: data as any }) as Promise<IPlan>;
  }

  async findById(id: string): Promise<IPlan | null> {
    return this.prisma.plan.findFirst({ where: { id } }) as Promise<IPlan | null>;
  }

  async findByCodeAndVersion(code: string, version: number): Promise<IPlan | null> {
    return this.prisma.plan.findFirst({ where: { code, version } }) as Promise<IPlan | null>;
  }

  async findLatestByCode(code: string): Promise<IPlan | null> {
    return this.prisma.plan.findFirst({ where: { code }, orderBy: { version: 'desc' } }) as Promise<IPlan | null>;
  }

  async findEffectiveByCode(code: string, atDate: Date): Promise<IPlan | null> {
    return this.prisma.plan.findFirst({
      where: { code, status: PlanStatus.PUBLISHED, effectiveAt: { lte: atDate } },
      orderBy: [{ effectiveAt: 'desc' }, { version: 'desc' }],
    }) as Promise<IPlan | null>;
  }

  async findAllVersionsByCode(code: string): Promise<IPlan[]> {
    return this.prisma.plan.findMany({ where: { code }, orderBy: { version: 'asc' } }) as Promise<IPlan[]>;
  }

  async findPublishedByCode(code: string): Promise<IPlan[]> {
    return this.prisma.plan.findMany({ where: { code, status: PlanStatus.PUBLISHED } }) as Promise<IPlan[]>;
  }

  async findAll(filter: PlanFilterDto): Promise<[IPlan[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.code) where.code = filter.code;
    if (filter.status) where.status = filter.status;
    if (filter.type) where.type = filter.type;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { code: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.plan.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.plan.count({ where: where as any }),
    ]);

    return [data as IPlan[], total];
  }

  async update(id: string, data: Partial<IPlan>): Promise<IPlan> {
    return this.prisma.plan.update({ where: { id }, data: data as any }) as Promise<IPlan>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<IPlanHistory>): Promise<IPlanHistory> {
    return this.prisma.planHistory.create({ data: data as any }) as Promise<IPlanHistory>;
  }

  async findHistory(planId: string): Promise<IPlanHistory[]> {
    return this.prisma.planHistory.findMany({ where: { planId }, orderBy: { createdAt: 'asc' } }) as Promise<IPlanHistory[]>;
  }
}
