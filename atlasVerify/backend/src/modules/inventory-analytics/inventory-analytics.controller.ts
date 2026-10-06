import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InventoryAnalyticsService } from './inventory-analytics.service';
import {
  DashboardFilterDto,
  TrendFilterDto,
  ProductAnalyticsFilterDto,
  WarehouseBreakdownFilterDto,
  RefreshCacheDto,
} from './dto';

@Controller('inventory-analytics')
export class InventoryAnalyticsController {
  constructor(private readonly service: InventoryAnalyticsService) {}

  @Get('dashboard')
  async getDashboardSummary(@Query() filter: DashboardFilterDto) {
    return this.service.getDashboardSummary(filter);
  }

  @Get('kpis')
  async getInventoryKPIs(
    @Query('workspaceId') workspaceId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.getInventoryKPIs(workspaceId, warehouseId);
  }

  @Get('stock-levels')
  async getStockLevelMetrics(
    @Query('workspaceId') workspaceId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.getStockLevelMetrics(workspaceId, warehouseId);
  }

  @Get('movements')
  async getInventoryMovementMetrics(
    @Query('workspaceId') workspaceId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.service.getInventoryMovementMetrics(
      workspaceId,
      warehouseId,
      start,
      end,
    );
  }

  @Get('warehouse-performance')
  async getWarehousePerformance(@Query('workspaceId') workspaceId: string) {
    return this.service.getWarehousePerformance(workspaceId);
  }

  @Get('value-metrics')
  async getInventoryValueMetrics(
    @Query('workspaceId') workspaceId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.getInventoryValueMetrics(workspaceId, warehouseId);
  }

  @Get('aging-metrics')
  async getInventoryAgingMetrics(
    @Query('workspaceId') workspaceId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.getInventoryAgingMetrics(workspaceId, warehouseId);
  }

  @Get('trends')
  async getInventoryTrend(@Query() filter: TrendFilterDto) {
    return this.service.getInventoryTrend(filter);
  }

  @Get('products')
  async getProductAnalytics(@Query() filter: ProductAnalyticsFilterDto) {
    return this.service.getProductAnalytics(filter);
  }

  @Get('warehouse-breakdown')
  async getWarehouseBreakdown(@Query() filter: WarehouseBreakdownFilterDto) {
    return this.service.getWarehouseBreakdown(filter);
  }

  @Post('refresh-cache')
  @HttpCode(HttpStatus.OK)
  async refreshCache(@Body() dto: RefreshCacheDto) {
    return this.service.refreshCache(dto);
  }
}
