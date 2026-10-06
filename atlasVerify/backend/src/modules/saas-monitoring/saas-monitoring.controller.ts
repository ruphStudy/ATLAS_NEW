import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId } from '@common/decorators';
import { PlatformAdminGuard } from '@modules/tenant-isolation/guards/platform-admin.guard';
import { IPaymentHealthResult } from '@modules/payment-provider/interfaces';
import { SaasMonitoringService } from './saas-monitoring.service';
import { SaasHealthCheckTrigger, SaasHealthModuleKey } from './interfaces';
import { SaasMonitoringModuleNotMonitoredException } from './exceptions/saas-monitoring.exceptions';
import {
  SaasHealthIncidentFilterDto,
  SaasHealthCheckLogFilterDto,
  SaasHealthSnapshotResponseDto,
  TenantHealthSummaryResponseDto,
  PlatformHealthSummaryResponseDto,
  SaasHealthIncidentResponseDto,
  PaginatedSaasHealthIncidentResponseDto,
  PaginatedSaasHealthCheckLogResponseDto,
} from './dto';

function parseModuleKey(module: string): SaasHealthModuleKey {
  if (!Object.values(SaasHealthModuleKey).includes(module as SaasHealthModuleKey)) {
    throw new SaasMonitoringModuleNotMonitoredException(module);
  }
  return module as SaasHealthModuleKey;
}

/** Tenant-scoped routes rely on the already-global tenant-isolation guard/interceptor (same as Operations Health's own controller) for `@WorkspaceId()`; only the cross-tenant platform routes add their own explicit `PlatformAdminGuard`. */
@Controller({ path: 'saas-monitoring', version: '1' })
export class SaasMonitoringController {
  constructor(private readonly saasMonitoringService: SaasMonitoringService) {}

  // ── Manual/scheduled checks ──────────────────────────────────────

  @Post('check')
  async checkAll(@WorkspaceId() workspaceId: string): Promise<SaasHealthSnapshotResponseDto[]> {
    return (await this.saasMonitoringService.checkAll(workspaceId, SaasHealthCheckTrigger.MANUAL)) as unknown as SaasHealthSnapshotResponseDto[];
  }

  @Post('check/:module')
  async checkModule(@Param('module') module: string, @WorkspaceId() workspaceId: string): Promise<SaasHealthSnapshotResponseDto> {
    return (await this.saasMonitoringService.checkModule(workspaceId, parseModuleKey(module), SaasHealthCheckTrigger.MANUAL)) as unknown as SaasHealthSnapshotResponseDto;
  }

  @Post('process-scheduled')
  async processScheduled(): Promise<{ workspacesChecked: number }> {
    return this.saasMonitoringService.processScheduledChecks();
  }

  // ── Tenant-level summaries ───────────────────────────────────────

  @Get('summary/tenant')
  async getTenantSummary(@WorkspaceId() workspaceId: string): Promise<TenantHealthSummaryResponseDto> {
    return (await this.saasMonitoringService.getTenantSummary(workspaceId)) as unknown as TenantHealthSummaryResponseDto;
  }

  @Get('modules/:module')
  async getModuleSnapshot(@Param('module') module: string, @WorkspaceId() workspaceId: string): Promise<SaasHealthSnapshotResponseDto | null> {
    return (await this.saasMonitoringService.getModuleSnapshot(workspaceId, parseModuleKey(module))) as unknown as SaasHealthSnapshotResponseDto | null;
  }

  /** Provider-level view — live payment-provider connection health for this tenant, never part of the routine sweep. */
  @Get('providers/payment')
  async getPaymentProviderHealth(@WorkspaceId() workspaceId: string): Promise<IPaymentHealthResult[]> {
    return this.saasMonitoringService.getPaymentProviderHealth(workspaceId);
  }

  @Get('incidents')
  async getIncidents(@WorkspaceId() workspaceId: string, @Query() filter: SaasHealthIncidentFilterDto): Promise<PaginatedSaasHealthIncidentResponseDto> {
    return this.saasMonitoringService.getIncidents(workspaceId, filter);
  }

  @Get('incidents/:id')
  async getIncident(@Param('id') id: string): Promise<SaasHealthIncidentResponseDto> {
    return (await this.saasMonitoringService.getIncident(id)) as unknown as SaasHealthIncidentResponseDto;
  }

  @Get('check-logs')
  async getCheckLogs(@WorkspaceId() workspaceId: string, @Query() filter: SaasHealthCheckLogFilterDto): Promise<PaginatedSaasHealthCheckLogResponseDto> {
    return this.saasMonitoringService.getCheckLogs(workspaceId, filter);
  }

  // ── Platform-level (cross-tenant) views ──────────────────────────

  @UseGuards(PlatformAdminGuard)
  @Get('summary/platform')
  async getPlatformSummary(): Promise<PlatformHealthSummaryResponseDto> {
    return this.saasMonitoringService.getPlatformSummary();
  }

  @UseGuards(PlatformAdminGuard)
  @Get('platform/incidents')
  async getIncidentsPlatformWide(@Query() filter: SaasHealthIncidentFilterDto): Promise<PaginatedSaasHealthIncidentResponseDto> {
    return this.saasMonitoringService.getIncidentsPlatformWide(filter);
  }
}
