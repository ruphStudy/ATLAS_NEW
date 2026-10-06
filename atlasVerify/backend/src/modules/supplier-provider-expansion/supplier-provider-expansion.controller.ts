import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SupplierProviderExpansionService } from './supplier-provider-expansion.service';
import {
  CheckEligibilityDto,
  OnboardSupplierProviderDto,
  PromoteRolloutDto,
  SupplierProviderExpansionFilterDto,
  UpdateSupplierProviderExpansionDto,
} from './dto';

@Controller('supplier-provider-expansion')
export class SupplierProviderExpansionController {
  constructor(private readonly service: SupplierProviderExpansionService) {}

  // ── Onboarding / CRUD ───────────────────────────────────────

  @Post('expansions')
  onboardProvider(@Body() dto: OnboardSupplierProviderDto, @Query('userId') userId?: string) {
    return this.service.onboardProvider(dto, userId);
  }

  @Get('expansions')
  findExpansions(@Query() filter: SupplierProviderExpansionFilterDto) {
    return this.service.findExpansions(filter);
  }

  @Get('expansions/resolve/:providerCode/:workspaceId')
  resolveExpansion(@Param('providerCode') providerCode: string, @Param('workspaceId') workspaceId: string) {
    return this.service.resolveExpansion(providerCode, workspaceId);
  }

  @Post('expansions/eligibility/:providerCode')
  checkEligibility(@Param('providerCode') providerCode: string, @Body() dto: CheckEligibilityDto) {
    return this.service.checkEligibility(providerCode, dto);
  }

  @Get('expansions/capabilities/:providerCode')
  getSupportedCapabilities(@Param('providerCode') providerCode: string) {
    return this.service.getSupportedCapabilities(providerCode);
  }

  @Get('expansions/health/:providerCode')
  checkHealth(@Param('providerCode') providerCode: string) {
    return this.service.checkHealth(providerCode);
  }

  @Get('expansions/version/:providerCode')
  getVersionInfo(@Param('providerCode') providerCode: string) {
    return this.service.getVersionInfo(providerCode);
  }

  @Post('expansions/fallback/:providerCode/:workspaceId')
  resolveWithFallback(@Param('providerCode') providerCode: string, @Param('workspaceId') workspaceId: string) {
    return this.service.resolveWithFallback(providerCode, workspaceId);
  }

  @Get('expansions/:id')
  findExpansionById(@Param('id') id: string) {
    return this.service.findExpansionById(id);
  }

  @Patch('expansions/:id')
  updateExpansion(@Param('id') id: string, @Body() dto: UpdateSupplierProviderExpansionDto, @Query('userId') userId?: string) {
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
  invalidateCache(@Query('providerCode') providerCode?: string) {
    return this.service.invalidateCache(providerCode);
  }
}
