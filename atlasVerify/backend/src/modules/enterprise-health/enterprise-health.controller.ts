import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { SaasAuditRequiredReasonDto } from '@modules/saas-audit/dto';
import { EnterpriseHealthService } from './enterprise-health.service';
import { EnterpriseHealthIncidentFilterDto, RunEnterpriseHealthSweepDto } from './dto';

/**
 * EnterpriseHealthController — every organization-scoped route resolves
 * and boundary-checks `:organizationId` against the caller's own
 * workspace via `EnterpriseHealthService`/`EnterpriseHealthValidator`.
 * The `platform` route is the one exception, gated to `ADMIN`-tier
 * permission instead of an organization boundary.
 */
@Controller({ path: 'enterprise-health', version: '1' })
export class EnterpriseHealthController {
  constructor(private readonly service: EnterpriseHealthService) {}

  // ── Dashboards ──────────────────────────────────────────────────

  @Get('platform')
  getPlatformDashboard(@WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.getPlatformDashboard(workspaceId, userId, userRole);
  }

  @Get('organizations/:organizationId')
  getOrganizationDashboard(@Param('organizationId') organizationId: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.getOrganizationDashboard(organizationId, workspaceId, userId, userRole);
  }

  @Get('organizations/:organizationId/businesses/:businessId')
  getBusinessDashboard(
    @Param('organizationId') organizationId: string,
    @Param('businessId') businessId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ) {
    return this.service.getBusinessDashboard(organizationId, businessId, workspaceId, userId, userRole);
  }

  @Get('organizations/:organizationId/workspaces/:targetWorkspaceId')
  getWorkspaceDashboard(
    @Param('organizationId') organizationId: string,
    @Param('targetWorkspaceId') targetWorkspaceId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ) {
    return this.service.getWorkspaceDashboard(organizationId, targetWorkspaceId, workspaceId, userId, userRole);
  }

  @Get('organizations/:organizationId/regions/:region')
  getRegionDashboard(
    @Param('organizationId') organizationId: string,
    @Param('region') region: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ) {
    return this.service.getRegionDashboard(organizationId, region, workspaceId, userId, userRole);
  }

  @Get('organizations/:organizationId/providers/:provider')
  getProviderDashboard(
    @Param('organizationId') organizationId: string,
    @Param('provider') provider: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ) {
    return this.service.getProviderDashboard(organizationId, provider, workspaceId, userId, userRole);
  }

  // ── Detection sweep ────────────────────────────────────────────

  @Post('organizations/:organizationId/detection/sweep')
  runDetectionSweep(
    @Param('organizationId') organizationId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RunEnterpriseHealthSweepDto,
  ) {
    return this.service.runDetectionSweep(organizationId, workspaceId, userId, userRole, dto ?? {});
  }

  // ── Incidents ──────────────────────────────────────────────────

  @Get('organizations/:organizationId/incidents')
  listIncidents(
    @Param('organizationId') organizationId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() filter: EnterpriseHealthIncidentFilterDto,
  ) {
    return this.service.listIncidents(organizationId, workspaceId, userId, userRole, filter);
  }

  @Get('organizations/:organizationId/incidents/:id')
  getIncident(@Param('organizationId') organizationId: string, @Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.getIncident(organizationId, workspaceId, userId, userRole, id);
  }

  @Post('organizations/:organizationId/incidents/:id/acknowledge')
  acknowledgeIncident(@Param('organizationId') organizationId: string, @Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.acknowledgeIncident(organizationId, workspaceId, userId, userRole, id);
  }

  @Post('organizations/:organizationId/incidents/:id/resolve')
  resolveIncident(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: SaasAuditRequiredReasonDto,
  ) {
    return this.service.resolveIncident(organizationId, workspaceId, userId, userRole, id, dto);
  }
}
