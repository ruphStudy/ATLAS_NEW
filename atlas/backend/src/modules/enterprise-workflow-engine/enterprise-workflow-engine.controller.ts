import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { EnterpriseWorkflowEngineService } from './enterprise-workflow-engine.service';
import {
  CreateWorkflowDefinitionDto,
  ExecuteWorkflowDto,
  ReassignStepDto,
  ResumeStepExecutionDto,
  UpdateWorkflowDefinitionDto,
  WorkflowActionReasonDto,
  WorkflowDefinitionFilterDto,
  WorkflowExecutionFilterDto,
} from './dto';

@Controller({ path: 'enterprise-workflow-engine', version: '1' })
export class EnterpriseWorkflowEngineController {
  constructor(private readonly service: EnterpriseWorkflowEngineService) {}

  // ── Definitions ──────────────────────────────────────────────

  @Post('definitions')
  createDefinition(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateWorkflowDefinitionDto,
  ) {
    return this.service.createDefinition(workspaceId, userId, userRole, dto);
  }

  @Get('definitions')
  findDefinitions(@WorkspaceId() workspaceId: string, @Query() filter: WorkflowDefinitionFilterDto) {
    return this.service.findDefinitions(workspaceId, filter);
  }

  @Get('definitions/:id')
  findDefinitionById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findDefinitionById(id, workspaceId);
  }

  @Patch('definitions/:id')
  updateDefinition(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateWorkflowDefinitionDto,
  ) {
    return this.service.updateDefinition(id, workspaceId, userId, userRole, dto);
  }

  @Post('definitions/:id/publish')
  publishDefinition(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.publishDefinition(id, workspaceId, userId, userRole);
  }

  @Post('definitions/:id/pause')
  pauseDefinition(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.pauseDefinition(id, workspaceId, userId, userRole);
  }

  @Post('definitions/:id/resume')
  resumeDefinition(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.resumeDefinition(id, workspaceId, userId, userRole);
  }

  @Post('definitions/:id/archive')
  archiveDefinition(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.archiveDefinition(id, workspaceId, userId, userRole);
  }

  @Post('definitions/:id/restore')
  restoreDefinition(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.restoreDefinition(id, workspaceId, userId, userRole);
  }

  @Get('definitions/:id/history')
  getDefinitionHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getDefinitionHistory(id, workspaceId);
  }

  // ── Execution ────────────────────────────────────────────────

  @Post('executions')
  executeWorkflow(@WorkspaceId() workspaceId: string, @UserId() userId: string, @Body() dto: ExecuteWorkflowDto) {
    return this.service.executeWorkflow(workspaceId, userId, dto);
  }

  @Get('executions')
  findExecutions(@WorkspaceId() workspaceId: string, @Query() filter: WorkflowExecutionFilterDto) {
    return this.service.findExecutions(filter, workspaceId);
  }

  @Get('executions/:id')
  findExecutionById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findExecutionById(id, workspaceId);
  }

  @Post('executions/:id/pause')
  pauseExecution(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId?: string) {
    return this.service.pauseExecution(id, workspaceId, userId);
  }

  @Post('executions/:id/resume')
  resumeExecution(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId?: string) {
    return this.service.resumeExecution(id, workspaceId, userId);
  }

  @Post('executions/:id/cancel')
  cancelExecution(@Param('id') id: string, @WorkspaceId() workspaceId: string, @Body() dto: WorkflowActionReasonDto, @UserId() userId?: string) {
    return this.service.cancelExecution(id, workspaceId, userId, dto.reason);
  }

  @Post('executions/:id/steps/:stepExecutionId/resume')
  resumeStepExecution(
    @Param('id') id: string,
    @Param('stepExecutionId') stepExecutionId: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ResumeStepExecutionDto,
    @UserId() userId?: string,
  ) {
    return this.service.resumeStepExecution(id, workspaceId, stepExecutionId, dto, userId);
  }

  @Post('executions/:id/steps/:stepExecutionId/reassign')
  reassignStep(
    @Param('id') id: string,
    @Param('stepExecutionId') stepExecutionId: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ReassignStepDto,
    @UserId() userId?: string,
  ) {
    return this.service.reassignStep(id, workspaceId, stepExecutionId, dto, userId);
  }

  // ── Scheduled polling ──────────────────────────────────────────

  @Post('process-due-timers')
  processDueTimers() {
    return this.service.processDueTimers();
  }

  @Post('process-escalations')
  processEscalations() {
    return this.service.processEscalations();
  }
}
