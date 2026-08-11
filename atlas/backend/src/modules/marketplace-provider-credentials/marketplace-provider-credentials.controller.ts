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
import { MarketplaceProviderCredentialsService } from './marketplace-provider-credentials.service';
import {
  CreateCredentialDto,
  CredentialFilterDto,
  RotateCredentialDto,
  UpdateCredentialDto,
} from './dto';

@Controller('marketplace-provider-credentials')
export class MarketplaceProviderCredentialsController {
  constructor(
    private readonly service: MarketplaceProviderCredentialsService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────

  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateCredentialDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query() filter: CredentialFilterDto,
  ) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findById(id, workspaceId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateCredentialDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.update(id, workspaceId, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.delete(id, workspaceId);
  }

  // ── Status ────────────────────────────────────────────────

  @Post(':id/enable')
  @HttpCode(HttpStatus.NO_CONTENT)
  enable(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.enable(id, workspaceId, userId);
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  disable(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.disable(id, workspaceId, userId);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.revoke(id, workspaceId, userId);
  }

  // ── Rotation ──────────────────────────────────────────────

  @Post(':id/rotate')
  rotate(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: RotateCredentialDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.rotate(id, workspaceId, dto, userId);
  }

  // ── Validation ────────────────────────────────────────────

  @Post(':id/validate')
  validate(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.validateById(id, workspaceId);
  }

  // ── History ───────────────────────────────────────────────

  @Get(':id/history')
  getHistory(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.getHistory(id, workspaceId);
  }

  // ── Cache ─────────────────────────────────────────────────

  @Post('cache/invalidate')
  @HttpCode(HttpStatus.NO_CONTENT)
  invalidateCache(
    @Query('providerKey') providerKey?: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    this.service.invalidateCache(providerKey, workspaceId);
  }
}
