import { OperationsHealthStatus, OperationsHealthIncidentStatus, OperationsHealthCheckTrigger, IOperationsHealthIssue } from '../interfaces';

export class OperationsHealthSnapshotResponseDto {
  id: string;
  workspaceId: string;
  module: string;
  status: OperationsHealthStatus;
  queueBacklog: number;
  queueFailedCount: number;
  queueActiveCount: number;
  queuePaused: boolean;
  oldestWaitingJobAgeMs?: number | null;
  auditFailureCount: number;
  consecutiveDegradedChecks: number;
  consecutiveHealthyChecks: number;
  issues: IOperationsHealthIssue[];
  safeSummary?: string | null;
  lastCheckedAt: Date;
  lastHealthyAt?: Date | null;
  lastDegradedAt?: Date | null;
  lastUnhealthyAt?: Date | null;
}

export class WorkspaceHealthSummaryResponseDto {
  workspaceId: string;
  overallStatus: OperationsHealthStatus;
  modules: OperationsHealthSnapshotResponseDto[];
}

export class OrganizationHealthSummaryResponseDto {
  organizationId: string;
  overallStatus: OperationsHealthStatus;
  workspaces: WorkspaceHealthSummaryResponseDto[];
}

export class OperationsHealthIncidentResponseDto {
  id: string;
  workspaceId: string;
  module: string;
  severity: OperationsHealthStatus;
  status: OperationsHealthIncidentStatus;
  triggerSummary: string;
  issues: IOperationsHealthIssue[];
  openedAt: Date;
  resolvedAt?: Date | null;
  durationMs?: number | null;
}

export class PaginatedIncidentResponseDto {
  data: OperationsHealthIncidentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class OperationsHealthCheckLogResponseDto {
  id: string;
  workspaceId: string;
  module: string;
  status: OperationsHealthStatus;
  previousStatus?: OperationsHealthStatus | null;
  trigger: OperationsHealthCheckTrigger;
  queueBacklog: number;
  queueFailedCount: number;
  auditFailureCount: number;
  issues: IOperationsHealthIssue[];
  safeSummary?: string | null;
  checkedAt: Date;
}

export class PaginatedCheckLogResponseDto {
  data: OperationsHealthCheckLogResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
