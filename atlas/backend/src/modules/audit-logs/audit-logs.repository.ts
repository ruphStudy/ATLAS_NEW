import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IAuditLogEntry, ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from './interfaces';
import { AuditLogFilterDto } from './dto';

/** Same filterable fields as `AuditLogFilterDto`, minus the implicit single-tenant scoping — `workspaceId` here is an optional narrowing filter (one tenant or a resolved list), never a mandatory scope. Exported so SaaS Audit's own DTOs can stay structurally compatible without importing across module boundaries. */
export interface IAuditPlatformWideFilter {
  workspaceId?: string | string[];
  module?: string;
  action?: string;
  actionCategory?: AuditActionCategory;
  actorType?: ActivityActorType;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  outcome?: ActivityOutcome;
  riskLevel?: AuditRiskLevel;
  flagged?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * AuditLogsRepository — the ONLY layer that writes/reads `AuditLogEntry`
 * rows. Deliberately exposes no `update()` method at all: audit records are
 * immutable/append-only by design (see `AuditLogsService`'s docblock).
 */
@Injectable()
export class AuditLogsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: Partial<IAuditLogEntry>): Promise<IAuditLogEntry> {
    return this.prisma.auditLogEntry.create({
      data: data as any,
    }) as Promise<IAuditLogEntry>;
  }

  async findExistingByDedupeKey(
    workspaceId: string,
    dedupeKey: string,
  ): Promise<IAuditLogEntry | null> {
    return this.prisma.auditLogEntry.findFirst({
      where: { workspaceId, dedupeKey },
    }) as Promise<IAuditLogEntry | null>;
  }

  async findById(id: string, workspaceId: string): Promise<IAuditLogEntry | null> {
    return this.prisma.auditLogEntry.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAuditLogEntry | null>;
  }

  async findAll(
    workspaceId: string,
    filter: AuditLogFilterDto,
  ): Promise<[IAuditLogEntry[], number]> {
    return this.query(this.buildWhere(filter, workspaceId), filter);
  }

  async findEntityHistory(
    workspaceId: string,
    entityType: string,
    entityId: string,
    filter: AuditLogFilterDto,
  ): Promise<[IAuditLogEntry[], number]> {
    return this.query({ ...this.buildWhere(filter, workspaceId), entityType, entityId }, filter);
  }

  async findActorHistory(
    workspaceId: string,
    actorId: string,
    filter: AuditLogFilterDto,
  ): Promise<[IAuditLogEntry[], number]> {
    return this.query({ ...this.buildWhere(filter, workspaceId), actorId }, filter);
  }

  /** Cross-tenant, unscoped-by-default read — used exclusively by SaaS Audit's `PlatformAdminGuard`-gated search/detection/export surface. A normal per-tenant caller must never reach this; every other method above stays workspace-scoped. */
  async findAllPlatformWide(filter: IAuditPlatformWideFilter, page = 1, limit = 20): Promise<[IAuditLogEntry[], number]> {
    const where = this.buildPlatformWhere(filter);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLogEntry.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: filter.sortOrder ?? 'desc' },
      }),
      this.prisma.auditLogEntry.count({ where: where as any }),
    ]);

    return [data as IAuditLogEntry[], total];
  }

  private buildPlatformWhere(filter: IAuditPlatformWideFilter): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (filter.workspaceId) where.workspaceId = Array.isArray(filter.workspaceId) ? { in: filter.workspaceId } : filter.workspaceId;
    if (filter.module) where.module = filter.module;
    if (filter.action) where.action = filter.action;
    if (filter.actionCategory) where.actionCategory = filter.actionCategory;
    if (filter.actorType) where.actorType = filter.actorType as ActivityActorType;
    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.outcome) where.outcome = filter.outcome;
    if (filter.riskLevel) where.riskLevel = filter.riskLevel;
    if (filter.flagged !== undefined) where.flagged = filter.flagged;

    if (filter.startDate || filter.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filter.startDate) createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) createdAt.lte = new Date(filter.endDate);
      where.createdAt = createdAt;
    }

    if (filter.search) {
      where.OR = [
        { action: { contains: filter.search, mode: 'insensitive' } },
        { reason: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /** Used by the risk analyzer to detect repeated-failure patterns for the same actor. */
  async countRecentFailures(
    workspaceId: string,
    actorId: string,
    actionCategory: AuditActionCategory,
    since: Date,
  ): Promise<number> {
    return this.prisma.auditLogEntry.count({
      where: {
        workspaceId,
        actorId,
        actionCategory,
        outcome: 'FAILURE',
        createdAt: { gte: since },
      },
    });
  }

  /** Unpaginated (capped) read for export — bounded so a huge workspace can't OOM a single export call. */
  async findAllForExport(
    workspaceId: string,
    filter: AuditLogFilterDto,
    maxRows = 10_000,
  ): Promise<IAuditLogEntry[]> {
    return this.prisma.auditLogEntry.findMany({
      where: this.buildWhere(filter, workspaceId) as any,
      orderBy: { createdAt: filter.sortOrder ?? 'desc' },
      take: maxRows,
    }) as Promise<IAuditLogEntry[]>;
  }

  /** Retention purge — never removes flagged (suspicious/high-risk) entries, only routine NORMAL-risk history past the cutoff. */
  async purgeOlderThan(workspaceId: string, cutoff: Date): Promise<number> {
    const result = await this.prisma.auditLogEntry.deleteMany({
      where: { workspaceId, createdAt: { lt: cutoff }, flagged: false },
    });
    return result.count;
  }

  private buildWhere(filter: AuditLogFilterDto, workspaceId: string): Record<string, unknown> {
    const where: Record<string, unknown> = { workspaceId };

    if (filter.module) where.module = filter.module;
    if (filter.action) where.action = filter.action;
    if (filter.actionCategory) where.actionCategory = filter.actionCategory;
    if (filter.actorType) where.actorType = filter.actorType as ActivityActorType;
    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.outcome) where.outcome = filter.outcome;
    if (filter.riskLevel) where.riskLevel = filter.riskLevel;
    if (filter.flagged !== undefined) where.flagged = filter.flagged;

    if (filter.startDate || filter.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filter.startDate) createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) createdAt.lte = new Date(filter.endDate);
      where.createdAt = createdAt;
    }

    if (filter.search) {
      where.OR = [
        { action: { contains: filter.search, mode: 'insensitive' } },
        { reason: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async query(
    where: Record<string, unknown>,
    filter: AuditLogFilterDto,
  ): Promise<[IAuditLogEntry[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLogEntry.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: filter.sortOrder ?? 'desc' },
      }),
      this.prisma.auditLogEntry.count({ where: where as any }),
    ]);

    return [data as IAuditLogEntry[], total];
  }
}
