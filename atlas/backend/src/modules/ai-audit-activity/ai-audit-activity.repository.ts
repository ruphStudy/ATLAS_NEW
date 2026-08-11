import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@database/base.repository';
import {
  IAiAuditLog,
  IAiAuditSummary,
  AiAuditActorType,
  AiAuditAction,
  AiAuditOutcome,
} from './interfaces';
import { AuditLogFilterDto } from './dto';

@Injectable()
export class AiAuditActivityRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createAuditLog(data: Partial<IAiAuditLog>): Promise<IAiAuditLog> {
    return this.prisma.aiAuditLog.create({ data: data as any }) as Promise<IAiAuditLog>;
  }

  async findAuditLogById(
    id: string,
    workspaceId: string,
  ): Promise<IAiAuditLog | null> {
    return this.prisma.aiAuditLog.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiAuditLog | null>;
  }

  async findAllAuditLogs(
    filter: AuditLogFilterDto,
  ): Promise<[IAiAuditLog[], number]> {
    const where: any = {
      workspaceId: filter.workspaceId,
    };

    if (filter.actorType) where.actorType = filter.actorType;
    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.action) where.action = filter.action;
    if (filter.outcome) where.outcome = filter.outcome;
    if (filter.capability) where.capability = filter.capability;
    if (filter.useCase) where.useCase = filter.useCase;
    if (filter.provider) where.provider = filter.provider;
    if (filter.model) where.model = filter.model;
    if (filter.agentId) where.agentId = filter.agentId;
    if (filter.workflowId) where.workflowId = filter.workflowId;
    if (filter.orchestratorRequestId) where.orchestratorRequestId = filter.orchestratorRequestId;
    if (filter.correlationId) where.correlationId = filter.correlationId;
    if (filter.suspicious !== undefined) where.suspicious = filter.suspicious;

    if (filter.startDate || filter.endDate) {
      where.timestamp = {};
      if (filter.startDate) where.timestamp.gte = new Date(filter.startDate);
      if (filter.endDate) where.timestamp.lte = new Date(filter.endDate);
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.aiAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.aiAuditLog.count({ where }),
    ]);

    return [data as IAiAuditLog[], total];
  }

  async findActivityTimeline(
    workspaceId: string,
    entityType: string,
    entityId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IAiAuditLog[]> {
    const where: any = {
      workspaceId,
    };

    if (entityType === 'agent') {
      where.agentId = entityId;
    } else if (entityType === 'workflow') {
      where.workflowId = entityId;
    } else if (entityType === 'orchestratorRequest') {
      where.orchestratorRequestId = entityId;
    } else if (entityType === 'user') {
      where.actorId = entityId;
      where.actorType = AiAuditActorType.USER;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    return this.prisma.aiAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    }) as Promise<IAiAuditLog[]>;
  }

  async findSuspiciousActivities(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IAiAuditLog[]> {
    const where: any = {
      workspaceId,
      suspicious: true,
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    return this.prisma.aiAuditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    }) as Promise<IAiAuditLog[]>;
  }

  async createAuditSummary(data: Partial<IAiAuditSummary>): Promise<IAiAuditSummary> {
    return this.prisma.aiAuditSummary.create({
      data: data as any,
    }) as Promise<IAiAuditSummary>;
  }

  async findAuditSummary(
    workspaceId: string,
    entityType: string,
    entityId: string,
    periodStart: Date,
  ): Promise<IAiAuditSummary | null> {
    return this.prisma.aiAuditSummary.findFirst({
      where: {
        workspaceId,
        entityType,
        entityId,
        periodStart,
      },
    }) as Promise<IAiAuditSummary | null>;
  }

  async updateAuditSummary(
    id: string,
    data: Partial<IAiAuditSummary>,
  ): Promise<IAiAuditSummary> {
    return this.prisma.aiAuditSummary.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiAuditSummary>;
  }

  async getWorkspaceStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = { workspaceId };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [totalActivities, successCount, failureCount, blockedCount, suspiciousCount, aggregates] = await Promise.all([
      this.prisma.aiAuditLog.count({ where }),
      this.prisma.aiAuditLog.count({
        where: { ...where, outcome: AiAuditOutcome.SUCCESS },
      }),
      this.prisma.aiAuditLog.count({
        where: { ...where, outcome: AiAuditOutcome.FAILURE },
      }),
      this.prisma.aiAuditLog.count({
        where: { ...where, outcome: AiAuditOutcome.BLOCKED },
      }),
      this.prisma.aiAuditLog.count({
        where: { ...where, suspicious: true },
      }),
      this.prisma.aiAuditLog.aggregate({
        where,
        _sum: {
          totalTokens: true,
          cost: true,
        },
      }),
    ]);

    return {
      totalActivities,
      successCount,
      failureCount,
      blockedCount,
      suspiciousCount,
      totalTokens: aggregates._sum.totalTokens || 0,
      totalCost: aggregates._sum.cost || 0,
      successRate: totalActivities > 0 ? successCount / totalActivities : 0,
    };
  }

  async archiveOldLogs(workspaceId: string, beforeDate: Date): Promise<number> {
    const result = await this.prisma.aiAuditLog.updateMany({
      where: {
        workspaceId,
        timestamp: { lte: beforeDate },
        archivedAt: null,
      },
      data: {
        archivedAt: new Date(),
      },
    });

    return result.count;
  }
}
