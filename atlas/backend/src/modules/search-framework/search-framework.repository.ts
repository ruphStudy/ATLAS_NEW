import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ISearchEntityRegistration, ISearchQueryLog } from './interfaces';

@Injectable()
export class SearchFrameworkRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Entity registry ──────────────────────────────────────────────

  async createRegistration(data: Partial<ISearchEntityRegistration>): Promise<ISearchEntityRegistration> {
    return this.prisma.searchEntityRegistration.create({
      data: data as any,
    }) as Promise<ISearchEntityRegistration>;
  }

  async findRegistrationByKey(key: string): Promise<ISearchEntityRegistration | null> {
    return this.prisma.searchEntityRegistration.findUnique({
      where: { key },
    }) as Promise<ISearchEntityRegistration | null>;
  }

  async findRegistrationByEntityType(entityType: string): Promise<ISearchEntityRegistration | null> {
    return this.prisma.searchEntityRegistration.findFirst({
      where: { entityType },
    }) as Promise<ISearchEntityRegistration | null>;
  }

  async listRegistrations(activeOnly = true): Promise<ISearchEntityRegistration[]> {
    return this.prisma.searchEntityRegistration.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { displayName: 'asc' },
    }) as Promise<ISearchEntityRegistration[]>;
  }

  async updateRegistration(id: string, data: Partial<ISearchEntityRegistration>): Promise<ISearchEntityRegistration> {
    return this.prisma.searchEntityRegistration.update({
      where: { id },
      data: data as any,
    }) as Promise<ISearchEntityRegistration>;
  }

  async deleteRegistration(id: string): Promise<void> {
    await this.prisma.searchEntityRegistration.delete({ where: { id } });
  }

  // ── Query logs ───────────────────────────────────────────────────

  async createQueryLog(data: Partial<ISearchQueryLog>): Promise<ISearchQueryLog> {
    return this.prisma.searchQueryLog.create({ data: data as any }) as Promise<ISearchQueryLog>;
  }

  async listQueryLogs(workspaceId: string, userId?: string, limit = 50): Promise<ISearchQueryLog[]> {
    const where: Record<string, unknown> = { workspaceId };
    if (userId) where.userId = userId;
    return this.prisma.searchQueryLog.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<ISearchQueryLog[]>;
  }
}
