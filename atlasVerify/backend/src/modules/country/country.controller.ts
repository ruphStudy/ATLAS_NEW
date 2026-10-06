import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CountryService } from './country.service';
import {
  CountryFilterDto,
  CreateCountryDto,
  CreateCountryOverrideDto,
  ResolveCountryContextDto,
  UpdateCountryDto,
  UpsertProviderAvailabilityDto,
  UpsertWorkspaceCountryConfigDto,
  ValidateCountryCombinationDto,
} from './dto';
import { CountryProviderDomain } from './interfaces';

@Controller('countries')
export class CountryController {
  constructor(private readonly service: CountryService) {}

  // ── Country CRUD ──────────────────────────────────────────

  @Post()
  register(@Body() dto: CreateCountryDto, @Query('userId') userId?: string) {
    return this.service.registerCountry(dto, userId);
  }

  @Get()
  findAll(@Query() filter: CountryFilterDto) {
    return this.service.findAll(filter);
  }

  // ── Region Grouping (declared before ':id' to avoid route capture) ──

  @Get('regions')
  listRegions() {
    return this.service.listRegions();
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.service.findByCode(code);
  }

  @Get('code/:code/availability')
  getProviderAvailability(
    @Param('code') code: string,
    @Query('domain') domain?: CountryProviderDomain,
    @Query('providerKey') providerKey?: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.getProviderAvailability(code, { domain, providerKey, workspaceId });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCountryDto, @Query('userId') userId?: string) {
    return this.service.updateCountry(id, dto, userId);
  }

  @Post(':id/enable')
  enable(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.enableCountry(id, userId);
  }

  @Post(':id/disable')
  disable(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.disableCountry(id, userId);
  }

  @Post(':id/deprecate')
  deprecate(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.deprecateCountry(id, userId);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.archiveCountry(id, userId);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.restoreCountry(id, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.deleteCountry(id, userId);
  }

  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  // ── Workspace Enablement / Configuration ─────────────────

  @Post('workspace/:workspaceId/config')
  upsertWorkspaceConfig(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpsertWorkspaceCountryConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.upsertWorkspaceConfig(workspaceId, dto, userId);
  }

  @Get('workspace/:workspaceId/config')
  getWorkspaceConfigs(@Param('workspaceId') workspaceId: string) {
    return this.service.getWorkspaceConfigs(workspaceId);
  }

  @Post('workspace/:workspaceId/default/:countryCode')
  setDefault(
    @Param('workspaceId') workspaceId: string,
    @Param('countryCode') countryCode: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.setDefaultCountry(workspaceId, countryCode, userId);
  }

  @Delete('workspace/:workspaceId/config/:countryCode')
  removeWorkspaceCountry(
    @Param('workspaceId') workspaceId: string,
    @Param('countryCode') countryCode: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.removeWorkspaceCountry(workspaceId, countryCode, userId);
  }

  // ── Overrides ─────────────────────────────────────────────

  @Post('overrides')
  createOverride(@Body() dto: CreateCountryOverrideDto, @Query('userId') userId?: string) {
    return this.service.createOverride(dto, userId);
  }

  // ── Provider Availability ─────────────────────────────────

  @Post('availability')
  configureProviderAvailability(@Body() dto: UpsertProviderAvailabilityDto, @Query('userId') userId?: string) {
    return this.service.configureProviderAvailability(dto, userId);
  }

  // ── Resolution ────────────────────────────────────────────

  @Post('resolve')
  resolve(@Body() dto: ResolveCountryContextDto) {
    return this.service.resolveContext(dto);
  }

  // ── Validation ────────────────────────────────────────────

  @Post('validate')
  validate(@Body() dto: ValidateCountryCombinationDto) {
    return this.service.validateCombination(dto);
  }

  // ── Cache ─────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@Query('code') code?: string, @Query('workspaceId') workspaceId?: string) {
    return this.service.invalidateCache(code, workspaceId);
  }
}
