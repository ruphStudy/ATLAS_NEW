import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { WorkspaceId } from '@common/decorators';
import { OperationsHealthService } from './operations-health.service';
import { OperationsHealthCheckTrigger, OperationsHealthModuleKey } from './interfaces';
import { OperationsHealthModuleNotMonitoredException } from './exceptions/operations-health.exceptions';
import {
  IncidentFilterDto,
  CheckLogFilterDto,
  OrganizationSummaryQueryDto,
  OperationsHealthSnapshotResponseDto,
  WorkspaceHealthSummaryResponseDto,
  OrganizationHealthSummaryResponseDto,
  OperationsHealthIncidentResponseDto,
  PaginatedIncidentResponseDto,
  PaginatedCheckLogResponseDto,
} from './dto';

function parseModuleKey(module: string): OperationsHealthModuleKey {
  if (!Object.values(OperationsHealthModuleKey).includes(module as OperationsHealthModuleKey)) {
    throw new OperationsHealthModuleNotMonitoredException(module);
  }
  return module as OperationsHealthModuleKey;
}

@Controller({ path: 'operations-health', version: '1' })
export class OperationsHealthController {
  constructor(private readonly operationsHealthService: OperationsHealthService) {}

  // ── Manual/scheduled checks ──────────────────────────────────────

  @Post('check')
  async checkAll(@WorkspaceId() workspaceId: string): Promise<OperationsHealthSnapshotResponseDto[]> {
    return (await this.operationsHealthService.checkAll(workspaceId, OperationsHealthCheckTrigger.MANUAL)) as unknown as OperationsHealthSnapshotResponseDto[];
  }

  @Post('check/:module')
  async checkModule(
    @Param('module') module: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<OperationsHealthSnapshotResponseDto> {
    return (await this.operationsHealthService.checkModule(
      workspaceId,
      parseModuleKey(module),
      OperationsHealthCheckTrigger.MANUAL,
    )) as unknown as OperationsHealthSnapshotResponseDto;
  }

  @Post('process-scheduled')
  async processScheduled(): Promise<{ workspacesChecked: number }> {
    return this.operationsHealthService.processScheduledChecks();
  }

  // ── Summaries ────────────────────────────────────────────────────

  @Get('summary/workspace')
  async getWorkspaceSummary(@WorkspaceId() workspaceId: string): Promise<WorkspaceHealthSummaryResponseDto> {
    return (await this.operationsHealthService.getWorkspaceSummary(workspaceId)) as unknown as WorkspaceHealthSummaryResponseDto;
  }

  @Get('summary/organization/:organizationId')
  async getOrganizationSummary(
    @Param('organizationId') organizationId: string,
    @Query() query: OrganizationSummaryQueryDto,
  ): Promise<OrganizationHealthSummaryResponseDto> {
    return (await this.operationsHealthService.getOrganizationSummary(
      organizationId,
      query.workspaceIds,
    )) as unknown as OrganizationHealthSummaryResponseDto;
  }

  @Get('modules/:module')
  async getModuleSnapshot(
    @Param('module') module: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<OperationsHealthSnapshotResponseDto | null> {
    return (await this.operationsHealthService.getModuleSnapshot(
      workspaceId,
      parseModuleKey(module),
    )) as unknown as OperationsHealthSnapshotResponseDto | null;
  }

  // ── Incidents ────────────────────────────────────────────────────

  @Get('incidents')
  async getIncidents(
    @WorkspaceId() workspaceId: string,
    @Query() filter: IncidentFilterDto,
  ): Promise<PaginatedIncidentResponseDto> {
    return this.operationsHealthService.getIncidents(workspaceId, filter);
  }

  @Get('incidents/:id')
  async getIncident(@Param('id') id: string): Promise<OperationsHealthIncidentResponseDto> {
    return (await this.operationsHealthService.getIncident(id)) as unknown as OperationsHealthIncidentResponseDto;
  }

  // ── Check history ────────────────────────────────────────────────

  @Get('check-logs')
  async getCheckLogs(
    @WorkspaceId() workspaceId: string,
    @Query() filter: CheckLogFilterDto,
  ): Promise<PaginatedCheckLogResponseDto> {
    return this.operationsHealthService.getCheckLogs(workspaceId, filter);
  }
}
