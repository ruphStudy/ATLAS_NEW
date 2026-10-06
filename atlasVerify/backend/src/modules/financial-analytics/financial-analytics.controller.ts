import { Controller, Get, Query, Delete, Param } from '@nestjs/common';
import { FinancialAnalyticsService } from './financial-analytics.service';
import {
  GetFinancialPerformanceDto,
  GetFinancialTrendsDto,
  GetFinancialBreakdownDto,
  GetFinancialComparisonDto,
  GetFinancialAlertsDto,
  FinancialPerformanceResponseDto,
  FinancialTrendResponseDto,
  FinancialBreakdownResponseDto,
  FinancialComparisonResponseDto,
  FinancialAlertResponseDto,
} from './dto';

@Controller('financial-analytics')
export class FinancialAnalyticsController {
  constructor(private readonly service: FinancialAnalyticsService) {}

  @Get('performance')
  async getFinancialPerformance(
    @Query() dto: GetFinancialPerformanceDto,
  ): Promise<FinancialPerformanceResponseDto[]> {
    return this.service.getFinancialPerformance(dto);
  }

  @Get('trends')
  async getFinancialTrends(
    @Query() dto: GetFinancialTrendsDto,
  ): Promise<FinancialTrendResponseDto[]> {
    return this.service.getFinancialTrends(dto);
  }

  @Get('breakdown')
  async getFinancialBreakdown(
    @Query() dto: GetFinancialBreakdownDto,
  ): Promise<FinancialBreakdownResponseDto[]> {
    return this.service.getFinancialBreakdown(dto);
  }

  @Get('comparison')
  async getFinancialComparison(
    @Query() dto: GetFinancialComparisonDto,
  ): Promise<FinancialComparisonResponseDto | null> {
    return this.service.getFinancialComparison(dto);
  }

  @Get('alerts')
  async getFinancialAlerts(
    @Query() dto: GetFinancialAlertsDto,
  ): Promise<FinancialAlertResponseDto[]> {
    return this.service.getFinancialAlerts(dto);
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
