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
import { MarketplaceProviderConfigService } from './marketplace-provider-config.service';
import {
  CloneMarketplaceProviderConfigDto,
  ConfigFilterDto,
  ConfigImportDto,
  CreateMarketplaceProviderConfigDto,
  PublishMarketplaceProviderConfigDto,
  RollbackMarketplaceProviderConfigDto,
  UpdateMarketplaceProviderConfigDto,
} from './dto';

@Controller('marketplace-provider-configs')
export class MarketplaceProviderConfigController {
  constructor(private readonly service: MarketplaceProviderConfigService) {}

  // ── CRUD ──────────────────────────────────────────────────

  @Post()
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateMarketplaceProviderConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.createConfig(workspaceId, dto, userId);
  }

  @Get()
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query() filter: ConfigFilterDto,
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
    @Body() dto: UpdateMarketplaceProviderConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.updateConfig(id, workspaceId, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.deleteConfig(id, workspaceId);
  }

  // ── Status Transitions ────────────────────────────────────

  @Post(':id/publish')
  publish(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: PublishMarketplaceProviderConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.publishConfig(id, workspaceId, dto, userId);
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.NO_CONTENT)
  enable(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.enableConfig(id, workspaceId, userId);
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  disable(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.disableConfig(id, workspaceId, userId);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.archiveConfig(id, workspaceId, userId);
  }

  // ── Versioning ────────────────────────────────────────────

  @Post(':id/rollback')
  rollback(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: RollbackMarketplaceProviderConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.rollback(id, workspaceId, dto, userId);
  }

  @Get(':id/history')
  getHistory(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.getHistory(id, workspaceId);
  }

  // ── Clone / Duplicate ─────────────────────────────────────

  @Post(':id/clone')
  clone(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CloneMarketplaceProviderConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.cloneConfig(id, workspaceId, dto, userId);
  }

  // ── Import / Export ───────────────────────────────────────

  @Post('import')
  import(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: ConfigImportDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.importConfig(workspaceId, dto, userId);
  }

  @Get(':id/export')
  async export(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    const config = await this.service.findById(id, workspaceId);
    return this.service.exportConfig(config);
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
