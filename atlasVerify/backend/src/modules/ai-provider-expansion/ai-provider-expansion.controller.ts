import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { UserId, WorkspaceId } from '../../common/decorators/request-context.decorators';
import { AiProviderExpansionService } from './ai-provider-expansion.service';
import {
  AiProviderExpansionFilterDto,
  CheckEligibilityDto,
  OnboardAiProviderDto,
  PromoteRolloutDto,
  UpdateAiProviderExpansionDto,
} from './dto';

@Controller('ai-provider-expansion')
export class AiProviderExpansionController {
  constructor(private readonly service: AiProviderExpansionService) {}

  // ── Onboarding / CRUD ───────────────────────────────────────

  @Post()
  onboardProvider(@WorkspaceId() workspaceId: string, @Body() dto: OnboardAiProviderDto, @UserId() userId?: string) {
    return this.service.onboardProvider(workspaceId, dto, userId);
  }

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: AiProviderExpansionFilterDto) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('resolve/:providerKey')
  resolveExpansion(@Param('providerKey') providerKey: string, @WorkspaceId() workspaceId: string) {
    return this.service.resolveExpansion(providerKey, workspaceId);
  }

  @Post('eligibility/:providerKey')
  checkEligibility(@Param('providerKey') providerKey: string, @Body() dto: CheckEligibilityDto) {
    return this.service.checkEligibility(providerKey, dto);
  }

  @Get('capabilities/:providerKey')
  getSupportedCapabilities(@Param('providerKey') providerKey: string) {
    return this.service.getSupportedCapabilities(providerKey);
  }

  @Get('health/:providerKey')
  checkHealth(@Param('providerKey') providerKey: string) {
    return this.service.checkHealth(providerKey);
  }

  @Get('version/:providerKey')
  getVersionInfo(@Param('providerKey') providerKey: string) {
    return this.service.getVersionInfo(providerKey);
  }

  @Get(':id')
  findById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findById(id, workspaceId);
  }

  @Put(':id')
  updateExpansion(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateAiProviderExpansionDto,
    @UserId() userId?: string,
  ) {
    return this.service.updateExpansion(id, workspaceId, dto, userId);
  }

  @Post(':id/validate-compatibility')
  validateAdapterCompatibility(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId?: string) {
    return this.service.validateAdapterCompatibility(id, workspaceId, userId);
  }

  @Post(':id/rollout')
  changeRolloutState(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: PromoteRolloutDto,
    @UserId() userId?: string,
  ) {
    return this.service.changeRolloutState(id, workspaceId, dto, userId);
  }

  @Get(':id/history')
  getExpansionHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getExpansionHistory(id, workspaceId);
  }

  // ── Cache ───────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@Query('providerKey') providerKey?: string, @WorkspaceId() workspaceId?: string) {
    this.service.invalidateCache(providerKey, workspaceId);
  }
}
