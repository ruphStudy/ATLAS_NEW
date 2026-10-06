import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ISaasHealthCheckLog, ISaasHealthIncident, ISaasHealthSnapshot, SaasHealthIncidentStatus } from './interfaces';
import { SaasHealthIncidentFilterDto, SaasHealthCheckLogFilterDto } from './dto';

@Injectable()
export class SaasMonitoringRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Snapshots ────────────────────────────────────────────────────

  async findSnapshot(workspaceId: string, module: string): Promise<ISaasHealthSnapshot | null> {
    return this.prisma.saasHealthSnapshot.findFirst({ where: { workspaceId, module } }) as Promise<ISaasHealthSnapshot | null>;
  }

  async findSnapshotsByWorkspace(workspaceId: string): Promise<ISaasHealthSnapshot[]> {
    return this.prisma.saasHealthSnapshot.findMany({ where: { workspaceId } }) as unknown as Promise<ISaasHealthSnapshot[]>;
  }

  /** Every snapshot for one module across ALL tenants — the raw input to the platform-wide module breakdown. */
  async findSnapshotsByModuleAcrossWorkspaces(module: string): Promise<ISaasHealthSnapshot[]> {
    return this.prisma.saasHealthSnapshot.findMany({ where: { module } }) as unknown as Promise<ISaasHealthSnapshot[]>;
  }

  /** Every workspace this module has ever checked — used to sweep all known workspaces on a scheduled run/platform summary, without depending on the Workspace module. */
  async findDistinctWorkspaceIds(): Promise<string[]> {
    const rows = await this.prisma.saasHealthSnapshot.findMany({
      distinct: ['workspaceId'],
      select: { workspaceId: true },
    });
    return rows.map((r) => r.workspaceId);
  }

  async upsertSnapshot(workspaceId: string, module: string, data: Partial<ISaasHealthSnapshot>): Promise<ISaasHealthSnapshot> {
    return this.prisma.saasHealthSnapshot.upsert({
      where: { workspaceId_module: { workspaceId, module } },
      create: { workspaceId, module, ...data } as any,
      update: data as any,
    }) as unknown as Promise<ISaasHealthSnapshot>;
  }

  // ── Incidents ────────────────────────────────────────────────────

  async createIncident(data: Partial<ISaasHealthIncident>): Promise<ISaasHealthIncident> {
    return this.prisma.saasHealthIncident.create({ data: data as any }) as unknown as Promise<ISaasHealthIncident>;
  }

  async findOpenIncident(workspaceId: string, module: string): Promise<ISaasHealthIncident | null> {
    return this.prisma.saasHealthIncident.findFirst({
      where: { workspaceId, module, status: SaasHealthIncidentStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    }) as Promise<ISaasHealthIncident | null>;
  }

  async updateIncident(id: string, data: Partial<ISaasHealthIncident>): Promise<ISaasHealthIncident> {
    return this.prisma.saasHealthIncident.update({ where: { id }, data: data as any }) as unknown as Promise<ISaasHealthIncident>;
  }

  async findIncidentById(id: string): Promise<ISaasHealthIncident | null> {
    return this.prisma.saasHealthIncident.findFirst({ where: { id } }) as Promise<ISaasHealthIncident | null>;
  }

  /** `workspaceId` optional — omitted for the platform-wide, cross-tenant incident view (`PlatformAdminGuard`-gated); always supplied for the tenant-scoped view. */
  async findIncidents(workspaceId: string | undefined, filter: SaasHealthIncidentFilterDto): Promise<[ISaasHealthIncident[], number]> {
    const where: Record<string, unknown> = {};
    if (workspaceId) where.workspaceId = workspaceId;
    if (filter.module) where.module = filter.module;
    if (filter.status) where.status = filter.status;
    if (filter.severity) where.severity = filter.severity;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.saasHealthIncident.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { openedAt: 'desc' },
      }),
      this.prisma.saasHealthIncident.count({ where: where as any }),
    ]);

    return [data as unknown as ISaasHealthIncident[], total];
  }

  // ── Check logs ───────────────────────────────────────────────────

  async createCheckLog(data: Partial<ISaasHealthCheckLog>): Promise<ISaasHealthCheckLog> {
    return this.prisma.saasHealthCheckLog.create({ data: data as any }) as unknown as Promise<ISaasHealthCheckLog>;
  }

  /** `workspaceId` optional — omitted for the platform-wide, cross-tenant check-log view (`PlatformAdminGuard`-gated); always supplied for the tenant-scoped view. */
  async findCheckLogs(workspaceId: string | undefined, filter: SaasHealthCheckLogFilterDto): Promise<[ISaasHealthCheckLog[], number]> {
    const where: Record<string, unknown> = {};
    if (workspaceId) where.workspaceId = workspaceId;
    if (filter.module) where.module = filter.module;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.saasHealthCheckLog.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { checkedAt: 'desc' },
      }),
      this.prisma.saasHealthCheckLog.count({ where: where as any }),
    ]);

    return [data as unknown as ISaasHealthCheckLog[], total];
  }
}
