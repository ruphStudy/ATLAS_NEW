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
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/authentication/guards';
import { WorkspaceId, UserId } from '@common/decorators';
import { PricingService } from './pricing.service';
import {
  CalculatePricingDto,
  BulkCalculatePricingDto,
  SimulatePricingDto,
  ApprovePricingDto,
  ArchivePricingDto,
  CreatePricingConfigDto,
  UpdatePricingConfigDto,
  PricingRecordFilterDto,
  PricingConfigFilterDto,
} from './dto';

@ApiTags('Pricing')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'pricing', version: '1' })
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // ── Config ──────────────────────────────────────────────────

  @Post('configs')
  createConfig(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreatePricingConfigDto,
  ) {
    return this.pricingService.createConfig(workspaceId, dto, userId);
  }

  @Get('configs')
  findAllConfigs(
    @WorkspaceId() workspaceId: string,
    @Query() filter: PricingConfigFilterDto,
  ) {
    return this.pricingService.findAllConfigs(workspaceId, filter);
  }

  @Get('configs/:id')
  findConfigById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.pricingService.findConfigById(id, workspaceId);
  }

  @Put('configs/:id')
  updateConfig(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdatePricingConfigDto,
  ) {
    return this.pricingService.updateConfig(id, workspaceId, dto, userId);
  }

  @Delete('configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteConfig(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.pricingService.deleteConfig(id, workspaceId);
  }

  // ── Calculation ──────────────────────────────────────────────

  @Post('calculate')
  calculate(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CalculatePricingDto,
  ) {
    return this.pricingService.calculate(workspaceId, dto, userId);
  }

  @Post('calculate/async')
  queueCalculation(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CalculatePricingDto,
  ) {
    return this.pricingService.queueCalculation(workspaceId, dto, userId);
  }

  @Post('calculate/bulk')
  bulkCalculate(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: BulkCalculatePricingDto,
  ) {
    return this.pricingService.bulkCalculate(workspaceId, dto, userId);
  }

  @Post('simulate')
  simulate(
    @WorkspaceId() workspaceId: string,
    @Body() dto: SimulatePricingDto,
  ) {
    return this.pricingService.simulate(workspaceId, dto);
  }

  // ── Records ──────────────────────────────────────────────────

  @Get('records')
  findAllRecords(
    @WorkspaceId() workspaceId: string,
    @Query() filter: PricingRecordFilterDto,
  ) {
    return this.pricingService.findAllRecords(workspaceId, filter);
  }

  @Get('records/:id')
  findRecordById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.pricingService.findRecordById(id, workspaceId);
  }

  @Get('records/:id/history')
  getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.pricingService.getHistory(id, workspaceId);
  }

  @Post('records/:id/approve')
  approveRecord(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ApprovePricingDto,
  ) {
    return this.pricingService.approveRecord(id, workspaceId, dto, userId);
  }

  @Post('records/:id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  archiveRecord(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ArchivePricingDto,
  ) {
    return this.pricingService.archiveRecord(id, workspaceId, dto.reason);
  }

  // ── Comparison ───────────────────────────────────────────────

  @Get('compare/:catalogProductId')
  compareAcrossMarketplaces(
    @Param('catalogProductId') catalogProductId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.pricingService.compareAcrossMarketplaces(workspaceId, catalogProductId);
  }
}
