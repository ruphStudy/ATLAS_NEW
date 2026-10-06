import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IOperationsHealthCheckLog, IOperationsHealthIncident, IOperationsHealthSnapshot, OperationsHealthIncidentStatus } from './interfaces';
import { IncidentFilterDto, CheckLogFilterDto } from './dto';

@Injectable()
export class OperationsHealthRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Snapshots ────────────────────────────────────────────────────

  async findSnapshot(workspaceId: string, module: string): Promise<IOperationsHealthSnapshot | null> {
    return this.prisma.operationsHealthSnapshot.findFirst({ where: { workspaceId, module } }) as Promise<IOperationsHealthSnapshot | null>;
  }

  async findSnapshotsByWorkspace(workspaceId: string): Promise<IOperationsHealthSnapshot[]> {
    return this.prisma.operationsHealthSnapshot.findMany({ where: { workspaceId } }) as unknown as Promise<IOperationsHealthSnapshot[]>;
  }

  /** Every workspace this module has ever checked — used to sweep all known workspaces on a scheduled run, without depending on the Workspace module. */
  async findDistinctWorkspaceIds(): Promise<string[]> {
    const rows = await this.prisma.operationsHealthSnapshot.findMany({
      distinct: ['workspaceId'],
      select: { workspaceId: true },
    });
    return rows.map((r) => r.workspaceId);
  }

  async upsertSnapshot(workspaceId: string, module: string, data: Partial<IOperationsHealthSnapshot>): Promise<IOperationsHealthSnapshot> {
    return this.prisma.operationsHealthSnapshot.upsert({
      where: { workspaceId_module: { workspaceId, module } },
      create: { workspaceId, module, ...data } as any,
      update: data as any,
    }) as unknown as Promise<IOperationsHealthSnapshot>;
  }

  // ── Incidents ────────────────────────────────────────────────────

  async createIncident(data: Partial<IOperationsHealthIncident>): Promise<IOperationsHealthIncident> {
    return this.prisma.operationsHealthIncident.create({ data: data as any }) as unknown as Promise<IOperationsHealthIncident>;
  }

  async findOpenIncident(workspaceId: string, module: string): Promise<IOperationsHealthIncident | null> {
    return this.prisma.operationsHealthIncident.findFirst({
      where: { workspaceId, module, status: OperationsHealthIncidentStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    }) as Promise<IOperationsHealthIncident | null>;
  }

  async updateIncident(id: string, data: Partial<IOperationsHealthIncident>): Promise<IOperationsHealthIncident> {
    return this.prisma.operationsHealthIncident.update({ where: { id }, data: data as any }) as unknown as Promise<IOperationsHealthIncident>;
  }

  async findIncidentById(id: string): Promise<IOperationsHealthIncident | null> {
    return this.prisma.operationsHealthIncident.findFirst({ where: { id } }) as Promise<IOperationsHealthIncident | null>;
  }

  async findIncidents(workspaceId: string, filter: IncidentFilterDto): Promise<[IOperationsHealthIncident[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.module) where.module = filter.module;
    if (filter.status) where.status = filter.status;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.operationsHealthIncident.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { openedAt: 'desc' },
      }),
      this.prisma.operationsHealthIncident.count({ where: where as any }),
    ]);

    return [data as unknown as IOperationsHealthIncident[], total];
  }

  // ── Check logs ───────────────────────────────────────────────────

  async createCheckLog(data: Partial<IOperationsHealthCheckLog>): Promise<IOperationsHealthCheckLog> {
    return this.prisma.operationsHealthCheckLog.create({ data: data as any }) as unknown as Promise<IOperationsHealthCheckLog>;
  }

  async findCheckLogs(workspaceId: string, filter: CheckLogFilterDto): Promise<[IOperationsHealthCheckLog[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.module) where.module = filter.module;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.operationsHealthCheckLog.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { checkedAt: 'desc' },
      }),
      this.prisma.operationsHealthCheckLog.count({ where: where as any }),
    ]);

    return [data as unknown as IOperationsHealthCheckLog[], total];
  }
}
