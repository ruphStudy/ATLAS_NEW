import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { UserId, WorkspaceId } from '../../common/decorators/request-context.decorators';
import { AiProviderConfigurationService } from './ai-provider-configuration.service';
import { AiProviderConfigurationResolver } from './ai-provider-configuration.resolver';
import {
  AiProviderConfigFilterDto,
  CloneAiProviderConfigDto,
  CreateAiProviderConfigDto,
  PublishAiProviderConfigDto,
  RollbackAiProviderConfigDto,
  UpdateAiProviderConfigDto,
} from './dto';

@Controller('ai-provider-configurations')
export class AiProviderConfigurationController {
  constructor(
    private readonly service: AiProviderConfigurationService,
    private readonly resolver: AiProviderConfigurationResolver,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateAiProviderConfigDto,
    @UserId() userId?: string,
  ) {
    return this.service.createConfig(workspaceId, dto, userId);
  }

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: AiProviderConfigFilterDto) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('resolve')
  resolveEffectiveConfig(
    @WorkspaceId() workspaceId: string,
    @Query('providerKey') providerKey: string,
    @Query('useCase') useCase?: string,
    @Query('modelId') modelId?: string,
  ) {
    return this.resolver.resolve({ workspaceId, providerKey, useCase, modelId });
  }

  @Get(':id')
  findById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findById(id, workspaceId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateAiProviderConfigDto,
    @UserId() userId?: string,
  ) {
    return this.service.updateConfig(id, workspaceId, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.deleteConfig(id, workspaceId);
  }

  // ── Status Transitions ────────────────────────────────────

  @Post(':id/publish')
  publish(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: PublishAiProviderConfigDto,
    @UserId() userId?: string,
  ) {
    return this.service.publishConfig(id, workspaceId, dto, userId);
  }

  @Post(':id/enable')
  enable(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId?: string) {
    return this.service.enableConfig(id, workspaceId, userId);
  }

  @Post(':id/disable')
  disable(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId?: string) {
    return this.service.disableConfig(id, workspaceId, userId);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId?: string) {
    return this.service.archiveConfig(id, workspaceId, userId);
  }

  // ── Versioning ────────────────────────────────────────────

  @Post(':id/rollback')
  rollback(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: RollbackAiProviderConfigDto,
    @UserId() userId?: string,
  ) {
    return this.service.rollback(id, workspaceId, dto, userId);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getHistory(id, workspaceId);
  }

  // ── Clone ─────────────────────────────────────────────────

  @Post(':id/clone')
  clone(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CloneAiProviderConfigDto,
    @UserId() userId?: string,
  ) {
    return this.service.cloneConfig(id, workspaceId, dto, userId);
  }

  // ── Cache ─────────────────────────────────────────────────

  @Post('cache/invalidate')
  @HttpCode(HttpStatus.NO_CONTENT)
  invalidateCache(@Query('providerKey') providerKey?: string, @WorkspaceId() workspaceId?: string) {
    this.service.invalidateCache(providerKey, workspaceId);
  }
}
