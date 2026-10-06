import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { DisasterRecoveryService } from './disaster-recovery.service';
import {
  CreateDrPolicyDto,
  CreateDrRecoveryPlanDto,
  DetectDrDisasterDto,
  DrExecutionFilterDto,
  DrPolicyFilterDto,
  DrRecoveryPlanFilterDto,
  TriggerDrRecoveryDto,
  UpdateDrPolicyDto,
  UpdateDrRecoveryPlanDto,
} from './dto';

@Controller({ path: 'disaster-recovery', version: '1' })
export class DisasterRecoveryController {
  constructor(private readonly service: DisasterRecoveryService) {}

  // ── Policies ─────────────────────────────────────────────────

  @Post('policies')
  createPolicy(@WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string, @Body() dto: CreateDrPolicyDto) {
    return this.service.createPolicy(workspaceId, userId, userRole, dto);
  }

  @Get('policies')
  findPolicies(@WorkspaceId() workspaceId: string, @Query() filter: DrPolicyFilterDto) {
    return this.service.findPolicies(workspaceId, filter);
  }

  @Get('policies/:id')
  findPolicyById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findPolicyById(id, workspaceId);
  }

  @Patch('policies/:id')
  updatePolicy(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateDrPolicyDto,
  ) {
    return this.service.updatePolicy(id, workspaceId, userId, userRole, dto);
  }

  @Post('policies/:id/activate')
  activatePolicy(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.activatePolicy(id, workspaceId, userId, userRole);
  }

  @Post('policies/:id/pause')
  pausePolicy(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.pausePolicy(id, workspaceId, userId, userRole);
  }

  @Post('policies/:id/archive')
  archivePolicy(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.archivePolicy(id, workspaceId, userId, userRole);
  }

  @Post('policies/:id/restore')
  restorePolicy(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.restorePolicy(id, workspaceId, userId, userRole);
  }

  @Get('policies/:id/history')
  getPolicyHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getPolicyHistory(id, workspaceId);
  }

  // ── Recovery plans ───────────────────────────────────────────

  @Post('plans')
  createPlan(@WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string, @Body() dto: CreateDrRecoveryPlanDto) {
    return this.service.createPlan(workspaceId, userId, userRole, dto);
  }

  @Get('plans')
  findPlans(@WorkspaceId() workspaceId: string, @Query() filter: DrRecoveryPlanFilterDto) {
    return this.service.findPlans(workspaceId, filter);
  }

  @Get('plans/:id')
  findPlanById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findPlanById(id, workspaceId);
  }

  @Patch('plans/:id')
  updatePlan(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateDrRecoveryPlanDto,
  ) {
    return this.service.updatePlan(id, workspaceId, userId, userRole, dto);
  }

  @Post('plans/:id/publish')
  publishPlan(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.publishPlan(id, workspaceId, userId, userRole);
  }

  @Post('plans/:id/archive')
  archivePlan(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.archivePlan(id, workspaceId, userId, userRole);
  }

  // ── Recovery execution ────────────────────────────────────────

  @Post('plans/:id/trigger')
  triggerRecovery(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: TriggerDrRecoveryDto,
  ) {
    return this.service.triggerRecovery(workspaceId, userId, userRole, id, dto);
  }

  @Post('disasters/detect')
  detectDisaster(@WorkspaceId() workspaceId: string, @UserId() userId: string, @Body() dto: DetectDrDisasterDto) {
    return this.service.detectDisaster(workspaceId, userId, dto);
  }

  @Get('executions')
  findExecutions(@WorkspaceId() workspaceId: string, @Query() filter: DrExecutionFilterDto) {
    return this.service.findExecutions(workspaceId, filter);
  }

  @Get('executions/:id')
  getExecutionById(@Param('id') id: string) {
    return this.service.getExecutionById(id);
  }

  @Post('executions/:id/cancel')
  cancelExecution(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.cancelExecution(id, workspaceId, userId, userRole);
  }

  @Post('executions/:id/rollback')
  rollbackExecution(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string) {
    return this.service.rollbackExecution(id, workspaceId, userId, userRole);
  }

  @Post('locks/:scopeKey/force-release')
  forceReleaseLock(
    @Param('scopeKey') scopeKey: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ) {
    return this.service.forceReleaseLock(scopeKey, workspaceId, userId, userRole);
  }
}
