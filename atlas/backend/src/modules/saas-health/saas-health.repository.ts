import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  ISaasHealthAggregateIncident,
  ISaasHealthAggregateSnapshot,
  ISaasHealthEvaluationLog,
  ISaasHealthMaintenanceWindow,
  SaasHealthAggregateIncidentStatus,
} from './interfaces';
import { SaasHealthAggregateIncidentFilterDto, SaasHealthEvaluationLogFilterDto } from './dto';

@Injectable()
export class SaasHealthRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Aggregate snapshots ──────────────────────────────────────────

  async findSnapshot(workspaceId: string): Promise<ISaasHealthAggregateSnapshot | null> {
    return this.prisma.saasHealthAggregateSnapshot.findFirst({ where: { workspaceId } }) as Promise<ISaasHealthAggregateSnapshot | null>;
  }

  async findAllSnapshots(): Promise<ISaasHealthAggregateSnapshot[]> {
    return this.prisma.saasHealthAggregateSnapshot.findMany({}) as Promise<ISaasHealthAggregateSnapshot[]>;
  }

  async findSnapshotsByWorkspaceIds(workspaceIds: string[]): Promise<ISaasHealthAggregateSnapshot[]> {
    return this.prisma.saasHealthAggregateSnapshot.findMany({ where: { workspaceId: { in: workspaceIds } } }) as Promise<ISaasHealthAggregateSnapshot[]>;
  }

  /** Every workspace this module has ever evaluated — used to sweep all known tenants on a scheduled run, without depending on the Workspace module. */
  async findDistinctWorkspaceIds(): Promise<string[]> {
    const rows = await this.prisma.saasHealthAggregateSnapshot.findMany({ select: { workspaceId: true } });
    return rows.map((r) => r.workspaceId);
  }

  async upsertSnapshot(workspaceId: string, data: Partial<ISaasHealthAggregateSnapshot>): Promise<ISaasHealthAggregateSnapshot> {
    return this.prisma.saasHealthAggregateSnapshot.upsert({
      where: { workspaceId },
      create: { workspaceId, ...data } as any,
      update: data as any,
    }) as Promise<ISaasHealthAggregateSnapshot>;
  }

  // ── Aggregate incidents ──────────────────────────────────────────

  async createIncident(data: Partial<ISaasHealthAggregateIncident>): Promise<ISaasHealthAggregateIncident> {
    return this.prisma.saasHealthAggregateIncident.create({ data: data as any }) as Promise<ISaasHealthAggregateIncident>;
  }

  async findOpenIncident(workspaceId: string): Promise<ISaasHealthAggregateIncident | null> {
    return this.prisma.saasHealthAggregateIncident.findFirst({
      where: { workspaceId, status: SaasHealthAggregateIncidentStatus.OPEN },
      orderBy: { openedAt: 'desc' },
    }) as Promise<ISaasHealthAggregateIncident | null>;
  }

  async updateIncident(id: string, data: Partial<ISaasHealthAggregateIncident>): Promise<ISaasHealthAggregateIncident> {
    return this.prisma.saasHealthAggregateIncident.update({ where: { id }, data: data as any }) as Promise<ISaasHealthAggregateIncident>;
  }

  async findIncidentById(id: string): Promise<ISaasHealthAggregateIncident | null> {
    return this.prisma.saasHealthAggregateIncident.findFirst({ where: { id } }) as Promise<ISaasHealthAggregateIncident | null>;
  }

  /** `workspaceId` optional — omitted for the platform-wide, cross-tenant incident view (`PlatformAdminGuard`-gated); always supplied for the tenant-scoped view. */
  async findIncidents(workspaceId: string | undefined, filter: SaasHealthAggregateIncidentFilterDto): Promise<[ISaasHealthAggregateIncident[], number]> {
    const where: Record<string, unknown> = {};
    if (workspaceId) where.workspaceId = workspaceId;
    if (filter.status) where.status = filter.status;
    if (filter.severity) where.severity = filter.severity;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.saasHealthAggregateIncident.findMany({ where: where as any, skip, take: limit, orderBy: { openedAt: 'desc' } }),
      this.prisma.saasHealthAggregateIncident.count({ where: where as any }),
    ]);

    return [data as ISaasHealthAggregateIncident[], total];
  }

  // ── Evaluation logs ──────────────────────────────────────────────

  async createEvaluationLog(data: Partial<ISaasHealthEvaluationLog>): Promise<ISaasHealthEvaluationLog> {
    return this.prisma.saasHealthEvaluationLog.create({ data: data as any }) as Promise<ISaasHealthEvaluationLog>;
  }

  async findEvaluationLogs(workspaceId: string, filter: SaasHealthEvaluationLogFilterDto): Promise<[ISaasHealthEvaluationLog[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.saasHealthEvaluationLog.findMany({ where: { workspaceId }, skip, take: limit, orderBy: { evaluatedAt: 'desc' } }),
      this.prisma.saasHealthEvaluationLog.count({ where: { workspaceId } }),
    ]);

    return [data as ISaasHealthEvaluationLog[], total];
  }

  // ── Maintenance windows ──────────────────────────────────────────

  async createMaintenanceWindow(data: Partial<ISaasHealthMaintenanceWindow>): Promise<ISaasHealthMaintenanceWindow> {
    return this.prisma.saasHealthMaintenanceWindow.create({ data: data as any }) as Promise<ISaasHealthMaintenanceWindow>;
  }

  async findMaintenanceWindowById(id: string): Promise<ISaasHealthMaintenanceWindow | null> {
    return this.prisma.saasHealthMaintenanceWindow.findFirst({ where: { id } }) as Promise<ISaasHealthMaintenanceWindow | null>;
  }

  async updateMaintenanceWindow(id: string, data: Partial<ISaasHealthMaintenanceWindow>): Promise<ISaasHealthMaintenanceWindow> {
    return this.prisma.saasHealthMaintenanceWindow.update({ where: { id }, data: data as any }) as Promise<ISaasHealthMaintenanceWindow>;
  }

  /** Every non-cancelled window currently in effect (`startAt <= now <= endAt`) covering this exact module for this tenant — a window scoped to this module specifically, OR a tenant-wide window (`module: null`), OR a platform-wide window (`workspaceId: null`) with the same module scoping. */
  async findActiveWindowForModule(workspaceId: string, module: string, now: Date): Promise<ISaasHealthMaintenanceWindow | null> {
    return this.prisma.saasHealthMaintenanceWindow.findFirst({
      where: {
        cancelledAt: null,
        startAt: { lte: now },
        endAt: { gte: now },
        OR: [{ workspaceId }, { workspaceId: null }],
        AND: [{ OR: [{ module }, { module: null }] }],
      },
    }) as Promise<ISaasHealthMaintenanceWindow | null>;
  }

  /** Every non-cancelled window currently in effect covering this tenant AS A WHOLE (`module: null` only) — a tenant-wide window, OR a platform-wide window (`workspaceId: null`) that is also tenant-wide. */
  async findActiveTenantWideWindow(workspaceId: string, now: Date): Promise<ISaasHealthMaintenanceWindow | null> {
    return this.prisma.saasHealthMaintenanceWindow.findFirst({
      where: {
        cancelledAt: null,
        startAt: { lte: now },
        endAt: { gte: now },
        module: null,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
    }) as Promise<ISaasHealthMaintenanceWindow | null>;
  }

  async findAllMaintenanceWindows(workspaceId?: string): Promise<ISaasHealthMaintenanceWindow[]> {
    const where: Record<string, unknown> = {};
    if (workspaceId) where.workspaceId = workspaceId;
    return this.prisma.saasHealthMaintenanceWindow.findMany({ where: where as any, orderBy: { startAt: 'desc' } }) as Promise<ISaasHealthMaintenanceWindow[]>;
  }
}
