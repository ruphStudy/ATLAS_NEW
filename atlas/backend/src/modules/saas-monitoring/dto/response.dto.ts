import { ApiPropertyOptional } from '@nestjs/swagger';
import { SaasHealthStatus, SaasHealthIncidentStatus, SaasHealthCheckTrigger, ISaasHealthIssue } from '../interfaces';

export class SaasHealthSnapshotResponseDto {
  id!: string;
  workspaceId!: string;
  module!: string;
  status!: SaasHealthStatus;
  queueBacklog!: number;
  queueFailedCount!: number;
  queueActiveCount!: number;
  queuePaused!: boolean;
  oldestWaitingJobAgeMs?: number | null;
  auditFailureCount!: number;
  consecutiveDegradedChecks!: number;
  consecutiveHealthyChecks!: number;
  issues!: ISaasHealthIssue[];
  safeSummary?: string | null;
  lastCheckedAt!: Date;
  lastHealthyAt?: Date | null;
  lastDegradedAt?: Date | null;
  lastUnhealthyAt?: Date | null;
}

export class TenantHealthSummaryResponseDto {
  workspaceId!: string;
  overallStatus!: SaasHealthStatus;
  modules!: SaasHealthSnapshotResponseDto[];
}

export class ModuleBreakdownResponseDto {
  healthy!: number;
  degraded!: number;
  unhealthy!: number;
}

export class PlatformHealthSummaryResponseDto {
  overallStatus!: SaasHealthStatus;
  tenantsChecked!: number;
  moduleBreakdown!: Record<string, ModuleBreakdownResponseDto>;
}

export class SaasHealthIncidentResponseDto {
  id!: string;
  workspaceId!: string;
  module!: string;
  severity!: SaasHealthStatus;
  status!: SaasHealthIncidentStatus;
  triggerSummary!: string;
  issues!: ISaasHealthIssue[];
  openedAt!: Date;
  resolvedAt?: Date | null;
  durationMs?: number | null;
}

export class PaginatedSaasHealthIncidentResponseDto {
  data!: SaasHealthIncidentResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class SaasHealthCheckLogResponseDto {
  id!: string;
  workspaceId!: string;
  module!: string;
  status!: SaasHealthStatus;
  @ApiPropertyOptional({ enum: SaasHealthStatus, nullable: true })
  previousStatus?: SaasHealthStatus | null;
  trigger!: SaasHealthCheckTrigger;
  queueBacklog!: number;
  queueFailedCount!: number;
  auditFailureCount!: number;
  issues!: ISaasHealthIssue[];
  safeSummary?: string | null;
  checkedAt!: Date;
}

export class PaginatedSaasHealthCheckLogResponseDto {
  data!: SaasHealthCheckLogResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
