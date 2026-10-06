import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnterpriseHealthIncidentStatus, EnterpriseHealthScope, MonitoringAlertSeverity, MonitoringHealthLevel } from '../interfaces';

export class EnterpriseHealthScoreBreakdownResponseDto {
  score!: number;
  availabilityScore!: number;
  latencyScore!: number;
  failureScore!: number;
  backlogScore!: number;
  dependencyScore!: number;
  securityScore!: number;
  recoveryScore!: number;
}

export class EnterpriseHealthDashboardResponseDto {
  scope!: EnterpriseHealthScope;
  organizationId?: string | null;
  scopeRef?: string | null;
  level!: MonitoringHealthLevel;
  @ApiPropertyOptional({ enum: MonitoringHealthLevel, nullable: true })
  previousLevel?: MonitoringHealthLevel | null;
  breakdown!: EnterpriseHealthScoreBreakdownResponseDto;
  openIncidentCount!: number;
  unhealthySourceKeys!: string[];
  generatedAt!: Date;
}

export class EnterpriseHealthIncidentResponseDto {
  id!: string;
  organizationId!: string;
  scope!: EnterpriseHealthScope;
  scopeRef?: string | null;
  severity!: MonitoringAlertSeverity;
  status!: EnterpriseHealthIncidentStatus;
  title!: string;
  description?: string | null;
  affectedSourceKeys!: string[];
  affectedRegions!: string[];
  affectedProviders!: string[];
  affectedWorkspaceIds!: string[];
  triggeredWorkflowExecutionId?: string | null;
  openedAt!: Date;
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  resolution?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedEnterpriseHealthIncidentResponseDto {
  data!: EnterpriseHealthIncidentResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class EnterpriseHealthSweepResultResponseDto {
  organizationId!: string;
  workspacesScanned!: number;
  incidentsCreated!: number;
  workflowsTriggered!: number;
}
