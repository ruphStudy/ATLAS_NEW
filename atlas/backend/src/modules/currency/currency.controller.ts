import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import {
  BulkImportRatesDto,
  ConfigureProviderPriorityDto,
  ConvertAmountDto,
  CreateCurrencyDto,
  CurrencyFilterDto,
  ExchangeRateFilterDto,
  RecordRateDto,
  RefreshRateFromProviderDto,
  RejectRateDto,
  ResolveWithFallbackDto,
  ScheduleRateSyncDto,
  UpdateCurrencyDto,
  UpdateRateDto,
  UpsertWorkspaceCurrencyConfigDto,
} from './dto';

@Controller('currencies')
export class CurrencyController {
  constructor(private readonly service: CurrencyService) {}

  // ── Currency CRUD ─────────────────────────────────────────

  @Post()
  register(@Body() dto: CreateCurrencyDto, @Query('userId') userId?: string) {
    return this.service.registerCurrency(dto, userId);
  }

  @Get()
  findAll(@Query() filter: CurrencyFilterDto) {
    return this.service.findAll(filter);
  }

  // ── Rates (declared before ':id' to avoid route capture) ────

  @Get('rates')
  getRateHistory(@Query() filter: ExchangeRateFilterDto) {
    return this.service.getRateHistory(filter);
  }

  @Post('rates/manual')
  recordManualRate(@Body() dto: RecordRateDto, @Query('userId') userId?: string) {
    return this.service.recordManualRate(dto, userId);
  }

  @Post('rates/scheduled')
  recordScheduledRate(@Body() dto: RecordRateDto, @Query('userId') userId?: string) {
    return this.service.recordScheduledRate(dto, userId);
  }

  @Post('rates/provider')
  refreshRateFromProvider(@Body() dto: RefreshRateFromProviderDto, @Query('userId') userId?: string) {
    return this.service.refreshRateFromProvider(dto, userId);
  }

  @Post('rates/resolve')
  resolveRateWithFallback(@Body() dto: ResolveWithFallbackDto, @Query('userId') userId?: string) {
    return this.service.resolveRateWithFallback(dto, userId);
  }

  @Post('rates/bulk-import')
  bulkImportRates(@Body() dto: BulkImportRatesDto, @Query('userId') userId?: string) {
    return this.service.bulkImportRates(dto, userId);
  }

  @Get('rates/:rateId')
  getRate(@Param('rateId') rateId: string) {
    return this.service.getRate(rateId);
  }

  @Patch('rates/:rateId')
  updateRate(@Param('rateId') rateId: string, @Body() dto: UpdateRateDto, @Query('userId') userId?: string) {
    return this.service.updateRate(rateId, dto, userId);
  }

  @Post('rates/:rateId/approve')
  approveRate(@Param('rateId') rateId: string, @Query('userId') userId?: string) {
    return this.service.approveRate(rateId, userId);
  }

  @Post('rates/:rateId/publish')
  publishRate(@Param('rateId') rateId: string, @Query('userId') userId?: string) {
    return this.service.publishRate(rateId, userId);
  }

  @Post('rates/:rateId/reject')
  rejectRate(@Param('rateId') rateId: string, @Body() dto: RejectRateDto, @Query('userId') userId?: string) {
    return this.service.rejectRate(rateId, dto, userId);
  }

  @Post('rates/:rateId/archive')
  archiveRateRecord(@Param('rateId') rateId: string, @Query('userId') userId?: string) {
    return this.service.archiveRateRecord(rateId, userId);
  }

  // ── Provider Priority / Fallback ─────────────────────────

  @Post('providers/priority')
  configureProviderPriority(@Body() dto: ConfigureProviderPriorityDto, @Query('userId') userId?: string) {
    return this.service.configureProviderPriority(dto, userId);
  }

  @Get('providers/priority')
  getProviderPriorities(@Query('workspaceId') workspaceId?: string) {
    return this.service.getProviderPriorities(workspaceId);
  }

  // ── Scheduled Synchronization ─────────────────────────────

  @Post('sync/schedule')
  scheduleRateSync(@Body() dto: ScheduleRateSyncDto, @Query('userId') userId?: string) {
    this.service.scheduleRateSync(dto, userId);
    return { scheduled: true };
  }

  @Post('sync/unschedule')
  unscheduleRateSync(@Body() dto: ScheduleRateSyncDto) {
    this.service.unscheduleRateSync(dto);
    return { scheduled: false };
  }

  // ── Conversion ────────────────────────────────────────────

  @Post('convert')
  convert(@Body() dto: ConvertAmountDto) {
    return this.service.convert(dto);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.service.findByCode(code);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCurrencyDto, @Query('userId') userId?: string) {
    return this.service.updateCurrency(id, dto, userId);
  }

  @Post(':id/enable')
  enable(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.enableCurrency(id, userId);
  }

  @Post(':id/disable')
  disable(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.disableCurrency(id, userId);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.archiveCurrency(id, userId);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.restoreCurrency(id, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Query('userId') userId?: string) {
    return this.service.deleteCurrency(id, userId);
  }

  @Get(':id/history')
  history(@Param('id') id: string) {
    return this.service.getHistory(id);
  }

  // ── Workspace Configuration ───────────────────────────────

  @Post('workspace/:workspaceId/config')
  upsertWorkspaceConfig(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpsertWorkspaceCurrencyConfigDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.upsertWorkspaceConfig(workspaceId, dto, userId);
  }

  @Get('workspace/:workspaceId/config')
  getWorkspaceConfig(@Param('workspaceId') workspaceId: string) {
    return this.service.getWorkspaceConfig(workspaceId);
  }

  // ── Cache ─────────────────────────────────────────────────

  @Post('cache/invalidate')
  invalidateCache(@Query('code') code?: string, @Query('workspaceId') workspaceId?: string) {
    return this.service.invalidateCache(code, workspaceId);
  }
}
