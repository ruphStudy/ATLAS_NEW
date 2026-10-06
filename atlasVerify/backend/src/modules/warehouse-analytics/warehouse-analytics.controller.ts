import { Controller, Get, Query, Delete, Param } from '@nestjs/common';
import { WarehouseAnalyticsService } from './warehouse-analytics.service';
import {
  GetWarehousePerformanceDto,
  GetWarehouseTrendsDto,
  GetWarehouseBreakdownDto,
  GetWarehouseComparisonDto,
  GetWarehouseIssueAlertsDto,
  WarehousePerformanceResponseDto,
  WarehouseTrendResponseDto,
  WarehouseBreakdownResponseDto,
  WarehouseComparisonResponseDto,
  WarehouseIssueAlertResponseDto,
} from './dto';

@Controller('warehouse-analytics')
export class WarehouseAnalyticsController {
  constructor(private readonly service: WarehouseAnalyticsService) {}

  @Get('performance')
  async getWarehousePerformance(
    @Query() dto: GetWarehousePerformanceDto,
  ): Promise<WarehousePerformanceResponseDto[]> {
    return this.service.getWarehousePerformance(dto);
  }

  @Get('trends')
  async getWarehouseTrends(
    @Query() dto: GetWarehouseTrendsDto,
  ): Promise<WarehouseTrendResponseDto[]> {
    return this.service.getWarehouseTrends(dto);
  }

  @Get('breakdown')
  async getWarehouseBreakdown(
    @Query() dto: GetWarehouseBreakdownDto,
  ): Promise<WarehouseBreakdownResponseDto[]> {
    return this.service.getWarehouseBreakdown(dto);
  }

  @Get('comparison')
  async getWarehouseComparison(
    @Query() dto: GetWarehouseComparisonDto,
  ): Promise<WarehouseComparisonResponseDto | null> {
    return this.service.getWarehouseComparison(dto);
  }

  @Get('issue-alerts')
  async getWarehouseIssueAlerts(
    @Query() dto: GetWarehouseIssueAlertsDto,
  ): Promise<WarehouseIssueAlertResponseDto[]> {
    return this.service.getWarehouseIssueAlerts(dto);
  }

  @Delete('cache/:workspaceId')
  async invalidateCache(
    @Param('workspaceId') workspaceId: string,
    @Query('pattern') pattern?: string,
  ): Promise<{ invalidatedCount: number }> {
    const count = await this.service.invalidateCache(workspaceId, pattern);
    return { invalidatedCount: count };
  }
}
