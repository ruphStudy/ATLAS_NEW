import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ENTERPRISE_HEALTH_CONSTANTS } from './constants';
import { IEnterpriseHealthIncident, IEnterpriseHealthIncidentFilterOptions, IEnterpriseHealthSnapshot } from './interfaces';

@Injectable()
export class EnterpriseHealthRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Snapshots ─────────────────────────────────────────────────

  async createSnapshot(data: Partial<IEnterpriseHealthSnapshot>): Promise<IEnterpriseHealthSnapshot> {
    return this.prisma.enterpriseHealthSnapshot.create({ data: data as any }) as Promise<IEnterpriseHealthSnapshot>;
  }

  /** Most recent snapshot for a scope — used to detect level transitions (degraded/recovered) before writing the next one. */
  async findLatestSnapshot(organizationId: string | null, scope: string, scopeRef: string | null): Promise<IEnterpriseHealthSnapshot | null> {
    return this.prisma.enterpriseHealthSnapshot.findFirst({
      where: { organizationId, scope: scope as any, scopeRef },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IEnterpriseHealthSnapshot | null>;
  }

  async findSnapshotHistory(organizationId: string, scope?: string, scopeRef?: string, limit = 50): Promise<IEnterpriseHealthSnapshot[]> {
    const where: Record<string, unknown> = { organizationId };
    if (scope) where.scope = scope;
    if (scopeRef) where.scopeRef = scopeRef;
    return this.prisma.enterpriseHealthSnapshot.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<IEnterpriseHealthSnapshot[]>;
  }

  // ── Incidents ─────────────────────────────────────────────────

  async createIncident(data: Partial<IEnterpriseHealthIncident>): Promise<IEnterpriseHealthIncident> {
    return this.prisma.enterpriseHealthIncident.create({ data: data as any }) as Promise<IEnterpriseHealthIncident>;
  }

  async findIncidentById(id: string): Promise<IEnterpriseHealthIncident | null> {
    return this.prisma.enterpriseHealthIncident.findFirst({ where: { id } }) as Promise<IEnterpriseHealthIncident | null>;
  }

  /** Dedup guard — avoids re-raising a second OPEN incident for the same organization/scope while one is already unresolved. */
  async findOpenIncident(organizationId: string, scope: string, scopeRef: string | null): Promise<IEnterpriseHealthIncident | null> {
    return this.prisma.enterpriseHealthIncident.findFirst({
      where: { organizationId, scope: scope as any, scopeRef, status: { not: 'RESOLVED' } },
    }) as Promise<IEnterpriseHealthIncident | null>;
  }

  async updateIncident(id: string, data: Partial<IEnterpriseHealthIncident>): Promise<IEnterpriseHealthIncident> {
    return this.prisma.enterpriseHealthIncident.update({ where: { id }, data: data as any }) as Promise<IEnterpriseHealthIncident>;
  }

  async findAllIncidents(filter: IEnterpriseHealthIncidentFilterOptions): Promise<[IEnterpriseHealthIncident[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.organizationId) where.organizationId = filter.organizationId;
    if (filter.scope) where.scope = filter.scope;
    if (filter.scopeRef) where.scopeRef = filter.scopeRef;
    if (filter.status) where.status = filter.status;
    if (filter.severity) where.severity = filter.severity;

    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? ENTERPRISE_HEALTH_CONSTANTS.DEFAULT_PAGE_SIZE, ENTERPRISE_HEALTH_CONSTANTS.MAX_PAGE_SIZE);
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'openedAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.enterpriseHealthIncident.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.enterpriseHealthIncident.count({ where: where as any }),
    ]);

    return [data as IEnterpriseHealthIncident[], total];
  }

  async countOpenIncidents(organizationId: string): Promise<number> {
    return this.prisma.enterpriseHealthIncident.count({ where: { organizationId, status: { not: 'RESOLVED' } } });
  }

  async countOpenIncidentsForScope(organizationId: string, scope: string, scopeRef: string | null): Promise<number> {
    return this.prisma.enterpriseHealthIncident.count({
      where: { organizationId, scope: scope as any, scopeRef, status: { not: 'RESOLVED' } },
    });
  }
}
