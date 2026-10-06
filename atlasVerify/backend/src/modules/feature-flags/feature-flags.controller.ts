import { Body, Controller, Get, Post, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { TenantIsolationGuard } from '@modules/tenant-isolation/guards/tenant-isolation.guard';
import { FeatureFlagsService } from './feature-flags.service';
import {
  CreateFeatureFlagDefinitionDto,
  UpdateFeatureFlagDefinitionDto,
  FeatureFlagDefinitionFilterDto,
  ActivateKillSwitchDto,
  CreateFeatureFlagOverrideDto,
  UpdateFeatureFlagOverrideDto,
  FeatureFlagOverrideFilterDto,
  EvaluateFeatureFlagContextDto,
  EvaluateManyFeatureFlagsDto,
  FeatureFlagReasonDto,
  FeatureFlagDefinitionResponseDto,
  PaginatedFeatureFlagDefinitionResponseDto,
  FeatureFlagOverrideResponseDto,
  PaginatedFeatureFlagOverrideResponseDto,
  FeatureFlagHistoryResponseDto,
  FeatureFlagEvaluationResponseDto,
} from './dto';
import { IFeatureFlagEvaluationContext } from './interfaces';

@Controller({ path: 'feature-flags', version: '1' })
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  // ── Scheduler-callable sweep ─────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('process-schedule')
  async processSchedule(): Promise<{ definitionsDisabled: number; overridesDisabled: number }> {
    return this.featureFlagsService.processScheduleSweep();
  }

  // ── Evaluation ───────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('evaluate/:key')
  async evaluate(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: EvaluateFeatureFlagContextDto,
  ): Promise<FeatureFlagEvaluationResponseDto> {
    const context: IFeatureFlagEvaluationContext = { workspaceId, userId, userRole, ...dto };
    return this.featureFlagsService.evaluate(key, context);
  }

  @UseGuards(TenantIsolationGuard)
  @Post('evaluate')
  async evaluateMany(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: EvaluateManyFeatureFlagsDto,
  ): Promise<Record<string, FeatureFlagEvaluationResponseDto>> {
    const { keys, ...rest } = dto;
    const context: IFeatureFlagEvaluationContext = { workspaceId, userId, userRole, ...rest };
    return this.featureFlagsService.evaluateMany(keys, context);
  }

  // ── Definitions ──────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('definitions')
  async createDefinition(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateFeatureFlagDefinitionDto,
  ): Promise<FeatureFlagDefinitionResponseDto> {
    return (await this.featureFlagsService.createDefinition(workspaceId, userId, userRole, dto)) as unknown as FeatureFlagDefinitionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('definitions')
  async findAllDefinitions(@Query() filter: FeatureFlagDefinitionFilterDto): Promise<PaginatedFeatureFlagDefinitionResponseDto> {
    return this.featureFlagsService.findAllDefinitions(filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('definitions/:key')
  async getDefinition(@Param('key') key: string): Promise<FeatureFlagDefinitionResponseDto> {
    return (await this.featureFlagsService.getDefinition(key)) as unknown as FeatureFlagDefinitionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Patch('definitions/:key')
  async updateDefinition(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateFeatureFlagDefinitionDto,
  ): Promise<FeatureFlagDefinitionResponseDto> {
    return (await this.featureFlagsService.updateDefinition(key, workspaceId, userId, userRole, dto)) as unknown as FeatureFlagDefinitionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('definitions/:key/history')
  async getDefinitionHistory(@Param('key') key: string): Promise<FeatureFlagHistoryResponseDto[]> {
    return (await this.featureFlagsService.getDefinitionHistory(key)) as unknown as FeatureFlagHistoryResponseDto[];
  }

  @UseGuards(TenantIsolationGuard)
  @Post('definitions/:key/enable')
  async enableDefinition(@Param('key') key: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<FeatureFlagDefinitionResponseDto> {
    return (await this.featureFlagsService.enableDefinition(key, workspaceId, userId, userRole)) as unknown as FeatureFlagDefinitionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('definitions/:key/disable')
  async disableDefinition(@Param('key') key: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<FeatureFlagDefinitionResponseDto> {
    return (await this.featureFlagsService.disableDefinition(key, workspaceId, userId, userRole)) as unknown as FeatureFlagDefinitionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('definitions/:key/archive')
  async archiveDefinition(@Param('key') key: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<FeatureFlagDefinitionResponseDto> {
    return (await this.featureFlagsService.archiveDefinition(key, workspaceId, userId, userRole)) as unknown as FeatureFlagDefinitionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('definitions/:key/restore')
  async restoreDefinition(@Param('key') key: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<FeatureFlagDefinitionResponseDto> {
    return (await this.featureFlagsService.restoreDefinition(key, workspaceId, userId, userRole)) as unknown as FeatureFlagDefinitionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('definitions/:key/kill-switch/activate')
  async activateKillSwitch(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: ActivateKillSwitchDto,
  ): Promise<FeatureFlagDefinitionResponseDto> {
    return (await this.featureFlagsService.activateKillSwitch(key, workspaceId, userId, userRole, dto)) as unknown as FeatureFlagDefinitionResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('definitions/:key/kill-switch/deactivate')
  async deactivateKillSwitch(@Param('key') key: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<FeatureFlagDefinitionResponseDto> {
    return (await this.featureFlagsService.deactivateKillSwitch(key, workspaceId, userId, userRole)) as unknown as FeatureFlagDefinitionResponseDto;
  }

  // ── Overrides ────────────────────────────────────────────────────

  @UseGuards(TenantIsolationGuard)
  @Post('definitions/:key/overrides')
  async createOverride(
    @Param('key') key: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateFeatureFlagOverrideDto,
  ): Promise<FeatureFlagOverrideResponseDto> {
    return (await this.featureFlagsService.createOverride(key, workspaceId, userId, userRole, dto)) as unknown as FeatureFlagOverrideResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Get('definitions/:key/overrides')
  async listOverridesForFlag(@Param('key') key: string): Promise<FeatureFlagOverrideResponseDto[]> {
    return (await this.featureFlagsService.listOverridesForFlag(key)) as unknown as FeatureFlagOverrideResponseDto[];
  }

  @UseGuards(TenantIsolationGuard)
  @Get('overrides')
  async findAllOverrides(@WorkspaceId() workspaceId: string, @Query() filter: FeatureFlagOverrideFilterDto): Promise<PaginatedFeatureFlagOverrideResponseDto> {
    return this.featureFlagsService.findAllOverrides(workspaceId, filter);
  }

  @UseGuards(TenantIsolationGuard)
  @Get('overrides/:id')
  async getOverride(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<FeatureFlagOverrideResponseDto> {
    return (await this.featureFlagsService.getOverride(id, workspaceId)) as unknown as FeatureFlagOverrideResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Patch('overrides/:id')
  async updateOverride(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: UpdateFeatureFlagOverrideDto,
  ): Promise<FeatureFlagOverrideResponseDto> {
    return (await this.featureFlagsService.updateOverride(id, workspaceId, userId, userRole, dto)) as unknown as FeatureFlagOverrideResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('overrides/:id/enable')
  async enableOverride(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<FeatureFlagOverrideResponseDto> {
    return (await this.featureFlagsService.enableOverride(id, workspaceId, userId, userRole)) as unknown as FeatureFlagOverrideResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('overrides/:id/disable')
  async disableOverride(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId: string, @UserRole() userRole: string): Promise<FeatureFlagOverrideResponseDto> {
    return (await this.featureFlagsService.disableOverride(id, workspaceId, userId, userRole)) as unknown as FeatureFlagOverrideResponseDto;
  }

  @UseGuards(TenantIsolationGuard)
  @Post('overrides/:id/archive')
  async archiveOverride(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: FeatureFlagReasonDto,
  ): Promise<FeatureFlagOverrideResponseDto> {
    return (await this.featureFlagsService.archiveOverride(id, workspaceId, userId, userRole, dto)) as unknown as FeatureFlagOverrideResponseDto;
  }
}
