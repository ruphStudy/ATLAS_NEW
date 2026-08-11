import {
  IDependencyIssue,
  IModuleBreakdownEntry,
  SaasHealthAggregateIncidentStatus,
  SaasHealthEvaluationTrigger,
  SaasHealthLevel,
  SaasHealthMaintenanceState,
} from '../interfaces';

export class TenantHealthResultResponseDto {
  workspaceId: string;
  level: SaasHealthLevel;
  healthScore: number;
  moduleBreakdown: IModuleBreakdownEntry[];
  cascadingImpacts: IDependencyIssue[];
  dependencyIssues: IDependencyIssue[];
  safeSummary: string;
}

export class PlatformHealthResultResponseDto {
  level: SaasHealthLevel;
  averageHealthScore: number;
  tenantsEvaluated: number;
  levelBreakdown: Record<string, number>;
}

export class OrganizationHealthResultResponseDto {
  organizationId: string;
  level: SaasHealthLevel;
  averageHealthScore: number;
  tenants: TenantHealthResultResponseDto[];
}

export class SaasHealthAggregateIncidentResponseDto {
  id: string;
  workspaceId: string;
  severity: SaasHealthLevel;
  status: SaasHealthAggregateIncidentStatus;
  triggerSummary: string;
  affectedModules: string[];
  cascadingFrom: string[];
  openedAt: Date;
  resolvedAt?: Date | null;
  durationMs?: number | null;
}

export class PaginatedSaasHealthAggregateIncidentResponseDto {
  data: SaasHealthAggregateIncidentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SaasHealthEvaluationLogResponseDto {
  id: string;
  workspaceId: string;
  level: SaasHealthLevel;
  previousLevel?: SaasHealthLevel | null;
  trigger: SaasHealthEvaluationTrigger;
  healthScore: number;
  moduleBreakdown: IModuleBreakdownEntry[];
  safeSummary?: string | null;
  evaluatedAt: Date;
}

export class PaginatedSaasHealthEvaluationLogResponseDto {
  data: SaasHealthEvaluationLogResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MaintenanceWindowResponseDto {
  id: string;
  workspaceId: string | null;
  module: string | null;
  reason: string;
  startAt: Date;
  endAt: Date;
  state: SaasHealthMaintenanceState;
  cancelledAt: Date | null;
  createdAt: Date;
}
