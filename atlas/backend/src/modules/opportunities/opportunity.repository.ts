import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { IOpportunity, IOpportunityListResult } from './interfaces';
import type { OpportunityFilterDto } from './dto';

/**
 * OpportunityRepository
 *
 * Rule: Data access only. No business logic.
 *       All queries are scoped to a workspaceId for tenant isolation.
 */
@Injectable()
export class OpportunityRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: Record<string, unknown>): Promise<IOpportunity> {
    return (this.prisma as unknown as Record<string, unknown>)['opportunity'].create({
      data,
    }) as Promise<IOpportunity>;
  }

  async findById(id: string, workspaceId: string): Promise<IOpportunity | null> {
    return (this.prisma as unknown as Record<string, unknown>)['opportunity'].findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<IOpportunity | null>;
  }

  async findAll(
    workspaceId: string,
    filter: OpportunityFilterDto,
  ): Promise<[IOpportunity[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.status !== undefined && { status: filter.status }),
      ...(filter.marketplace !== undefined && { marketplace: filter.marketplace }),
      ...(filter.keyword !== undefined && {
        keyword: { contains: filter.keyword, mode: 'insensitive' },
      }),
      ...((filter.minFinalScore !== undefined || filter.maxFinalScore !== undefined) && {
        finalScore: {
          ...(filter.minFinalScore !== undefined && { gte: filter.minFinalScore }),
          ...(filter.maxFinalScore !== undefined && { lte: filter.maxFinalScore }),
        },
      }),
    };

    const orderBy = filter.sortBy
      ? { [filter.sortBy]: filter.sortOrder ?? 'desc' }
      : { createdAt: 'desc' as const };

    const model = (this.prisma as unknown as Record<string, unknown>)['opportunity'];

    const [items, total] = await Promise.all([
      (model as Record<string, unknown>)['findMany']({
        where,
        skip: filter.skip,
        take: filter.limit,
        orderBy,
      }) as Promise<IOpportunity[]>,
      (model as Record<string, unknown>)['count']({ where }) as Promise<number>,
    ]);

    return [items, total];
  }

  async update(id: string, data: Record<string, unknown>): Promise<IOpportunity> {
    return (this.prisma as unknown as Record<string, unknown>)['opportunity'].update({
      where: { id },
      data,
    }) as Promise<IOpportunity>;
  }

  async softDelete(id: string): Promise<void> {
    await (this.prisma as unknown as Record<string, unknown>)['opportunity'].update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
