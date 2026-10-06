import { Controller, Get, Post, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { InventoryAvailabilityService } from './inventory-availability.service';
import {
  GetAvailabilityDto,
  GetBulkAvailabilityDto,
  GetAvailabilityBySkuDto,
  GetAggregatedAvailabilityDto,
  GetFutureDateAvailabilityDto,
  FilteredAvailabilityDto,
} from './dto';

@Controller('inventory-availability')
export class InventoryAvailabilityController {
  constructor(private readonly service: InventoryAvailabilityService) {}

  @Get()
  async getAvailability(@Query() dto: GetAvailabilityDto) {
    return this.service.getAvailability(dto);
  }

  @Get('by-sku')
  async getAvailabilityBySku(@Query() dto: GetAvailabilityBySkuDto) {
    return this.service.getAvailabilityBySku(dto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async getBulkAvailability(@Body() dto: GetBulkAvailabilityDto) {
    return this.service.getBulkAvailability(dto);
  }

  @Get('aggregated')
  async getAggregatedAvailability(@Query() dto: GetAggregatedAvailabilityDto) {
    return this.service.getAggregatedAvailability(dto);
  }

  @Get('future-date')
  async getFutureDateAvailability(@Query() dto: GetFutureDateAvailabilityDto) {
    return this.service.getFutureDateAvailability(dto);
  }

  @Post('invalidate-cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  async invalidateCache(
    @Body() body: { inventoryItemId: string; warehouseId?: string },
  ) {
    await this.service.invalidateCache(body.inventoryItemId, body.warehouseId);
  }
}
