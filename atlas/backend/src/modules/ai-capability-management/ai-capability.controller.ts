import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { UserId, UserRole, WorkspaceId } from '../../common/decorators/request-context.decorators';
import { AiCapabilityService } from './ai-capability.service';
import { AiCapabilityResolver } from './ai-capability.resolver';
import {
  AiCapabilityDefinitionFilterDto,
  AiCapabilityOverrideFilterDto,
  CreateAiCapabilityDefinitionDto,
  CreateAiCapabilityOverrideDto,
  CreateAiCapabilityVersionDto,
  ResolveAiCapabilityDto,
  UpdateAiCapabilityDefinitionDto,
  UpdateAiCapabilityOverrideDto,
} from './dto';

@Controller('ai-capabilities')
export class AiCapabilityController {
  constructor(
    private readonly service: AiCapabilityService,
    private readonly resolver: AiCapabilityResolver,
  ) {}

  // ── Definitions ───────────────────────────────────────────

  @Post()
  define(@Body() dto: CreateAiCapabilityDefinitionDto, @UserId() userId?: string) {
    return this.service.defineCapability(dto, userId);
  }

  @Get()
  findAll(@Query() filter: AiCapabilityDefinitionFilterDto) {
    return this.service.findAllDefinitions(filter);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findDefinitionById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAiCapabilityDefinitionDto, @UserId() userId?: string) {
    return this.service.updateDefinition(id, dto, userId);
  }

  @Post(':id/enable')
  enable(@Param('id') id: string, @UserId() userId?: string) {
    return this.service.enableDefinition(id, userId);
  }

  @Post(':id/disable')
  disable(@Param('id') id: string, @UserId() userId?: string) {
    return this.service.disableDefinition(id, userId);
  }

  @Post(':id/version')
  createVersion(@Param('id') id: string, @Body() dto: CreateAiCapabilityVersionDto, @UserId() userId?: string) {
    return this.service.createVersion(id, dto, userId);
  }

  // ── Overrides ─────────────────────────────────────────────

  @Post('overrides')
  registerOverride(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateAiCapabilityOverrideDto,
    @UserId() userId?: string,
  ) {
    return this.service.registerOverride(workspaceId, dto, userId);
  }

  @Get('overrides')
  findAllOverrides(@Query() filter: AiCapabilityOverrideFilterDto) {
    return this.service.findAllOverrides(filter);
  }

  @Get('overrides/:id')
  findOverrideById(@Param('id') id: string) {
    return this.service.findOverrideById(id);
  }

  @Put('overrides/:id')
  updateOverride(
    @Param('id') id: string,
    @Body() dto: UpdateAiCapabilityOverrideDto,
    @UserId() userId?: string,
  ) {
    return this.service.updateOverride(id, dto, userId);
  }

  @Post('overrides/:id/enable')
  enableOverride(@Param('id') id: string, @UserId() userId?: string) {
    return this.service.enableOverride(id, userId);
  }

  @Post('overrides/:id/disable')
  disableOverride(@Param('id') id: string, @UserId() userId?: string) {
    return this.service.disableOverride(id, userId);
  }

  // ── Resolution ────────────────────────────────────────────

  @Get('resolve')
  resolve(
    @WorkspaceId() workspaceId: string,
    @Query() query: ResolveAiCapabilityDto,
    @UserRole() userRole?: string,
  ) {
    return this.resolver.resolve({
      workspaceId,
      capabilityKey: query.capabilityKey,
      providerKey: query.providerKey,
      modelId: query.modelId,
      useCase: query.useCase,
      region: query.region,
      featureFlags: query.featureFlags ? query.featureFlags.split(',').map((f) => f.trim()) : undefined,
      userRole,
    });
  }

  // ── Cache ─────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@Query('capabilityKey') capabilityKey?: string) {
    this.service.invalidateCache(capabilityKey);
  }
}
