import { Injectable, Logger } from '@nestjs/common';
import { AiMonitoringHealthRepository } from './ai-monitoring-health.repository';
import { AiHealthEventQueue } from './jobs';
import {
  HealthCheckRequestDto,
  HealthCheckFilterDto,
  HealthIncidentFilterDto,
  UpdateIncidentDto,
  HealthCheckResponseDto,
  PaginatedHealthCheckResponseDto,
  HealthIncidentResponseDto,
  PaginatedHealthIncidentResponseDto,
  HealthSummaryResponseDto,
} from './dto';
import {
  IAiHealthCheck,
  IAiHealthIncident,
  IHealthCheckResult,
  AiHealthStatus,
  AiHealthCheckType,
  AiHealthEventType,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiMonitoringHealthService {
  private readonly logger = new Logger(AiMonitoringHealthService.name);

  constructor(
    private readonly repository: AiMonitoringHealthRepository,
    private readonly eventQueue: AiHealthEventQueue,
  ) {}

  async performHealthCheck(
    dto: HealthCheckRequestDto,
  ): Promise<HealthCheckResponseDto> {
    const startTime = Date.now();

    const previousCheck = await this.repository.findLatestHealthCheck(
      dto.workspaceId,
      dto.checkType,
      dto.targetName,
    );

    const checkResult = await this.executeHealthCheck(dto);

    const checkDurationMs = Date.now() - startTime;

    const healthCheck = await this.repository.createHealthCheck({
      workspaceId: dto.workspaceId,
      checkType: dto.checkType,
      targetId: dto.targetId,
      targetName: dto.targetName,
      provider: dto.provider,
      model: dto.model,
      capability: dto.capability,
      status: checkResult.status,
      previousStatus: previousCheck?.status,
      availabilityPercent: checkResult.availabilityPercent,
      averageLatencyMs: checkResult.averageLatencyMs,
      p95LatencyMs: checkResult.p95LatencyMs,
      p99LatencyMs: checkResult.p99LatencyMs,
      throughputRpm: checkResult.throughputRpm,
      successCount: checkResult.successCount,
      failureCount: checkResult.failureCount,
      retryCount: checkResult.retryCount,
      fallbackCount: checkResult.fallbackCount,
      rateLimitHits: checkResult.rateLimitHits,
      quotaRemaining: checkResult.quotaRemaining,
      budgetRemaining: checkResult.budgetRemaining,
      totalTokensUsed: checkResult.totalTokensUsed,
      totalCost: checkResult.totalCost,
      lastCheckAt: new Date(),
      checkDurationMs,
      errorMessage: checkResult.errorMessage,
      errorCode: checkResult.errorCode,
      errorDetails: checkResult.errorDetails,
      isManual: dto.isManual || false,
      scheduledCheck: !dto.isManual,
      metadata: dto.metadata || {},
    });

    await this.eventQueue.publish({
      event: AiHealthEventType.HEALTH_CHECK,
      workspaceId: dto.workspaceId,
      healthCheckId: healthCheck.id,
      status: checkResult.status,
    });

    await this.repository.createHealthMetrics({
      workspaceId: dto.workspaceId,
      checkType: dto.checkType,
      targetName: dto.targetName,
      provider: dto.provider,
      model: dto.model,
      capability: dto.capability,
      status: checkResult.status,
      availabilityPercent: checkResult.availabilityPercent,
      latencyMs: checkResult.averageLatencyMs,
      throughput: checkResult.throughputRpm,
      requestCount: checkResult.successCount + checkResult.failureCount,
      successCount: checkResult.successCount,
      failureCount: checkResult.failureCount,
      tokensUsed: checkResult.totalTokensUsed,
      cost: checkResult.totalCost,
      metadata: {},
    });

    if (
      previousCheck &&
      previousCheck.status === AiHealthStatus.HEALTHY &&
      checkResult.status === AiHealthStatus.DEGRADED
    ) {
      await this.eventQueue.publish({
        event: AiHealthEventType.DEGRADATION,
        workspaceId: dto.workspaceId,
        healthCheckId: healthCheck.id,
        checkType: dto.checkType,
        targetName: dto.targetName,
      });

      await this.createIncident(
        healthCheck,
        'degradation',
        'warning',
        'Service Degraded',
        `${dto.targetName} health degraded from HEALTHY to DEGRADED`,
      );
    }

    if (
      previousCheck &&
      previousCheck.status !== AiHealthStatus.OFFLINE &&
      checkResult.status === AiHealthStatus.OFFLINE
    ) {
      await this.eventQueue.publish({
        event: AiHealthEventType.OUTAGE,
        workspaceId: dto.workspaceId,
        healthCheckId: healthCheck.id,
        checkType: dto.checkType,
        targetName: dto.targetName,
      });

      await this.createIncident(
        healthCheck,
        'outage',
        'critical',
        'Service Offline',
        `${dto.targetName} is offline`,
      );
    }

    if (
      previousCheck &&
      (previousCheck.status === AiHealthStatus.DEGRADED ||
        previousCheck.status === AiHealthStatus.UNHEALTHY ||
        previousCheck.status === AiHealthStatus.OFFLINE) &&
      checkResult.status === AiHealthStatus.HEALTHY
    ) {
      await this.eventQueue.publish({
        event: AiHealthEventType.RECOVERY,
        workspaceId: dto.workspaceId,
        healthCheckId: healthCheck.id,
        checkType: dto.checkType,
        targetName: dto.targetName,
        previousStatus: previousCheck.status,
      });
    }

    return healthCheck as HealthCheckResponseDto;
  }

  async findHealthCheckById(
    id: string,
    workspaceId: string,
  ): Promise<HealthCheckResponseDto> {
    const healthCheck = await this.repository.findHealthCheckById(
      id,
      workspaceId,
    );
    if (!healthCheck) {
      throw new ResourceNotFoundException(
        'Health check not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return healthCheck as HealthCheckResponseDto;
  }

  async findAllHealthChecks(
    filter: HealthCheckFilterDto,
  ): Promise<PaginatedHealthCheckResponseDto> {
    const [data, total] = await this.repository.findAllHealthChecks(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as HealthCheckResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findHealthIncidentById(
    id: string,
    workspaceId: string,
  ): Promise<HealthIncidentResponseDto> {
    const incident = await this.repository.findHealthIncidentById(
      id,
      workspaceId,
    );
    if (!incident) {
      throw new ResourceNotFoundException(
        'Health incident not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return incident as HealthIncidentResponseDto;
  }

  async findAllHealthIncidents(
    filter: HealthIncidentFilterDto,
  ): Promise<PaginatedHealthIncidentResponseDto> {
    const [data, total] = await this.repository.findAllHealthIncidents(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as HealthIncidentResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async updateIncident(
    id: string,
    workspaceId: string,
    dto: UpdateIncidentDto,
  ): Promise<HealthIncidentResponseDto> {
    await this.findHealthIncidentById(id, workspaceId);
    const incident = await this.repository.updateHealthIncident(id, dto);
    return incident as HealthIncidentResponseDto;
  }

  async resolveIncident(
    id: string,
    workspaceId: string,
  ): Promise<HealthIncidentResponseDto> {
    const incident = await this.findHealthIncidentById(id, workspaceId);
    const resolved = await this.repository.resolveHealthIncident(id);

    await this.eventQueue.publish({
      event: AiHealthEventType.INCIDENT_RESOLVED,
      workspaceId,
      incidentId: id,
      resolutionTime: resolved.resolutionTime || 0,
    });

    return resolved as HealthIncidentResponseDto;
  }

  async getProviderHealthSummary(
    workspaceId: string,
    provider: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getProviderHealthSummary(
      workspaceId,
      provider,
      startDate,
      endDate,
    );
  }

  async getModelHealthSummary(
    workspaceId: string,
    provider: string,
    model: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getModelHealthSummary(
      workspaceId,
      provider,
      model,
      startDate,
      endDate,
    );
  }

  async getWorkspaceHealthSummary(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const activeIncidents = await this.repository.countActiveIncidents(
      workspaceId,
    );

    const where: any = { workspaceId };
    if (startDate || endDate) {
      where.lastCheckAt = {};
      if (startDate) where.lastCheckAt.gte = startDate;
      if (endDate) where.lastCheckAt.lte = endDate;
    }

    return {
      workspaceId,
      activeIncidents,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  private async executeHealthCheck(
    dto: HealthCheckRequestDto,
  ): Promise<IHealthCheckResult> {
    const startTime = Date.now();

    try {
      const mockSuccess = Math.random() > 0.1;
      const mockLatency = Math.floor(Math.random() * 500) + 100;

      if (!mockSuccess) {
        return {
          status: AiHealthStatus.DEGRADED,
          successCount: 80,
          failureCount: 20,
          retryCount: 5,
          fallbackCount: 2,
          rateLimitHits: 3,
          totalTokensUsed: 1000,
          totalCost: 0.05,
          checkDurationMs: Date.now() - startTime,
          errorMessage: 'Elevated error rate detected',
        };
      }

      return {
        status: AiHealthStatus.HEALTHY,
        availabilityPercent: 99.5,
        averageLatencyMs: mockLatency,
        p95LatencyMs: mockLatency * 1.5,
        p99LatencyMs: mockLatency * 2,
        throughputRpm: 120.5,
        successCount: 100,
        failureCount: 0,
        retryCount: 2,
        fallbackCount: 0,
        rateLimitHits: 0,
        quotaRemaining: 10000,
        budgetRemaining: 500.0,
        totalTokensUsed: 1500,
        totalCost: 0.075,
        checkDurationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: AiHealthStatus.OFFLINE,
        successCount: 0,
        failureCount: 100,
        retryCount: 0,
        fallbackCount: 0,
        rateLimitHits: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        checkDurationMs: Date.now() - startTime,
        errorMessage: (error as Error).message,
        errorCode: 'HEALTH_CHECK_FAILED',
        errorDetails: error,
      };
    }
  }

  private async createIncident(
    healthCheck: IAiHealthCheck,
    incidentType: string,
    severity: string,
    title: string,
    description: string,
  ): Promise<IAiHealthIncident> {
    const incident = await this.repository.createHealthIncident({
      workspaceId: healthCheck.workspaceId,
      healthCheckId: healthCheck.id,
      incidentType,
      severity,
      checkType: healthCheck.checkType,
      targetId: healthCheck.targetId,
      targetName: healthCheck.targetName,
      provider: healthCheck.provider,
      model: healthCheck.model,
      capability: healthCheck.capability,
      status: 'open',
      title,
      description,
      detectedAt: new Date(),
      affectedRequests: healthCheck.failureCount,
      failureRate:
        healthCheck.successCount + healthCheck.failureCount > 0
          ? healthCheck.failureCount /
            (healthCheck.successCount + healthCheck.failureCount)
          : 0,
      tags: [],
      metadata: {},
    });

    await this.eventQueue.publish({
      event: AiHealthEventType.INCIDENT_CREATED,
      workspaceId: healthCheck.workspaceId,
      incidentId: incident.id,
      severity,
    });

    return incident;
  }
}
