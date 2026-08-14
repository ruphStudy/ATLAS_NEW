import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { SaasAuditRequiredReasonDto } from '@modules/saas-audit/dto';
import { EnterpriseAuditService } from './enterprise-audit.service';
import {
  EnterpriseAuditTrailFilterDto,
  ExportEnterpriseAuditTrailDto,
  EnterpriseIncidentFilterDto,
  PaginatedEnterpriseAuditTrailResponseDto,
  EnterpriseAuditExportResponseDto,
  EnterpriseSecurityIncidentResponseDto,
  PaginatedEnterpriseSecurityIncidentResponseDto,
  EnterpriseAuditSweepResultResponseDto,
} from './dto';

/**
 * EnterpriseAuditController — every route is scoped to a single
 * `:organizationId` path segment, resolved and boundary-checked against
 * the caller's own workspace by `EnterpriseAuditService`/
 * `EnterpriseAuditValidator` on every call. This is the tenant-side
 * enterprise-admin counterpart to SaaS Audit's platform-admin controller —
 * never reachable across organizations, unlike `SaasAuditController`.
 */
@Controller({ path: 'enterprise-audit', version: '1' })
export class EnterpriseAuditController {
  constructor(private readonly service: EnterpriseAuditService) {}

  // ── Trail search / export / timelines ────────────────────────────

  @Get('organizations/:organizationId/trail')
  searchTrail(
    @Param('organizationId') organizationId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() filter: EnterpriseAuditTrailFilterDto,
  ): Promise<PaginatedEnterpriseAuditTrailResponseDto> {
    return this.service.searchTrail(organizationId, workspaceId, userId, userRole, filter);
  }

  @Get('organizations/:organizationId/trail/export')
  exportTrail(
    @Param('organizationId') organizationId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() dto: ExportEnterpriseAuditTrailDto,
  ): Promise<EnterpriseAuditExportResponseDto> {
    return this.service.exportTrail(organizationId, workspaceId, userId, userRole, dto);
  }

  @Get('organizations/:organizationId/entities/:entityType/:entityId/timeline')
  getEntityTimeline(
    @Param('organizationId') organizationId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() filter: EnterpriseAuditTrailFilterDto,
  ): Promise<PaginatedEnterpriseAuditTrailResponseDto> {
    return this.service.getEntityTimeline(organizationId, workspaceId, userId, userRole, entityType, entityId, filter);
  }

  @Get('organizations/:organizationId/actors/:actorId/timeline')
  getActorTimeline(
    @Param('organizationId') organizationId: string,
    @Param('actorId') actorId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() filter: EnterpriseAuditTrailFilterDto,
  ): Promise<PaginatedEnterpriseAuditTrailResponseDto> {
    return this.service.getActorTimeline(organizationId, workspaceId, userId, userRole, actorId, filter);
  }

  // ── Security incidents ────────────────────────────────────────────

  @Get('organizations/:organizationId/incidents')
  listIncidents(
    @Param('organizationId') organizationId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() filter: EnterpriseIncidentFilterDto,
  ): Promise<PaginatedEnterpriseSecurityIncidentResponseDto> {
    return this.service.listIncidents(organizationId, workspaceId, userId, userRole, filter);
  }

  @Get('organizations/:organizationId/incidents/:id')
  async getIncident(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<EnterpriseSecurityIncidentResponseDto> {
    return (await this.service.getIncident(organizationId, workspaceId, userId, userRole, id)) as unknown as EnterpriseSecurityIncidentResponseDto;
  }

  @Post('organizations/:organizationId/incidents/:id/acknowledge')
  async acknowledgeIncident(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<EnterpriseSecurityIncidentResponseDto> {
    return (await this.service.acknowledgeIncident(organizationId, workspaceId, userId, userRole, id)) as unknown as EnterpriseSecurityIncidentResponseDto;
  }

  @Post('organizations/:organizationId/incidents/:id/resolve')
  async resolveIncident(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: SaasAuditRequiredReasonDto,
  ): Promise<EnterpriseSecurityIncidentResponseDto> {
    return (await this.service.resolveIncident(organizationId, workspaceId, userId, userRole, id, dto)) as unknown as EnterpriseSecurityIncidentResponseDto;
  }

  @Post('organizations/:organizationId/incidents/:id/dismiss')
  async dismissIncident(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: SaasAuditRequiredReasonDto,
  ): Promise<EnterpriseSecurityIncidentResponseDto> {
    return (await this.service.dismissIncident(organizationId, workspaceId, userId, userRole, id, dto)) as unknown as EnterpriseSecurityIncidentResponseDto;
  }

  // ── Policy-violation sweep ─────────────────────────────────────────

  @Post('organizations/:organizationId/detection/policy-sweep')
  runPolicyViolationSweep(
    @Param('organizationId') organizationId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<EnterpriseAuditSweepResultResponseDto> {
    return this.service.runPolicyViolationSweep(organizationId, workspaceId, userId, userRole);
  }
}
