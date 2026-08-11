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
import { AiProviderCredentialService } from './ai-provider-credential.service';
import { AiProviderCredentialResolver } from './ai-provider-credential.resolver';
import {
  AiProviderCredentialFilterDto,
  AiProviderCredentialResponseDto,
  CreateAiProviderCredentialDto,
  RefreshAiProviderCredentialDto,
  RotateAiProviderCredentialDto,
  UpdateAiProviderCredentialDto,
} from './dto';

/**
 * No endpoint here ever returns `encryptedFields` or a decrypted value —
 * every response flows through `AiProviderCredentialResponseDto`, which
 * deliberately omits credential material. `AiProviderCredentialResolver.resolveDecrypted`
 * is intentionally never called from this controller.
 */
@Controller('ai-provider-credentials')
export class AiProviderCredentialController {
  constructor(
    private readonly service: AiProviderCredentialService,
    private readonly resolver: AiProviderCredentialResolver,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateAiProviderCredentialDto,
    @UserId() userId?: string,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: AiProviderCredentialFilterDto) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('resolve')
  async resolveActive(
    @WorkspaceId() workspaceId: string,
    @Query('providerKey') providerKey: string,
    @Query('accountId') accountId?: string,
    @Query('modelId') modelId?: string,
  ): Promise<AiProviderCredentialResponseDto | null> {
    const entity = await this.resolver.resolve({ workspaceId, providerKey, accountId, modelId });
    return entity ? AiProviderCredentialResponseDto.from(entity as unknown as Record<string, unknown>) : null;
  }

  @Get(':id')
  findById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findById(id, workspaceId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateAiProviderCredentialDto,
    @UserId() userId?: string,
  ) {
    return this.service.update(id, workspaceId, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.delete(id, workspaceId);
  }

  // ── Rotate / Refresh ──────────────────────────────────────

  @Post(':id/rotate')
  rotate(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: RotateAiProviderCredentialDto,
    @UserId() userId?: string,
  ) {
    return this.service.rotate(id, workspaceId, dto, userId);
  }

  @Post(':id/refresh')
  refresh(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: RefreshAiProviderCredentialDto,
    @UserId() userId?: string,
  ) {
    return this.service.refresh(id, workspaceId, dto, userId);
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

  @Post(':id/revoke')
  revoke(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId?: string) {
    return this.service.revoke(id, workspaceId, userId);
  }

  // ── Connection Validation ─────────────────────────────────

  @Post(':id/validate')
  validate(@Param('id') id: string, @WorkspaceId() workspaceId: string, @UserId() userId?: string) {
    return this.service.validateConnection(id, workspaceId, userId);
  }

  // ── History ────────────────────────────────────────────────

  @Get(':id/history')
  getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getHistory(id, workspaceId);
  }

  // ── Cache ─────────────────────────────────────────────────

  @Post('cache/invalidate')
  @HttpCode(HttpStatus.NO_CONTENT)
  invalidateCache(@Query('providerKey') providerKey?: string, @WorkspaceId() workspaceId?: string) {
    this.service.invalidateCache(providerKey, workspaceId);
  }
}
