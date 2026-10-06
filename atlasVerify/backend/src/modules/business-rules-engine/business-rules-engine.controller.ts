import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { BusinessRulesEngineService } from './business-rules-engine.service';
import { RuleTriggerType } from './interfaces';
import {
  CreateRuleDto,
  UpdateRuleDto,
  RuleFilterDto,
  RollbackRuleDto,
  EvaluateRulesDto,
  SimulateRuleDto,
  RuleExecutionFilterDto,
  RuleResponseDto,
  PaginatedRuleResponseDto,
  RuleHistoryResponseDto,
  RuleValidationIssueResponseDto,
  RuleEvaluationResponseDto,
  RuleSimulationResponseDto,
  RuleExecutionResponseDto,
  PaginatedRuleExecutionResponseDto,
} from './dto';

@Controller({ path: 'business-rules-engine', version: '1' })
export class BusinessRulesEngineController {
  constructor(private readonly businessRulesEngineService: BusinessRulesEngineService) {}

  // ── Evaluation (API-triggered) ───────────────────────────────────

  @Post('evaluate')
  async evaluate(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: EvaluateRulesDto,
  ): Promise<RuleEvaluationResponseDto> {
    return (await this.businessRulesEngineService.evaluate({
      workspaceId,
      module: dto.module,
      triggerType: dto.triggerType ?? RuleTriggerType.API,
      triggerRef: dto.triggerRef,
      entityType: dto.entityType,
      entityId: dto.entityId,
      input: dto.input,
      idempotencyKey: dto.idempotencyKey,
      userId,
    })) as unknown as RuleEvaluationResponseDto;
  }

  @Post('process-scheduled')
  async processScheduled(): Promise<{ processedCount: number }> {
    return this.businessRulesEngineService.processDueScheduledRules();
  }

  @Post('validate')
  validateDefinition(@Body() dto: CreateRuleDto): RuleValidationIssueResponseDto[] {
    return this.businessRulesEngineService.validateDefinition(dto) as unknown as RuleValidationIssueResponseDto[];
  }

  // ── Executions ───────────────────────────────────────────────────

  @Get('executions')
  async getExecutions(
    @WorkspaceId() workspaceId: string,
    @Query() filter: RuleExecutionFilterDto,
  ): Promise<PaginatedRuleExecutionResponseDto> {
    return this.businessRulesEngineService.getExecutions(workspaceId, filter);
  }

  @Get('executions/:id')
  async getExecution(@Param('id') id: string): Promise<RuleExecutionResponseDto> {
    return (await this.businessRulesEngineService.getExecution(id)) as unknown as RuleExecutionResponseDto;
  }

  // ── Rules ────────────────────────────────────────────────────────

  @Post('rules')
  async createRule(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateRuleDto,
  ): Promise<RuleResponseDto> {
    return (await this.businessRulesEngineService.createRule(workspaceId, userId, userRole, dto)) as unknown as RuleResponseDto;
  }

  @Get('rules')
  async findAllRules(
    @WorkspaceId() workspaceId: string,
    @Query() filter: RuleFilterDto,
  ): Promise<PaginatedRuleResponseDto> {
    return this.businessRulesEngineService.findAllRules(workspaceId, filter);
  }

  @Get('rules/:id')
  async getRule(@Param('id') id: string): Promise<RuleResponseDto> {
    return (await this.businessRulesEngineService.getRule(id)) as unknown as RuleResponseDto;
  }

  @Patch('rules/:id')
  async updateRule(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateRuleDto,
  ): Promise<RuleResponseDto> {
    return (await this.businessRulesEngineService.updateRule(id, workspaceId, userId, userRole, dto)) as unknown as RuleResponseDto;
  }

  @Get('rules/:id/history')
  async getRuleHistory(@Param('id') id: string): Promise<RuleHistoryResponseDto[]> {
    return (await this.businessRulesEngineService.getRuleHistory(id)) as unknown as RuleHistoryResponseDto[];
  }

  @Get('rules/:id/validate')
  async validateRule(@Param('id') id: string): Promise<RuleValidationIssueResponseDto[]> {
    return (await this.businessRulesEngineService.validateRule(id)) as unknown as RuleValidationIssueResponseDto[];
  }

  @Post('rules/:id/simulate')
  async simulateRule(@Param('id') id: string, @Body() dto: SimulateRuleDto): Promise<RuleSimulationResponseDto> {
    return (await this.businessRulesEngineService.simulateRule(id, dto)) as unknown as RuleSimulationResponseDto;
  }

  @Post('rules/:id/publish')
  async publishRule(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<RuleResponseDto> {
    return (await this.businessRulesEngineService.publishRule(id, workspaceId, userId, userRole)) as unknown as RuleResponseDto;
  }

  @Post('rules/:id/enable')
  async enableRule(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<RuleResponseDto> {
    return (await this.businessRulesEngineService.enableRule(id, workspaceId, userId, userRole)) as unknown as RuleResponseDto;
  }

  @Post('rules/:id/disable')
  async disableRule(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<RuleResponseDto> {
    return (await this.businessRulesEngineService.disableRule(id, workspaceId, userId, userRole)) as unknown as RuleResponseDto;
  }

  @Post('rules/:id/archive')
  async archiveRule(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<RuleResponseDto> {
    return (await this.businessRulesEngineService.archiveRule(id, workspaceId, userId, userRole)) as unknown as RuleResponseDto;
  }

  @Post('rules/:id/restore')
  async restoreRule(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
  ): Promise<RuleResponseDto> {
    return (await this.businessRulesEngineService.restoreRule(id, workspaceId, userId, userRole)) as unknown as RuleResponseDto;
  }

  @Post('rules/:id/rollback')
  async rollbackRule(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: RollbackRuleDto,
  ): Promise<RuleResponseDto> {
    return (await this.businessRulesEngineService.rollbackRule(id, workspaceId, userId, userRole, dto)) as unknown as RuleResponseDto;
  }
}
