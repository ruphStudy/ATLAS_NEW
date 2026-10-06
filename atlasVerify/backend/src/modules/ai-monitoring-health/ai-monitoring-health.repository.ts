import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@database/base.repository';
import {
  IAiHealthCheck,
  IAiHealthIncident,
  IAiHealthMetrics,
  IAiHealthSummary,
  AiHealthCheckType,
  AiHealthStatus,
} from './interfaces';
import { HealthCheckFilterDto, HealthIncidentFilterDto } from './dto';

@Injectable()
export class AiMonitoringHealthRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createHealthCheck(data: Partial<IAiHealthCheck>): Promise<IAiHealthCheck> {
    return this.prisma.aiHealthCheck.create({ data: data as any }) as Promise<IAiHealthCheck>;
  }

  async findHealthCheckById(
    id: string,
    workspaceId: string,
  ): Promise<IAiHealthCheck | null> {
    return this.prisma.aiHealthCheck.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiHealthCheck | null>;
  }

  async findLatestHealthCheck(
    workspaceId: string,
    checkType: AiHealthCheckType,
    targetName: string,
  ): Promise<IAiHealthCheck | null> {
    return this.prisma.aiHealthCheck.findFirst({
      where: { workspaceId, checkType, targetName },
      orderBy: { lastCheckAt: 'desc' },
    }) as Promise<IAiHealthCheck | null>;
  }

  async findAllHealthChecks(
    filter: HealthCheckFilterDto,
  ): Promise<[IAiHealthCheck[], number]> {
    const where: any = {
      workspaceId: filter.workspaceId,
    };

    if (filter.checkType) where.checkType = filter.checkType;
    if (filter.targetName) where.targetName = filter.targetName;
    if (filter.provider) where.provider = filter.provider;
    if (filter.model) where.model = filter.model;
    if (filter.status) where.status = filter.status;

    if (filter.startDate || filter.endDate) {
      where.lastCheckAt = {};
      if (filter.startDate) where.lastCheckAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.lastCheckAt.lte = new Date(filter.endDate);
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.aiHealthCheck.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastCheckAt: 'desc' },
      }),
      this.prisma.aiHealthCheck.count({ where }),
    ]);

    return [data as IAiHealthCheck[], total];
  }

  async updateHealthCheck(
    id: string,
    data: Partial<IAiHealthCheck>,
  ): Promise<IAiHealthCheck> {
    return this.prisma.aiHealthCheck.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiHealthCheck>;
  }

  async createHealthIncident(
    data: Partial<IAiHealthIncident>,
  ): Promise<IAiHealthIncident> {
    return this.prisma.aiHealthIncident.create({
      data: data as any,
    }) as Promise<IAiHealthIncident>;
  }

  async findHealthIncidentById(
    id: string,
    workspaceId: string,
  ): Promise<IAiHealthIncident | null> {
    return this.prisma.aiHealthIncident.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiHealthIncident | null>;
  }

  async findAllHealthIncidents(
    filter: HealthIncidentFilterDto,
  ): Promise<[IAiHealthIncident[], number]> {
    const where: any = {
      workspaceId: filter.workspaceId,
    };

    if (filter.checkType) where.checkType = filter.checkType;
    if (filter.targetName) where.targetName = filter.targetName;
    if (filter.provider) where.provider = filter.provider;
    if (filter.model) where.model = filter.model;
    if (filter.status) where.status = filter.status;
    if (filter.severity) where.severity = filter.severity;

    if (filter.startDate || filter.endDate) {
      where.detectedAt = {};
      if (filter.startDate) where.detectedAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.detectedAt.lte = new Date(filter.endDate);
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.aiHealthIncident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { detectedAt: 'desc' },
      }),
      this.prisma.aiHealthIncident.count({ where }),
    ]);

    return [data as IAiHealthIncident[], total];
  }

  async updateHealthIncident(
    id: string,
    data: Partial<IAiHealthIncident>,
  ): Promise<IAiHealthIncident> {
    return this.prisma.aiHealthIncident.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiHealthIncident>;
  }

  async resolveHealthIncident(id: string): Promise<IAiHealthIncident> {
    const incident = await this.prisma.aiHealthIncident.findUnique({
      where: { id },
    });

    if (!incident) {
      throw new Error('Incident not found');
    }

    const resolvedAt = new Date();
    const resolutionTime = incident.detectedAt
      ? resolvedAt.getTime() - incident.detectedAt.getTime()
      : null;

    return this.prisma.aiHealthIncident.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt,
        resolutionTime,
      },
    }) as Promise<IAiHealthIncident>;
  }

  async createHealthMetrics(
    data: Partial<IAiHealthMetrics>,
  ): Promise<IAiHealthMetrics> {
    return this.prisma.aiHealthMetrics.create({
      data: data as any,
    }) as Promise<IAiHealthMetrics>;
  }

  async createHealthSummary(
    data: Partial<IAiHealthSummary>,
  ): Promise<IAiHealthSummary> {
    return this.prisma.aiHealthSummary.create({
      data: data as any,
    }) as Promise<IAiHealthSummary>;
  }

  async findHealthSummary(
    workspaceId: string,
    checkType: AiHealthCheckType,
    targetName: string,
    periodStart: Date,
  ): Promise<IAiHealthSummary | null> {
    return this.prisma.aiHealthSummary.findFirst({
      where: {
        workspaceId,
        checkType,
        targetName,
        periodStart,
      },
    }) as Promise<IAiHealthSummary | null>;
  }

  async updateHealthSummary(
    id: string,
    data: Partial<IAiHealthSummary>,
  ): Promise<IAiHealthSummary> {
    return this.prisma.aiHealthSummary.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiHealthSummary>;
  }

  async getProviderHealthSummary(
    workspaceId: string,
    provider: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = {
      workspaceId,
      provider,
    };

    if (startDate || endDate) {
      where.lastCheckAt = {};
      if (startDate) where.lastCheckAt.gte = startDate;
      if (endDate) where.lastCheckAt.lte = endDate;
    }

    const checks = await this.prisma.aiHealthCheck.findMany({
      where,
      orderBy: { lastCheckAt: 'desc' },
    });

    const totalChecks = checks.length;
    const healthyChecks = checks.filter(
      (c) => c.status === AiHealthStatus.HEALTHY,
    ).length;
    const degradedChecks = checks.filter(
      (c) => c.status === AiHealthStatus.DEGRADED,
    ).length;
    const unhealthyChecks = checks.filter(
      (c) => c.status === AiHealthStatus.UNHEALTHY,
    ).length;

    const avgLatency =
      checks.reduce((sum, c) => sum + (c.averageLatencyMs || 0), 0) /
      (totalChecks || 1);
    const totalRequests = checks.reduce(
      (sum, c) => sum + c.successCount + c.failureCount,
      0,
    );
    const totalSuccess = checks.reduce((sum, c) => sum + c.successCount, 0);
    const successRate = totalRequests > 0 ? totalSuccess / totalRequests : 0;

    return {
      provider,
      totalChecks,
      healthyChecks,
      degradedChecks,
      unhealthyChecks,
      uptimePercent: totalChecks > 0 ? healthyChecks / totalChecks : 0,
      averageLatencyMs: avgLatency,
      totalRequests,
      successRate,
    };
  }

  async getModelHealthSummary(
    workspaceId: string,
    provider: string,
    model: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = {
      workspaceId,
      provider,
      model,
    };

    if (startDate || endDate) {
      where.lastCheckAt = {};
      if (startDate) where.lastCheckAt.gte = startDate;
      if (endDate) where.lastCheckAt.lte = endDate;
    }

    const checks = await this.prisma.aiHealthCheck.findMany({
      where,
      orderBy: { lastCheckAt: 'desc' },
    });

    const totalChecks = checks.length;
    const healthyChecks = checks.filter(
      (c) => c.status === AiHealthStatus.HEALTHY,
    ).length;

    const avgLatency =
      checks.reduce((sum, c) => sum + (c.averageLatencyMs || 0), 0) /
      (totalChecks || 1);
    const totalRequests = checks.reduce(
      (sum, c) => sum + c.successCount + c.failureCount,
      0,
    );
    const totalSuccess = checks.reduce((sum, c) => sum + c.successCount, 0);
    const successRate = totalRequests > 0 ? totalSuccess / totalRequests : 0;

    return {
      provider,
      model,
      totalChecks,
      healthyChecks,
      uptimePercent: totalChecks > 0 ? healthyChecks / totalChecks : 0,
      averageLatencyMs: avgLatency,
      totalRequests,
      successRate,
    };
  }

  async countActiveIncidents(
    workspaceId: string,
    checkType?: AiHealthCheckType,
    targetName?: string,
  ): Promise<number> {
    const where: any = {
      workspaceId,
      status: { not: 'resolved' },
    };

    if (checkType) where.checkType = checkType;
    if (targetName) where.targetName = targetName;

    return this.prisma.aiHealthIncident.count({ where });
  }
}
