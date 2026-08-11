import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserId } from '@common/decorators';
import { PlatformAdminGuard } from '@modules/tenant-isolation/guards/platform-admin.guard';
import { AdminActionLogFilterDto, ImpersonationSessionFilterDto, PaginatedAdminActionLogResponseDto, PaginatedImpersonationSessionResponseDto } from '@modules/saas-administration/dto';
import { SaasAuditService } from './saas-audit.service';
import {
  SaasAuditTrailFilterDto,
  ExportAuditTrailDto,
  SaasIncidentFilterDto,
  SaasAuditRequiredReasonDto,
  CreateAuditArchiveDto,
  SaasAuditArchiveFilterDto,
  PaginatedSaasAuditTrailResponseDto,
  SaasAuditExportResponseDto,
  SaasSecurityIncidentResponseDto,
  PaginatedSaasSecurityIncidentResponseDto,
  SaasAuditArchiveResponseDto,
  PaginatedSaasAuditArchiveResponseDto,
  DetectionSweepResultResponseDto,
  RetentionPurgeResultResponseDto,
} from './dto';

/** Every route here is platform-admin-gated — this is the cross-tenant counterpart to Audit Logs' own per-tenant controller (`OWNER`/`ADMIN`/`MANAGER` there), never reachable by an ordinary workspace member. */
@UseGuards(PlatformAdminGuard)
@Controller({ path: 'saas-audit', version: '1' })
export class SaasAuditController {
  constructor(private readonly saasAuditService: SaasAuditService) {}

  // ── Cross-tenant search ──────────────────────────────────────────

  @Get('trail')
  async searchAuditTrail(@Query() filter: SaasAuditTrailFilterDto): Promise<PaginatedSaasAuditTrailResponseDto> {
    return this.saasAuditService.searchAuditTrail(filter);
  }

  @Get('trail/export')
  async exportAuditTrail(@Query() dto: ExportAuditTrailDto): Promise<SaasAuditExportResponseDto> {
    return this.saasAuditService.exportAuditTrail(dto);
  }

  @Get('admin-actions')
  async searchAdminActions(@Query() filter: AdminActionLogFilterDto): Promise<PaginatedAdminActionLogResponseDto> {
    return this.saasAuditService.searchAdminActions(filter);
  }

  @Get('impersonation-sessions')
  async listImpersonationSessions(@Query() filter: ImpersonationSessionFilterDto): Promise<PaginatedImpersonationSessionResponseDto> {
    return this.saasAuditService.listImpersonationSessions(filter);
  }

  // ── Detection sweep ───────────────────────────────────────────────

  @Post('detection/sweep')
  async runDetectionSweep(@Query('workspaceId') workspaceId?: string): Promise<DetectionSweepResultResponseDto> {
    return this.saasAuditService.runDetectionSweep(workspaceId);
  }

  // ── Security incidents ───────────────────────────────────────────

  @Get('incidents')
  async listIncidents(@Query() filter: SaasIncidentFilterDto): Promise<PaginatedSaasSecurityIncidentResponseDto> {
    return this.saasAuditService.listIncidents(filter);
  }

  @Get('incidents/:id')
  async getIncident(@Param('id') id: string): Promise<SaasSecurityIncidentResponseDto> {
    return (await this.saasAuditService.getIncident(id)) as unknown as SaasSecurityIncidentResponseDto;
  }

  @Post('incidents/:id/acknowledge')
  async acknowledgeIncident(@Param('id') id: string, @UserId() userId: string): Promise<SaasSecurityIncidentResponseDto> {
    return (await this.saasAuditService.acknowledgeIncident(id, userId)) as unknown as SaasSecurityIncidentResponseDto;
  }

  @Post('incidents/:id/resolve')
  async resolveIncident(@Param('id') id: string, @UserId() userId: string, @Body() dto: SaasAuditRequiredReasonDto): Promise<SaasSecurityIncidentResponseDto> {
    return (await this.saasAuditService.resolveIncident(id, userId, dto)) as unknown as SaasSecurityIncidentResponseDto;
  }

  @Post('incidents/:id/dismiss')
  async dismissIncident(@Param('id') id: string, @UserId() userId: string, @Body() dto: SaasAuditRequiredReasonDto): Promise<SaasSecurityIncidentResponseDto> {
    return (await this.saasAuditService.dismissIncident(id, userId, dto)) as unknown as SaasSecurityIncidentResponseDto;
  }

  // ── Archival + retention ──────────────────────────────────────────

  @Post('archives')
  async createArchive(@UserId() userId: string, @Body() dto: CreateAuditArchiveDto): Promise<SaasAuditArchiveResponseDto> {
    return (await this.saasAuditService.createArchive(userId, dto)) as unknown as SaasAuditArchiveResponseDto;
  }

  @Get('archives')
  async listArchives(@Query() filter: SaasAuditArchiveFilterDto): Promise<PaginatedSaasAuditArchiveResponseDto> {
    return this.saasAuditService.listArchives(filter);
  }

  @Get('archives/:id')
  async getArchive(@Param('id') id: string): Promise<SaasAuditArchiveResponseDto> {
    return (await this.saasAuditService.getArchive(id)) as unknown as SaasAuditArchiveResponseDto;
  }

  @Get('archives/:id/download')
  async downloadArchive(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { buffer } = await this.saasAuditService.downloadArchive(id);
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="saas-audit-archive-${id}.json"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Post('retention/purge')
  async purgeRetention(@Query('retentionDays') retentionDays?: string): Promise<RetentionPurgeResultResponseDto> {
    return this.saasAuditService.purgeRetentionAcrossTenants(retentionDays ? Number(retentionDays) : undefined);
  }
}
