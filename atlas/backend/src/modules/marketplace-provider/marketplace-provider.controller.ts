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
import { MarketplaceProviderService } from './marketplace-provider.service';
import {
  CreateMarketplaceAccountDto,
  HealthCheckDto,
  SetCredentialsDto,
  TestConnectionDto,
  UpdateMarketplaceAccountDto,
  UpsertMarketplaceProviderConfigDto,
} from './dto';
import { MarketplaceCapability } from './interfaces';

// Decorators assumed to exist in the project (consistent with other controllers)
// Adjust import paths if needed.
// @WorkspaceId() and @CurrentUserId() are assumed project decorators.

@Controller('marketplace-providers')
export class MarketplaceProviderController {
  constructor(private readonly service: MarketplaceProviderService) {}

  // ── Provider Metadata ─────────────────────────────────────────

  @Get()
  listProviders(@Query('workspaceId') workspaceId: string) {
    return this.service.listProviders(workspaceId);
  }

  @Get(':providerKey')
  getProvider(@Param('providerKey') providerKey: string) {
    return this.service.getProvider(providerKey);
  }

  // ── Provider Config ───────────────────────────────────────────

  @Post('configs')
  upsertConfig(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpsertMarketplaceProviderConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.upsertConfig(workspaceId, dto, userId);
  }

  @Get('configs')
  getConfigs(
    @Query('workspaceId') workspaceId: string,
    @Query('providerKey') providerKey?: string,
  ) {
    return this.service.getConfigs(workspaceId, providerKey);
  }

  @Get('configs/:id')
  getConfigById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.getConfigById(id, workspaceId);
  }

  @Post(':providerKey/enable')
  @HttpCode(HttpStatus.NO_CONTENT)
  enableProvider(
    @Param('providerKey') providerKey: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.enableProvider(providerKey, workspaceId);
  }

  @Post(':providerKey/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  disableProvider(
    @Param('providerKey') providerKey: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.disableProvider(providerKey, workspaceId);
  }

  @Delete('configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteConfig(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.deleteConfig(id, workspaceId);
  }

  // ── Credentials ───────────────────────────────────────────────

  @Post('credentials')
  @HttpCode(HttpStatus.NO_CONTENT)
  setCredentials(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: SetCredentialsDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.setCredentials(workspaceId, dto, userId);
  }

  @Get(':providerKey/credentials/validate')
  validateCredentials(
    @Param('providerKey') providerKey: string,
    @Query('workspaceId') workspaceId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.validateCredentials(workspaceId, providerKey, accountId);
  }

  // ── Accounts ──────────────────────────────────────────────────

  @Post('accounts')
  createAccount(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateMarketplaceAccountDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.createAccount(workspaceId, dto, userId);
  }

  @Get('accounts')
  getAccounts(
    @Query('workspaceId') workspaceId: string,
    @Query('providerKey') providerKey?: string,
  ) {
    return this.service.getAccounts(workspaceId, providerKey);
  }

  @Get('accounts/:id')
  getAccountById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.getAccountById(id, workspaceId);
  }

  @Put('accounts/:id')
  updateAccount(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateMarketplaceAccountDto,
  ) {
    return this.service.updateAccount(id, workspaceId, dto);
  }

  @Delete('accounts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.deleteAccount(id, workspaceId);
  }

  // ── Health ────────────────────────────────────────────────────

  @Get('health')
  getHealth(
    @Query('providerKey') providerKey?: string,
    @Query('accountId') accountId?: string,
  ) {
    if (providerKey) {
      return this.service.getHealthStatus(providerKey, accountId);
    }
    return this.service.getAllHealthStatuses();
  }

  @Post('health/check')
  checkHealth(@Body() dto: HealthCheckDto) {
    return this.service.checkHealth(dto.providerKey, dto.accountId);
  }

  // ── Connection Test ───────────────────────────────────────────

  @Post('connection/test')
  testConnection(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: TestConnectionDto,
  ) {
    return this.service.testConnection(workspaceId, dto.providerKey, dto.accountId);
  }

  // ── Capabilities ──────────────────────────────────────────────

  @Get('capabilities/:capability/providers')
  listCapableProviders(@Param('capability') capability: MarketplaceCapability) {
    return this.service.listCapableProviders(capability);
  }

  @Get(':providerKey/capabilities/:capability/validate')
  validateCapability(
    @Param('providerKey') providerKey: string,
    @Param('capability') capability: MarketplaceCapability,
  ) {
    return this.service.validateCapability(providerKey, capability);
  }

  // ── Metrics ───────────────────────────────────────────────────

  @Get('metrics')
  getMetrics(@Query('providerKey') providerKey?: string) {
    return this.service.getMetrics(providerKey);
  }
}
