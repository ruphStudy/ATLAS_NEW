import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/authentication/guards';
import { WorkspaceId, UserId } from '@common/decorators';
import { MarketplaceService } from './marketplace.service';
import {
  ConfigureMarketplaceDto,
  RegisterMarketplaceDto,
  ResolveMarketplaceOperationBatchDto,
  ResolveMarketplaceOperationDto,
  SetMarketplacePriorityDto,
} from './dto';

@ApiTags('Marketplace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'marketplaces', version: '1' })
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  // ── Registration / Lifecycle ────────────────────────────────────

  @Get()
  listMarketplaces(@WorkspaceId() workspaceId: string) {
    return this.marketplaceService.listMarketplaces(workspaceId);
  }

  @Get('default')
  getDefaultMarketplace(@WorkspaceId() workspaceId: string) {
    return this.marketplaceService.getDefaultMarketplace(workspaceId);
  }

  @Get('capabilities')
  discoverCapabilities(
    @WorkspaceId() workspaceId: string,
    @Query('marketplaceKey') marketplaceKey?: string,
  ) {
    return this.marketplaceService.discoverCapabilities(marketplaceKey, workspaceId);
  }

  @Get('health')
  getMarketplaceHealth(@WorkspaceId() workspaceId: string) {
    return this.marketplaceService.getMarketplaceHealth(workspaceId);
  }

  @Get('sku-mapping/:internalId')
  getSkuMapping(@WorkspaceId() workspaceId: string, @Param('internalId') internalId: string) {
    return this.marketplaceService.getSkuMapping(workspaceId, internalId);
  }

  @Get('inventory-availability/:internalId')
  getInventoryAvailability(
    @WorkspaceId() workspaceId: string,
    @Param('internalId') internalId: string,
  ) {
    return this.marketplaceService.getInventoryAvailability(workspaceId, internalId);
  }

  @Post('operations/resolve')
  resolveOperation(
    @WorkspaceId() workspaceId: string,
    @Body() dto: ResolveMarketplaceOperationDto,
    @UserId() userId?: string,
  ) {
    return this.marketplaceService.resolveOperation(workspaceId, dto, userId);
  }

  @Post('operations/resolve-batch')
  resolveOperationBatch(
    @WorkspaceId() workspaceId: string,
    @Body() dto: ResolveMarketplaceOperationBatchDto,
    @UserId() userId?: string,
  ) {
    return this.marketplaceService.resolveOperationBatch(workspaceId, dto.requests, userId);
  }

  @Post()
  registerMarketplace(
    @WorkspaceId() workspaceId: string,
    @Body() dto: RegisterMarketplaceDto,
    @UserId() userId?: string,
  ) {
    return this.marketplaceService.registerMarketplace(workspaceId, dto, userId);
  }

  @Get(':marketplaceKey')
  getMarketplace(@WorkspaceId() workspaceId: string, @Param('marketplaceKey') marketplaceKey: string) {
    return this.marketplaceService.getMarketplace(workspaceId, marketplaceKey);
  }

  @Post(':marketplaceKey/enable')
  enableMarketplace(
    @WorkspaceId() workspaceId: string,
    @Param('marketplaceKey') marketplaceKey: string,
    @UserId() userId?: string,
  ) {
    return this.marketplaceService.enableMarketplace(workspaceId, marketplaceKey, userId);
  }

  @Post(':marketplaceKey/disable')
  disableMarketplace(
    @WorkspaceId() workspaceId: string,
    @Param('marketplaceKey') marketplaceKey: string,
    @UserId() userId?: string,
  ) {
    return this.marketplaceService.disableMarketplace(workspaceId, marketplaceKey, userId);
  }

  @Post(':marketplaceKey/default')
  setDefaultMarketplace(
    @WorkspaceId() workspaceId: string,
    @Param('marketplaceKey') marketplaceKey: string,
    @UserId() userId?: string,
  ) {
    return this.marketplaceService.setDefaultMarketplace(workspaceId, marketplaceKey, userId);
  }

  @Put(':marketplaceKey/configuration')
  configureMarketplace(
    @WorkspaceId() workspaceId: string,
    @Param('marketplaceKey') marketplaceKey: string,
    @Body() dto: ConfigureMarketplaceDto,
    @UserId() userId?: string,
  ) {
    return this.marketplaceService.configureMarketplace(workspaceId, marketplaceKey, dto, userId);
  }

  @Put(':marketplaceKey/priority')
  setMarketplacePriority(
    @WorkspaceId() workspaceId: string,
    @Param('marketplaceKey') marketplaceKey: string,
    @Body() dto: SetMarketplacePriorityDto,
    @UserId() userId?: string,
  ) {
    return this.marketplaceService.setMarketplacePriority(workspaceId, marketplaceKey, dto.priority, userId);
  }

  @Get(':marketplaceKey/accounts')
  listMarketplaceAccounts(
    @WorkspaceId() workspaceId: string,
    @Param('marketplaceKey') marketplaceKey: string,
  ) {
    return this.marketplaceService.listMarketplaceAccounts(workspaceId, marketplaceKey);
  }

  @Get(':marketplaceKey/capabilities/:capabilityKey/validate')
  validateCapability(
    @WorkspaceId() workspaceId: string,
    @Param('marketplaceKey') marketplaceKey: string,
    @Param('capabilityKey') capabilityKey: string,
    @Query('accountId') accountId?: string,
    @Query('country') country?: string,
    @Query('region') region?: string,
  ) {
    return this.marketplaceService.validateCapability(workspaceId, marketplaceKey, capabilityKey, {
      accountId,
      country,
      region,
    });
  }

  @Get(':marketplaceKey/health')
  isMarketplaceHealthy(
    @WorkspaceId() workspaceId: string,
    @Param('marketplaceKey') marketplaceKey: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.marketplaceService.isMarketplaceHealthy(workspaceId, marketplaceKey, accountId);
  }
}
