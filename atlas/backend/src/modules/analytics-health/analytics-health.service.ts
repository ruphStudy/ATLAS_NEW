import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsHealthRepository } from './analytics-health.repository';
import { AnalyticsHealthEventQueue } from './jobs';
import {
  PerformHealthCheckDto,
  GetWorkspaceHealthDto,
  GetServiceHealthDto,
  ReportIncidentDto,
  ResolveIncidentDto,
  GetHealthHistoryDto,
  ServiceHealthResponseDto,
  WorkspaceHealthSummaryResponseDto,
  SystemHealthSummaryResponseDto,
  HealthCheckResponseDto,
  HealthIncidentResponseDto,
  OperationStatusResponseDto,
} from './dto';
import {
  AnalyticsService,
  HealthStatus,
  HealthCheckType,
  AnalyticsHealthEventType,
  IServiceHealth,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AnalyticsHealthService {
  private readonly logger = new Logger(AnalyticsHealthService.name);
  private readonly HEALTH_CHECK_TIMEOUT_MS = 30000;
  private readonly DEGRADED_THRESHOLD = 0.90;
  private readonly FAILED_THRESHOLD = 0.75;
  private readonly METRICS_WINDOW_MINUTES = 15;

  constructor(
    private readonly repository: AnalyticsHealthRepository,
    private readonly eventQueue: AnalyticsHealthEventQueue,
  ) {}

  async performHealthCheck(dto: PerformHealthCheckDto): Promise<HealthCheckResponseDto> {
    const startTime = Date.now();
    const type = dto.type ?? HealthCheckType.MANUAL;

    const services = dto.service
      ? [dto.service]
      : Object.values(AnalyticsService);

    const serviceHealthResults: IServiceHealth[] = [];

    for (const service of services) {
      const health = await this.checkServiceHealth(dto.workspaceId, service);
      serviceHealthResults.push(health);
    }

    const overallStatus = this.determineOverallStatus(serviceHealthResults);
    const allIssues = serviceHealthResults.flatMap((s) => s.issues || []);
    const duration = Date.now() - startTime;

    const healthCheck = await this.repository.createHealthCheck({
      workspaceId: dto.workspaceId,
      service: dto.service,
      type,
      status: overallStatus,
      issues: allIssues,
      triggeredBy: dto.triggeredBy,
      duration,
    });

    await this.eventQueue.publish({
      event: AnalyticsHealthEventType.HEALTH_CHECK_COMPLETED,
      workspaceId: dto.workspaceId,
      service: dto.service,
      status: overallStatus,
      timestamp: new Date(),
      metadata: { duration, issueCount: allIssues.length },
    });

    return healthCheck as HealthCheckResponseDto;
  }

  async getWorkspaceHealth(dto: GetWorkspaceHealthDto): Promise<WorkspaceHealthSummaryResponseDto> {
    const services = Object.values(AnalyticsService);
    const serviceHealthResults: IServiceHealth[] = [];

    for (const service of services) {
      const health = await this.checkServiceHealth(dto.workspaceId, service);
      serviceHealthResults.push(health);
    }

    const healthyCount = serviceHealthResults.filter((s) => s.status === HealthStatus.HEALTHY).length;
    const degradedCount = serviceHealthResults.filter((s) => s.status === HealthStatus.DEGRADED).length;
    const failedCount = serviceHealthResults.filter((s) => s.status === HealthStatus.FAILED).length;

    const overallStatus = this.determineOverallStatus(serviceHealthResults);

    return {
      workspaceId: dto.workspaceId,
      overallStatus,
      services: serviceHealthResults,
      totalServices: services.length,
      healthyServices: healthyCount,
      degradedServices: degradedCount,
      failedServices: failedCount,
      lastUpdated: new Date(),
    };
  }

  async getSystemHealth(): Promise<SystemHealthSummaryResponseDto> {
    const systemSummary = await this.repository.getSystemHealthSummary();
    return systemSummary as SystemHealthSummaryResponseDto;
  }

  async getServiceHealth(dto: GetServiceHealthDto): Promise<ServiceHealthResponseDto> {
    const health = await this.checkServiceHealth(dto.workspaceId, dto.service);
    return health as ServiceHealthResponseDto;
  }

  async reportIncident(dto: ReportIncidentDto): Promise<HealthIncidentResponseDto> {
    const incident = await this.repository.createIncident({
      workspaceId: dto.workspaceId,
      service: dto.service,
      severity: dto.severity,
      title: dto.title,
      description: dto.description,
      affectedOperations: dto.affectedOperations,
      errorSummary: dto.errorSummary,
      metadata: dto.metadata,
    });

    await this.eventQueue.publish({
      event: AnalyticsHealthEventType.INCIDENT_DETECTED,
      workspaceId: dto.workspaceId,
      service: dto.service,
      incidentId: incident.id,
      timestamp: new Date(),
      metadata: { severity: dto.severity, title: dto.title },
    });

    return incident as HealthIncidentResponseDto;
  }

  async resolveIncident(dto: ResolveIncidentDto): Promise<HealthIncidentResponseDto> {
    const existing = await this.repository.findIncidentById(dto.incidentId);
    if (!existing) {
      throw new ResourceNotFoundException(
        `Incident ${dto.incidentId} not found`,
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const resolved = await this.repository.updateIncident(dto.incidentId, {
      status: 'resolved',
      resolvedAt: new Date(),
    });

    await this.eventQueue.publish({
      event: AnalyticsHealthEventType.INCIDENT_RESOLVED,
      workspaceId: resolved.workspaceId,
      service: resolved.service,
      incidentId: resolved.id,
      timestamp: new Date(),
    });

    return resolved as HealthIncidentResponseDto;
  }

  async getOpenIncidents(
    workspaceId?: string,
    service?: AnalyticsService,
  ): Promise<HealthIncidentResponseDto[]> {
    const incidents = await this.repository.findOpenIncidents(workspaceId, service);
    return incidents as HealthIncidentResponseDto[];
  }

  async getHealthHistory(dto: GetHealthHistoryDto): Promise<HealthCheckResponseDto[]> {
    const history = await this.repository.findHealthHistory(
      dto.workspaceId,
      dto.service,
      dto.startDate,
      dto.endDate,
      dto.limit,
    );
    return history as HealthCheckResponseDto[];
  }

  async getOperationStatus(
    workspaceId: string,
    operationType: string,
  ): Promise<OperationStatusResponseDto> {
    const status = await this.repository.getOperationStatus(workspaceId, operationType);
    return status as OperationStatusResponseDto;
  }

  private async checkServiceHealth(
    workspaceId: string | undefined,
    service: AnalyticsService,
  ): Promise<IServiceHealth> {
    const metrics = await this.repository.getServiceMetrics(
      workspaceId,
      service,
      this.METRICS_WINDOW_MINUTES,
    );

    const issues: string[] = [];
    let status = HealthStatus.HEALTHY;

    if (metrics.availability < this.FAILED_THRESHOLD) {
      status = HealthStatus.FAILED;
      issues.push(`Low availability: ${(metrics.availability * 100).toFixed(2)}%`);
    } else if (metrics.availability < this.DEGRADED_THRESHOLD) {
      status = HealthStatus.DEGRADED;
      issues.push(`Degraded availability: ${(metrics.availability * 100).toFixed(2)}%`);
    }

    if (metrics.failureRate > 0.1) {
      status = status === HealthStatus.HEALTHY ? HealthStatus.DEGRADED : status;
      issues.push(`High failure rate: ${(metrics.failureRate * 100).toFixed(2)}%`);
    }

    if (metrics.queueDelay && metrics.queueDelay > 5000) {
      status = status === HealthStatus.HEALTHY ? HealthStatus.DEGRADED : status;
      issues.push(`High queue delay: ${metrics.queueDelay}ms`);
    }

    if (metrics.staleDataPercentage && metrics.staleDataPercentage > 0.05) {
      issues.push(`Stale data detected: ${(metrics.staleDataPercentage * 100).toFixed(2)}%`);
    }

    await this.repository.recordServiceHealth({
      workspaceId,
      service,
      status,
      metrics,
      issues,
    });

    if (status === HealthStatus.DEGRADED) {
      await this.eventQueue.publish({
        event: AnalyticsHealthEventType.SERVICE_DEGRADED,
        workspaceId,
        service,
        status,
        timestamp: new Date(),
        metadata: { issues, metrics },
      });
    } else if (status === HealthStatus.FAILED) {
      await this.eventQueue.publish({
        event: AnalyticsHealthEventType.SERVICE_FAILED,
        workspaceId,
        service,
        status,
        timestamp: new Date(),
        metadata: { issues, metrics },
      });
    }

    return {
      service,
      status,
      metrics,
      lastCheck: new Date(),
      issues: issues.length > 0 ? issues : undefined,
    };
  }

  private determineOverallStatus(services: IServiceHealth[]): HealthStatus {
    if (services.some((s) => s.status === HealthStatus.FAILED)) {
      return HealthStatus.FAILED;
    }
    if (services.some((s) => s.status === HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }
    if (services.every((s) => s.status === HealthStatus.HEALTHY)) {
      return HealthStatus.HEALTHY;
    }
    return HealthStatus.UNKNOWN;
  }
}
