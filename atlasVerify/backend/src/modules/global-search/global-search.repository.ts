import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IGlobalSavedSearch } from './interfaces';

@Injectable()
export class GlobalSearchRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createSavedSearch(data: Partial<IGlobalSavedSearch>): Promise<IGlobalSavedSearch> {
    return this.prisma.globalSavedSearch.create({ data: data as any }) as Promise<IGlobalSavedSearch>;
  }

  async findSavedSearchById(id: string): Promise<IGlobalSavedSearch | null> {
    return this.prisma.globalSavedSearch.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IGlobalSavedSearch | null>;
  }

  async listSavedSearches(workspaceId: string, userId: string): Promise<IGlobalSavedSearch[]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      OR: [{ userId }, { isShared: true }],
    };
    return this.prisma.globalSavedSearch.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
    }) as Promise<IGlobalSavedSearch[]>;
  }

  async updateSavedSearch(id: string, data: Partial<IGlobalSavedSearch>): Promise<IGlobalSavedSearch> {
    return this.prisma.globalSavedSearch.update({
      where: { id },
      data: data as any,
    }) as Promise<IGlobalSavedSearch>;
  }

  async deleteSavedSearch(id: string): Promise<void> {
    await this.prisma.globalSavedSearch.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
