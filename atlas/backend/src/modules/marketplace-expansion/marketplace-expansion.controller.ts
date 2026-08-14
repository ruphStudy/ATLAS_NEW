import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { MarketplaceExpansionService } from './marketplace-expansion.service';
import {
  CheckEligibilityDto,
  MarketplaceExpansionFilterDto,
  OnboardMarketplaceDto,
  PromoteRolloutDto,
  UpdateMarketplaceExpansionDto,
} from './dto';

@Controller('marketplace-expansion')
export class MarketplaceExpansionController {
  constructor(private readonly service: MarketplaceExpansionService) {}

  // ── Onboarding / CRUD ───────────────────────────────────────

  @Post('expansions')
  onboardMarketplace(@Body() dto: OnboardMarketplaceDto, @Query('userId') userId?: string) {
    return this.service.onboardMarketplace(dto, userId);
  }

  @Get('expansions')
  findExpansions(@Query() filter: MarketplaceExpansionFilterDto) {
    return this.service.findExpansions(filter);
  }

  @Get('expansions/resolve/:providerKey/:workspaceId')
  resolveExpansion(@Param('providerKey') providerKey: string, @Param('workspaceId') workspaceId: string) {
    return this.service.resolveExpansion(providerKey, workspaceId);
  }

  @Post('expansions/eligibility/:providerKey')
  checkEligibility(@Param('providerKey') providerKey: string, @Body() dto: CheckEligibilityDto) {
    return this.service.checkEligibility(providerKey, dto);
  }

  @Get('expansions/capabilities/:providerKey')
  getSupportedCapabilities(@Param('providerKey') providerKey: string) {
    return this.service.getSupportedCapabilities(providerKey);
  }

  @Get('expansions/health/:providerKey')
  checkHealth(@Param('providerKey') providerKey: string, @Query('accountId') accountId?: string) {
    return this.service.checkHealth(providerKey, accountId);
  }

  @Get('expansions/version/:providerKey')
  getVersionInfo(@Param('providerKey') providerKey: string) {
    return this.service.getVersionInfo(providerKey);
  }

  @Post('expansions/fallback/:providerKey/:workspaceId')
  resolveWithFallback(@Param('providerKey') providerKey: string, @Param('workspaceId') workspaceId: string) {
    return this.service.resolveWithFallback(providerKey, workspaceId);
  }

  @Get('expansions/:id')
  findExpansionById(@Param('id') id: string) {
    return this.service.findExpansionById(id);
  }

  @Patch('expansions/:id')
  updateExpansion(@Param('id') id: string, @Body() dto: UpdateMarketplaceExpansionDto, @Query('userId') userId?: string) {
    return this.service.updateExpansion(id, dto, userId);
  }

  @Post('expansions/:id/validate-compatibility')
  validateAdapterCompatibility(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.validateAdapterCompatibility(id, userId);
  }

  @Post('expansions/:id/rollout')
  changeRolloutState(@Param('id') id: string, @Body() dto: PromoteRolloutDto, @Query('userId') userId?: string) {
    return this.service.changeRolloutState(id, dto, userId);
  }

  @Get('expansions/:id/history')
  getExpansionHistory(@Param('id') id: string) {
    return this.service.getExpansionHistory(id);
  }

  // ── Cache ───────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@Query('providerKey') providerKey?: string) {
    return this.service.invalidateCache(providerKey);
  }
}
