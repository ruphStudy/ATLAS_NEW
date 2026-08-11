import { Controller, Get, Post, Patch, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { ApprovalWorkflowService } from './approval-workflow.service';
import {
  CreateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionDto,
  WorkflowDefinitionFilterDto,
  StartApprovalRequestDto,
  DecideApprovalDto,
  DelegateApprovalDto,
  ReassignApprovalDto,
  ApprovalActionReasonDto,
  RequestFilterDto,
  WorkflowDefinitionResponseDto,
  PaginatedWorkflowDefinitionResponseDto,
  WorkflowDefinitionHistoryResponseDto,
  ApprovalRequestResponseDto,
  PaginatedApprovalRequestResponseDto,
  ApprovalStepInstanceResponseDto,
  ApprovalAssignmentResponseDto,
  ApprovalDecisionResponseDto,
} from './dto';

@Controller({ path: 'approval-workflow', version: '1' })
export class ApprovalWorkflowController {
  constructor(private readonly approvalWorkflowService: ApprovalWorkflowService) {}

  // ── Workflow definitions ─────────────────────────────────────────

  @Post('definitions')
  @HttpCode(HttpStatus.CREATED)
  async createDefinition(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    return (await this.approvalWorkflowService.createDefinition(
      workspaceId,
      userId,
      dto,
    )) as unknown as WorkflowDefinitionResponseDto;
  }

  @Get('definitions')
  async findAllDefinitions(
    @WorkspaceId() workspaceId: string,
    @Query() filter: WorkflowDefinitionFilterDto,
  ): Promise<PaginatedWorkflowDefinitionResponseDto> {
    return this.approvalWorkflowService.findAllDefinitions(workspaceId, filter);
  }

  @Get('definitions/:id')
  async findDefinition(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<WorkflowDefinitionResponseDto> {
    return (await this.approvalWorkflowService.findDefinition(
      id,
      workspaceId,
    )) as unknown as WorkflowDefinitionResponseDto;
  }

  @Patch('definitions/:id')
  async updateDefinition(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdateWorkflowDefinitionDto,
  ): Promise<WorkflowDefinitionResponseDto> {
    return (await this.approvalWorkflowService.updateDefinition(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as WorkflowDefinitionResponseDto;
  }

  @Post('definitions/:id/publish')
  async publishDefinition(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<WorkflowDefinitionResponseDto> {
    return (await this.approvalWorkflowService.publishDefinition(
      id,
      workspaceId,
      userId,
    )) as unknown as WorkflowDefinitionResponseDto;
  }

  @Post('definitions/:id/pause')
  async pauseDefinition(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<WorkflowDefinitionResponseDto> {
    return (await this.approvalWorkflowService.pauseDefinition(
      id,
      workspaceId,
      userId,
    )) as unknown as WorkflowDefinitionResponseDto;
  }

  @Post('definitions/:id/archive')
  async archiveDefinition(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<WorkflowDefinitionResponseDto> {
    return (await this.approvalWorkflowService.archiveDefinition(
      id,
      workspaceId,
      userId,
    )) as unknown as WorkflowDefinitionResponseDto;
  }

  @Post('definitions/:id/restore')
  async restoreDefinition(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<WorkflowDefinitionResponseDto> {
    return (await this.approvalWorkflowService.restoreDefinition(
      id,
      workspaceId,
      userId,
    )) as unknown as WorkflowDefinitionResponseDto;
  }

  @Get('definitions/:id/history')
  async getDefinitionHistory(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<WorkflowDefinitionHistoryResponseDto[]> {
    return (await this.approvalWorkflowService.getDefinitionHistory(
      id,
      workspaceId,
    )) as unknown as WorkflowDefinitionHistoryResponseDto[];
  }

  // ── Requests ─────────────────────────────────────────────────────

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  async startRequest(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: StartApprovalRequestDto,
  ): Promise<ApprovalRequestResponseDto> {
    return (await this.approvalWorkflowService.startRequest(
      workspaceId,
      userId,
      dto,
    )) as unknown as ApprovalRequestResponseDto;
  }

  @Get('requests')
  async findAllRequests(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() filter: RequestFilterDto,
  ): Promise<PaginatedApprovalRequestResponseDto> {
    return this.approvalWorkflowService.findAllRequests(workspaceId, userId, userRole, filter);
  }

  @Post('process-expiry')
  async processExpiry(): Promise<{ expiredCount: number; escalatedCount: number }> {
    return this.approvalWorkflowService.processSlaAndEscalations();
  }

  @Get('requests/:id')
  async getRequest(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return (await this.approvalWorkflowService.getRequest(id, workspaceId)) as unknown as ApprovalRequestResponseDto;
  }

  @Get('requests/:id/steps')
  async getStepInstances(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<ApprovalStepInstanceResponseDto[]> {
    return (await this.approvalWorkflowService.getStepInstances(
      id,
      workspaceId,
    )) as unknown as ApprovalStepInstanceResponseDto[];
  }

  @Get('requests/:id/steps/:stepInstanceId/assignments')
  async getAssignmentsForStep(
    @Param('id') id: string,
    @Param('stepInstanceId') stepInstanceId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<ApprovalAssignmentResponseDto[]> {
    return (await this.approvalWorkflowService.getAssignmentsForStep(
      id,
      stepInstanceId,
      workspaceId,
    )) as unknown as ApprovalAssignmentResponseDto[];
  }

  @Get('requests/:id/decisions')
  async getDecisionHistory(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<ApprovalDecisionResponseDto[]> {
    return (await this.approvalWorkflowService.getDecisionHistory(
      id,
      workspaceId,
    )) as unknown as ApprovalDecisionResponseDto[];
  }

  @Post('requests/:id/steps/:stepInstanceId/decide')
  async decide(
    @Param('id') id: string,
    @Param('stepInstanceId') stepInstanceId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: DecideApprovalDto,
  ): Promise<ApprovalRequestResponseDto> {
    return (await this.approvalWorkflowService.decide(
      id,
      stepInstanceId,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as ApprovalRequestResponseDto;
  }

  @Post('requests/:id/steps/:stepInstanceId/delegate')
  async delegate(
    @Param('id') id: string,
    @Param('stepInstanceId') stepInstanceId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: DelegateApprovalDto,
  ): Promise<ApprovalDecisionResponseDto> {
    return (await this.approvalWorkflowService.delegate(
      id,
      stepInstanceId,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as ApprovalDecisionResponseDto;
  }

  @Post('requests/:id/steps/:stepInstanceId/assignments/:assignmentId/reassign')
  async reassign(
    @Param('id') id: string,
    @Param('stepInstanceId') stepInstanceId: string,
    @Param('assignmentId') assignmentId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ReassignApprovalDto,
  ): Promise<ApprovalDecisionResponseDto> {
    return (await this.approvalWorkflowService.reassign(
      id,
      stepInstanceId,
      assignmentId,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as ApprovalDecisionResponseDto;
  }

  @Post('requests/:id/resubmit')
  async resubmit(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ApprovalActionReasonDto,
  ): Promise<ApprovalRequestResponseDto> {
    return (await this.approvalWorkflowService.resubmit(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as ApprovalRequestResponseDto;
  }

  @Post('requests/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ApprovalActionReasonDto,
  ): Promise<ApprovalRequestResponseDto> {
    return (await this.approvalWorkflowService.cancel(
      id,
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as ApprovalRequestResponseDto;
  }

  @Post('requests/:id/recall')
  async recall(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ApprovalActionReasonDto,
  ): Promise<ApprovalRequestResponseDto> {
    return (await this.approvalWorkflowService.recall(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as ApprovalRequestResponseDto;
  }
}
