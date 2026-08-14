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

const WRITE_ROLES = ['ADMIN', 'OPERATOR'];
const READ_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'];

// Decorators assumed to exist in the project (consistent with other controllers)
// Adjust import paths if needed.
// @WorkspaceId() and @CurrentUserId() are assumed project decorators.

@ApiTags('Marketplace Providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace-providers')
export class MarketplaceProviderController {
  constructor(private readonly service: MarketplaceProviderService) {}

  // ── Provider Metadata ─────────────────────────────────────────

  @Get()
  @Roles(...READ_ROLES)
  listProviders(@Query('workspaceId') workspaceId: string) {
    return this.service.listProviders(workspaceId);
  }

  @Get(':providerKey')
  @Roles(...READ_ROLES)
  getProvider(@Param('providerKey') providerKey: string) {
    return this.service.getProvider(providerKey);
  }

  // ── Provider Config ───────────────────────────────────────────

  @Post('configs')
  @Roles(...WRITE_ROLES)
  upsertConfig(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpsertMarketplaceProviderConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.upsertConfig(workspaceId, dto, userId);
  }

  @Get('configs')
  @Roles(...READ_ROLES)
  getConfigs(
    @Query('workspaceId') workspaceId: string,
    @Query('providerKey') providerKey?: string,
  ) {
    return this.service.getConfigs(workspaceId, providerKey);
  }

  @Get('configs/:id')
  @Roles(...READ_ROLES)
  getConfigById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.getConfigById(id, workspaceId);
  }

  @Post(':providerKey/enable')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  enableProvider(
    @Param('providerKey') providerKey: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.enableProvider(providerKey, workspaceId, userId);
  }

  @Post(':providerKey/disable')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  disableProvider(
    @Param('providerKey') providerKey: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.disableProvider(providerKey, workspaceId, userId);
  }

  @Delete('configs/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteConfig(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.deleteConfig(id, workspaceId, userId);
  }

  // ── Credentials ───────────────────────────────────────────────

  @Post('credentials')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  setCredentials(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: SetCredentialsDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.setCredentials(workspaceId, dto, userId);
  }

  @Get(':providerKey/credentials/validate')
  @Roles(...READ_ROLES)
  validateCredentials(
    @Param('providerKey') providerKey: string,
    @Query('workspaceId') workspaceId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.validateCredentials(workspaceId, providerKey, accountId);
  }

  // ── Accounts ──────────────────────────────────────────────────

  @Post('accounts')
  @Roles(...WRITE_ROLES)
  createAccount(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateMarketplaceAccountDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.createAccount(workspaceId, dto, userId);
  }

  @Get('accounts')
  @Roles(...READ_ROLES)
  getAccounts(
    @Query('workspaceId') workspaceId: string,
    @Query('providerKey') providerKey?: string,
  ) {
    return this.service.getAccounts(workspaceId, providerKey);
  }

  @Get('accounts/:id')
  @Roles(...READ_ROLES)
  getAccountById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.getAccountById(id, workspaceId);
  }

  @Put('accounts/:id')
  @Roles(...WRITE_ROLES)
  updateAccount(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateMarketplaceAccountDto,
  ) {
    return this.service.updateAccount(id, workspaceId, dto);
  }

  @Delete('accounts/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.deleteAccount(id, workspaceId);
  }

  // ── Health ────────────────────────────────────────────────────

  @Get('health')
  @Roles(...READ_ROLES)
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
  @Roles(...WRITE_ROLES)
  checkHealth(@Body() dto: HealthCheckDto) {
    return this.service.checkHealth(dto.providerKey, dto.accountId);
  }

  // ── Connection Test ───────────────────────────────────────────

  @Post('connection/test')
  @Roles(...WRITE_ROLES)
  testConnection(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: TestConnectionDto,
  ) {
    return this.service.testConnection(workspaceId, dto.providerKey, dto.accountId);
  }

  // ── Capabilities ──────────────────────────────────────────────

  @Get('capabilities/:capability/providers')
  @Roles(...READ_ROLES)
  listCapableProviders(@Param('capability') capability: MarketplaceCapability) {
    return this.service.listCapableProviders(capability);
  }

  @Get(':providerKey/capabilities/:capability/validate')
  @Roles(...READ_ROLES)
  validateCapability(
    @Param('providerKey') providerKey: string,
    @Param('capability') capability: MarketplaceCapability,
  ) {
    return this.service.validateCapability(providerKey, capability);
  }

  // ── Metrics ───────────────────────────────────────────────────

  @Get('metrics')
  @Roles(...READ_ROLES)
  getMetrics(@Query('providerKey') providerKey?: string) {
    return this.service.getMetrics(providerKey);
  }
}
