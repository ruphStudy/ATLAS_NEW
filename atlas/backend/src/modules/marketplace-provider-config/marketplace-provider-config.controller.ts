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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { Roles } from '@common/decorators';
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

const WRITE_ROLES = ['ADMIN', 'OPERATOR'];
const READ_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'];

@ApiTags('Marketplace Provider Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace-provider-configs')
export class MarketplaceProviderConfigController {
  constructor(private readonly service: MarketplaceProviderConfigService) {}

  // ── CRUD ──────────────────────────────────────────────────

  @Post()
  @Roles(...WRITE_ROLES)
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateMarketplaceProviderConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.createConfig(workspaceId, dto, userId);
  }

  @Get()
  @Roles(...READ_ROLES)
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query() filter: ConfigFilterDto,
  ) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  findById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findById(id, workspaceId);
  }

  @Put(':id')
  @Roles(...WRITE_ROLES)
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateMarketplaceProviderConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.updateConfig(id, workspaceId, dto, userId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.deleteConfig(id, workspaceId);
  }

  // ── Status Transitions ────────────────────────────────────

  @Post(':id/publish')
  @Roles(...WRITE_ROLES)
  publish(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: PublishMarketplaceProviderConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.publishConfig(id, workspaceId, dto, userId);
  }

  @Post(':id/enable')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  enable(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.enableConfig(id, workspaceId, userId);
  }

  @Post(':id/disable')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  disable(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.disableConfig(id, workspaceId, userId);
  }

  @Post(':id/archive')
  @Roles('ADMIN')
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
  @Roles('ADMIN')
  rollback(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: RollbackMarketplaceProviderConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.rollback(id, workspaceId, dto, userId);
  }

  @Get(':id/history')
  @Roles(...READ_ROLES)
  getHistory(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.getHistory(id, workspaceId);
  }

  // ── Clone / Duplicate ─────────────────────────────────────

  @Post(':id/clone')
  @Roles(...WRITE_ROLES)
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
  @Roles(...WRITE_ROLES)
  import(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: ConfigImportDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.importConfig(workspaceId, dto, userId);
  }

  @Get(':id/export')
  @Roles(...READ_ROLES)
  async export(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    const config = await this.service.findById(id, workspaceId);
    return this.service.exportConfig(config);
  }

  // ── Cache ─────────────────────────────────────────────────

  @Post('cache/invalidate')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  invalidateCache(
    @Query('providerKey') providerKey?: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    this.service.invalidateCache(providerKey, workspaceId);
  }
}
