import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId, UserId } from '@common/decorators';
import { PlatformAdminGuard } from '@modules/tenant-isolation/guards/platform-admin.guard';
import { SaasHealthService } from './saas-health.service';
import { SaasHealthEvaluationTrigger } from './interfaces';
import {
  CreateMaintenanceWindowDto,
  SaasHealthAggregateIncidentFilterDto,
  SaasHealthEvaluationLogFilterDto,
  TenantHealthResultResponseDto,
  PlatformHealthResultResponseDto,
  OrganizationHealthResultResponseDto,
  SaasHealthAggregateIncidentResponseDto,
  PaginatedSaasHealthAggregateIncidentResponseDto,
  PaginatedSaasHealthEvaluationLogResponseDto,
  MaintenanceWindowResponseDto,
} from './dto';

/** Tenant-scoped routes rely on the already-global tenant-isolation guard/interceptor for `@WorkspaceId()` (same as SaaS Monitoring's own controller); only the cross-tenant platform/organization routes add `PlatformAdminGuard`. */
@Controller({ path: 'saas-health', version: '1' })
export class SaasHealthController {
  constructor(private readonly saasHealthService: SaasHealthService) {}

  // ── Evaluation ───────────────────────────────────────────────────

  @Post('evaluate')
  async evaluate(@WorkspaceId() workspaceId: string): Promise<TenantHealthResultResponseDto> {
    return (await this.saasHealthService.evaluateTenant(workspaceId, SaasHealthEvaluationTrigger.MANUAL)) as unknown as TenantHealthResultResponseDto;
  }

  @Post('process-scheduled')
  async processScheduled(): Promise<{ tenantsEvaluated: number }> {
    return this.saasHealthService.processScheduledEvaluations();
  }

  // ── Tenant-level views ───────────────────────────────────────────

  @Get('summary/tenant')
  async getTenantSnapshot(@WorkspaceId() workspaceId: string) {
    return this.saasHealthService.getTenantSnapshot(workspaceId);
  }

  @Get('incidents')
  async getIncidents(@WorkspaceId() workspaceId: string, @Query() filter: SaasHealthAggregateIncidentFilterDto): Promise<PaginatedSaasHealthAggregateIncidentResponseDto> {
    return this.saasHealthService.getIncidents(workspaceId, filter);
  }

  @Get('incidents/:id')
  async getIncident(@Param('id') id: string): Promise<SaasHealthAggregateIncidentResponseDto> {
    return (await this.saasHealthService.getIncident(id)) as unknown as SaasHealthAggregateIncidentResponseDto;
  }

  @Get('evaluation-logs')
  async getEvaluationLogs(@WorkspaceId() workspaceId: string, @Query() filter: SaasHealthEvaluationLogFilterDto): Promise<PaginatedSaasHealthEvaluationLogResponseDto> {
    return this.saasHealthService.getEvaluationLogs(workspaceId, filter);
  }

  // ── Maintenance windows ──────────────────────────────────────────

  @Post('maintenance-windows')
  async createMaintenanceWindow(@UserId() userId: string, @Body() dto: CreateMaintenanceWindowDto): Promise<MaintenanceWindowResponseDto> {
    const window = await this.saasHealthService.createMaintenanceWindow(userId, dto);
    return this.toMaintenanceWindowResponse(window);
  }

  @Get('maintenance-windows')
  async listMaintenanceWindows(@WorkspaceId() workspaceId: string): Promise<MaintenanceWindowResponseDto[]> {
    const windows = await this.saasHealthService.listMaintenanceWindows(workspaceId);
    return windows.map((w) => this.toMaintenanceWindowResponse(w));
  }

  @Get('maintenance-windows/:id')
  async getMaintenanceWindow(@Param('id') id: string): Promise<MaintenanceWindowResponseDto> {
    const window = await this.saasHealthService.getMaintenanceWindow(id);
    return this.toMaintenanceWindowResponse(window);
  }

  @Post('maintenance-windows/:id/cancel')
  async cancelMaintenanceWindow(@Param('id') id: string): Promise<MaintenanceWindowResponseDto> {
    const window = await this.saasHealthService.cancelMaintenanceWindow(id);
    return this.toMaintenanceWindowResponse(window);
  }

  // ── Platform/organization-level (cross-tenant) views ─────────────

  @UseGuards(PlatformAdminGuard)
  @Get('summary/platform')
  async getPlatformSummary(): Promise<PlatformHealthResultResponseDto> {
    return this.saasHealthService.getPlatformSummary();
  }

  @UseGuards(PlatformAdminGuard)
  @Get('summary/organization/:organizationId')
  async getOrganizationSummary(@Param('organizationId') organizationId: string): Promise<OrganizationHealthResultResponseDto> {
    return (await this.saasHealthService.getOrganizationSummary(organizationId)) as unknown as OrganizationHealthResultResponseDto;
  }

  @UseGuards(PlatformAdminGuard)
  @Get('platform/incidents')
  async getIncidentsPlatformWide(@Query() filter: SaasHealthAggregateIncidentFilterDto): Promise<PaginatedSaasHealthAggregateIncidentResponseDto> {
    return this.saasHealthService.getIncidentsPlatformWide(filter);
  }

  // ── Private helpers ──────────────────────────────────────────────

  private toMaintenanceWindowResponse(window: {
    id: string;
    workspaceId: string | null;
    module: string | null;
    reason: string;
    startAt: Date;
    endAt: Date;
    cancelledAt: Date | null;
    createdAt: Date;
  }): MaintenanceWindowResponseDto {
    return {
      id: window.id,
      workspaceId: window.workspaceId,
      module: window.module,
      reason: window.reason,
      startAt: window.startAt,
      endAt: window.endAt,
      state: this.saasHealthService.deriveMaintenanceState(window as any),
      cancelledAt: window.cancelledAt,
      createdAt: window.createdAt,
    };
  }
}
