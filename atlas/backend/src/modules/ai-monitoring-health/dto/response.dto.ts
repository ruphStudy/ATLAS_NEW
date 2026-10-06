import {
  AiHealthStatus,
  AiHealthCheckType,
  IAiHealthCheck,
  IAiHealthIncident,
  IAiHealthSummary,
} from '../interfaces';

export class HealthCheckResponseDto implements IAiHealthCheck {
  id!: string;
  workspaceId!: string;
  checkType!: AiHealthCheckType;
  targetId?: string;
  targetName!: string;
  provider?: string;
  model?: string;
  capability?: string;
  status!: AiHealthStatus;
  previousStatus?: AiHealthStatus;
  availabilityPercent?: number;
  averageLatencyMs?: number;
  p95LatencyMs?: number;
  p99LatencyMs?: number;
  throughputRpm?: number;
  successCount!: number;
  failureCount!: number;
  retryCount!: number;
  fallbackCount!: number;
  rateLimitHits!: number;
  quotaRemaining?: number;
  budgetRemaining?: number;
  totalTokensUsed!: number;
  totalCost!: number;
  lastCheckAt!: Date;
  checkDurationMs?: number;
  errorMessage?: string;
  errorCode?: string;
  errorDetails?: unknown;
  isManual!: boolean;
  scheduledCheck!: boolean;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
}

export class PaginatedHealthCheckResponseDto {
  data!: HealthCheckResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class HealthIncidentResponseDto implements IAiHealthIncident {
  id!: string;
  workspaceId!: string;
  healthCheckId?: string;
  incidentType!: string;
  severity!: string;
  checkType!: AiHealthCheckType;
  targetId?: string;
  targetName!: string;
  provider?: string;
  model?: string;
  capability?: string;
  status!: string;
  title!: string;
  description!: string;
  detectedAt!: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  resolutionTime?: number;
  affectedRequests!: number;
  failureRate?: number;
  rootCause?: string;
  resolution?: string;
  tags!: string[];
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedHealthIncidentResponseDto {
  data!: HealthIncidentResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class HealthSummaryResponseDto implements IAiHealthSummary {
  id!: string;
  workspaceId!: string;
  checkType!: AiHealthCheckType;
  targetName!: string;
  provider?: string;
  model?: string;
  overallStatus!: AiHealthStatus;
  uptimePercent!: number;
  averageLatencyMs!: number;
  totalRequests!: number;
  successRate!: number;
  activeIncidents!: number;
  totalIncidents!: number;
  lastHealthyAt?: Date;
  lastCheckedAt!: Date;
  periodStart!: Date;
  periodEnd!: Date;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
}
