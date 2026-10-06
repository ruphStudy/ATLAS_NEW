import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDate,
  IsObject,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AnalyticsService,
  HealthStatus,
  HealthCheckType,
  IHealthMetrics,
  IServiceHealth,
  IWorkspaceHealthSummary,
  ISystemHealthSummary,
  IHealthCheck,
  IHealthIncident,
  IOperationStatus,
} from '../interfaces';

export class HealthMetricsDto implements IHealthMetrics {
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsNotEmpty()
  availability!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  averageLatency?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  throughput?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  failureRate?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  cacheHitRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  queueDelay?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  staleDataPercentage?: number;
}

export class PerformHealthCheckDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsEnum(AnalyticsService)
  @IsOptional()
  service?: AnalyticsService;

  @IsEnum(HealthCheckType)
  @IsOptional()
  type?: HealthCheckType;

  @IsString()
  @IsOptional()
  triggeredBy?: string;
}

export class GetWorkspaceHealthDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsBoolean()
  @IsOptional()
  includeHistory?: boolean;
}

export class GetServiceHealthDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsEnum(AnalyticsService)
  @IsNotEmpty()
  service!: AnalyticsService;
}

export class ReportIncidentDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsEnum(AnalyticsService)
  @IsNotEmpty()
  service!: AnalyticsService;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsNotEmpty()
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @IsOptional()
  affectedOperations?: number;

  @IsString()
  @IsOptional()
  errorSummary?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ResolveIncidentDto {
  @IsString()
  @IsNotEmpty()
  incidentId!: string;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsString()
  @IsOptional()
  resolvedBy?: string;
}

export class GetHealthHistoryDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsEnum(AnalyticsService)
  @IsOptional()
  service?: AnalyticsService;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}

export class ServiceHealthResponseDto implements IServiceHealth {
  service!: AnalyticsService;
  status!: HealthStatus;
  metrics!: IHealthMetrics;
  lastSuccessful?: Date;
  lastCheck!: Date;
  issues?: string[];
  metadata?: Record<string, any>;
}

export class WorkspaceHealthSummaryResponseDto implements IWorkspaceHealthSummary {
  workspaceId!: string;
  overallStatus!: HealthStatus;
  services!: IServiceHealth[];
  totalServices!: number;
  healthyServices!: number;
  degradedServices!: number;
  failedServices!: number;
  lastUpdated!: Date;
}

export class SystemHealthSummaryResponseDto implements ISystemHealthSummary {
  overallStatus!: HealthStatus;
  totalWorkspaces!: number;
  healthyWorkspaces!: number;
  degradedWorkspaces!: number;
  failedWorkspaces!: number;
  services!: IServiceHealth[];
  lastUpdated!: Date;
}

export class HealthCheckResponseDto implements IHealthCheck {
  id!: string;
  workspaceId?: string;
  service?: AnalyticsService;
  type!: HealthCheckType;
  status!: HealthStatus;
  metrics?: IHealthMetrics;
  issues?: string[];
  triggeredBy?: string;
  completedAt!: Date;
  duration?: number;
}

export class HealthIncidentResponseDto implements IHealthIncident {
  id!: string;
  workspaceId?: string;
  service!: AnalyticsService;
  severity!: 'low' | 'medium' | 'high' | 'critical';
  status!: 'open' | 'investigating' | 'resolved';
  title!: string;
  description!: string;
  detectedAt!: Date;
  resolvedAt?: Date;
  affectedOperations?: number;
  errorSummary?: string;
  metadata?: Record<string, any>;
}

export class OperationStatusResponseDto implements IOperationStatus {
  operationType!: string;
  lastSuccessful?: Date;
  lastFailed?: Date;
  consecutiveFailures!: number;
  isStuck!: boolean;
  isDelayed!: boolean;
}
