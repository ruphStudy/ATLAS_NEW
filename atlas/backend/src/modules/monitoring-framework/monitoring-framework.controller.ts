import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { MonitoringFrameworkService } from './monitoring-framework.service';
import {
  CreateMonitoringAlertRuleDto,
  CreateMonitoringSloDto,
  MonitoringAlertRuleFilterDto,
  MonitoringIncidentFilterDto,
  MonitoringSloFilterDto,
  ResolveMonitoringIncidentDto,
  UpdateMonitoringSloDto,
} from './dto';

@Controller({ path: 'monitoring-framework', version: '1' })
export class MonitoringFrameworkController {
  constructor(private readonly service: MonitoringFrameworkService) {}

  // ── Dashboards ───────────────────────────────────────────────

  @Get('dashboard/platform')
  getPlatformDashboard() {
    return this.service.getPlatformDashboard();
  }

  @Get('dashboard/workspace/:workspaceId')
  getWorkspaceDashboard(@Param('workspaceId') workspaceId: string, @WorkspaceId() callerWorkspaceId: string) {
    return this.service.getWorkspaceDashboard(workspaceId, callerWorkspaceId);
  }

  // ── SLOs ─────────────────────────────────────────────────────

  @Post('slos')
  createSlo(@WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string, @Body() dto: CreateMonitoringSloDto) {
    return this.service.createSlo(workspaceId, userId, userRole, dto);
  }

  @Get('slos')
  findSlos(@WorkspaceId() workspaceId: string, @Query() filter: MonitoringSloFilterDto) {
    return this.service.findSlos(workspaceId, filter);
  }

  @Get('slos/:id')
  findSloById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findSloById(id, workspaceId);
  }

  @Patch('slos/:id')
  updateSlo(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateMonitoringSloDto,
  ) {
    return this.service.updateSlo(id, workspaceId, userId, userRole, dto);
  }

  @Post('slos/:id/activate')
  activateSlo(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.activateSlo(id, workspaceId, userId, userRole);
  }

  @Post('slos/:id/pause')
  pauseSlo(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.pauseSlo(id, workspaceId, userId, userRole);
  }

  @Post('slos/:id/archive')
  archiveSlo(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.archiveSlo(id, workspaceId, userId, userRole);
  }

  @Post('slos/:id/restore')
  restoreSlo(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.restoreSlo(id, workspaceId, userId, userRole);
  }

  // ── Alert rules ──────────────────────────────────────────────

  @Post('alert-rules')
  createAlertRule(@WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string, @Body() dto: CreateMonitoringAlertRuleDto) {
    return this.service.createAlertRule(workspaceId, userId, userRole, dto);
  }

  @Get('alert-rules')
  findAlertRules(@WorkspaceId() workspaceId: string, @Query() filter: MonitoringAlertRuleFilterDto) {
    return this.service.findAlertRules(workspaceId, filter);
  }

  @Post('alert-rules/:id/activate')
  activateAlertRule(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.activateAlertRule(id, workspaceId, userId, userRole);
  }

  @Post('alert-rules/:id/pause')
  pauseAlertRule(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.pauseAlertRule(id, workspaceId, userId, userRole);
  }

  // ── Scheduled/manual evaluation ──────────────────────────────

  @Post('process-alert-evaluation')
  processAlertEvaluation() {
    return this.service.processAlertEvaluation();
  }

  @Post('detect-cascading-failures/:workspaceId')
  detectCascadingFailures(@Param('workspaceId') workspaceId: string) {
    return this.service.detectCascadingFailures(workspaceId);
  }

  // ── Incidents ────────────────────────────────────────────────

  @Get('incidents')
  findIncidents(@WorkspaceId() workspaceId: string, @Query() filter: MonitoringIncidentFilterDto) {
    return this.service.findIncidents(workspaceId, filter);
  }

  @Get('incidents/:id')
  getIncidentById(@Param('id') id: string) {
    return this.service.getIncidentById(id);
  }

  @Post('incidents/:id/acknowledge')
  acknowledgeIncident(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.acknowledgeIncident(id, workspaceId, userId, userRole);
  }

  @Post('incidents/:id/resolve')
  resolveIncident(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ResolveMonitoringIncidentDto,
  ) {
    return this.service.resolveIncident(id, workspaceId, userId, userRole, dto);
  }

  // ── Correlation trace ─────────────────────────────────────────

  @Get('correlation/:correlationId')
  getCorrelationTrace(@Param('correlationId') correlationId: string) {
    return this.service.getCorrelationTrace(correlationId);
  }
}
