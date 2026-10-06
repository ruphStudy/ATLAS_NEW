import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { UserId, WorkspaceId } from '../../common/decorators/request-context.decorators';
import { AiCapability } from '../../ai/interfaces';
import { AiProviderRegistryService } from './ai-provider-registry.service';
import { AiProviderRegistryResolver } from './ai-provider-registry.resolver';
import {
  AiProviderRegistryFilterDto,
  AiProviderRegistryResponseDto,
  CreateAiProviderRegistryDto,
  UpdateAiProviderRegistryDto,
} from './dto';

@Controller('ai-provider-registry')
export class AiProviderRegistryController {
  constructor(
    private readonly service: AiProviderRegistryService,
    private readonly resolver: AiProviderRegistryResolver,
  ) {}

  // ── Register / Read / Update ──────────────────────────────

  @Post()
  register(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateAiProviderRegistryDto,
    @UserId() userId?: string,
  ) {
    return this.service.register(workspaceId, dto, userId);
  }

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: AiProviderRegistryFilterDto) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('resolve')
  async resolve(
    @WorkspaceId() workspaceId: string,
    @Query('capability') capability?: AiCapability,
    @Query('modelId') modelId?: string,
    @Query('region') region?: string,
    @Query('preferredProviderKey') preferredProviderKey?: string,
  ): Promise<AiProviderRegistryResponseDto | null> {
    const entity = await this.resolver.resolve({ workspaceId, capability, modelId, region, preferredProviderKey });
    return entity ? AiProviderRegistryResponseDto.from(entity as unknown as Record<string, unknown>) : null;
  }

  @Get(':id')
  findById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findById(id, workspaceId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateAiProviderRegistryDto,
    @UserId() userId?: string,
  ) {
    return this.service.update(id, workspaceId, dto, userId);
  }

  // ── Status Transitions ────────────────────────────────────

  @Post(':id/enable')
  enable(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId?: string) {
    return this.service.enable(id, workspaceId, userId);
  }

  @Post(':id/disable')
  disable(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId?: string) {
    return this.service.disable(id, workspaceId, userId);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId?: string) {
    return this.service.archive(id, workspaceId, userId);
  }

  // ── Synchronization ────────────────────────────────────────

  @Post('sync')
  sync(@UserId() userId?: string) {
    return this.service.syncWithFoundation(userId);
  }

  // ── Cache ─────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@Query('providerKey') providerKey?: string, @WorkspaceId() workspaceId?: string) {
    this.service.invalidateCache(providerKey, workspaceId);
  }
}
