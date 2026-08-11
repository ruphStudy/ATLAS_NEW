import { Controller, Get, Query, Delete, Param } from '@nestjs/common';
import { ProcurementAnalyticsService } from './procurement-analytics.service';
import {
  GetProcurementPerformanceDto,
  GetProcurementTrendsDto,
  GetProcurementBreakdownDto,
  GetProcurementComparisonDto,
  GetProcurementRiskAlertsDto,
  ProcurementPerformanceResponseDto,
  ProcurementTrendResponseDto,
  ProcurementBreakdownResponseDto,
  ProcurementComparisonResponseDto,
  ProcurementRiskAlertResponseDto,
} from './dto';

@Controller('procurement-analytics')
export class ProcurementAnalyticsController {
  constructor(private readonly service: ProcurementAnalyticsService) {}

  @Get('performance')
  async getProcurementPerformance(
    @Query() dto: GetProcurementPerformanceDto,
  ): Promise<ProcurementPerformanceResponseDto[]> {
    return this.service.getProcurementPerformance(dto);
  }

  @Get('trends')
  async getProcurementTrends(
    @Query() dto: GetProcurementTrendsDto,
  ): Promise<ProcurementTrendResponseDto[]> {
    return this.service.getProcurementTrends(dto);
  }

  @Get('breakdown')
  async getProcurementBreakdown(
    @Query() dto: GetProcurementBreakdownDto,
  ): Promise<ProcurementBreakdownResponseDto[]> {
    return this.service.getProcurementBreakdown(dto);
  }

  @Get('comparison')
  async getProcurementComparison(
    @Query() dto: GetProcurementComparisonDto,
  ): Promise<ProcurementComparisonResponseDto | null> {
    return this.service.getProcurementComparison(dto);
  }

  @Get('risk-alerts')
  async getProcurementRiskAlerts(
    @Query() dto: GetProcurementRiskAlertsDto,
  ): Promise<ProcurementRiskAlertResponseDto[]> {
    return this.service.getProcurementRiskAlerts(dto);
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
