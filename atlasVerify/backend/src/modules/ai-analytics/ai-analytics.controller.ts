import { Controller, Get, Query, Delete, Param } from '@nestjs/common';
import { AiAnalyticsService } from './ai-analytics.service';
import {
  GetAiPerformanceDto,
  GetAiTrendsDto,
  GetAiBreakdownDto,
  GetAiComparisonDto,
  GetAiIssueAlertsDto,
  AiPerformanceResponseDto,
  AiTrendResponseDto,
  AiBreakdownResponseDto,
  AiComparisonResponseDto,
  AiIssueAlertResponseDto,
} from './dto';

@Controller('ai-analytics')
export class AiAnalyticsController {
  constructor(private readonly service: AiAnalyticsService) {}

  @Get('performance')
  async getAiPerformance(
    @Query() dto: GetAiPerformanceDto,
  ): Promise<AiPerformanceResponseDto[]> {
    return this.service.getAiPerformance(dto);
  }

  @Get('trends')
  async getAiTrends(
    @Query() dto: GetAiTrendsDto,
  ): Promise<AiTrendResponseDto[]> {
    return this.service.getAiTrends(dto);
  }

  @Get('breakdown')
  async getAiBreakdown(
    @Query() dto: GetAiBreakdownDto,
  ): Promise<AiBreakdownResponseDto[]> {
    return this.service.getAiBreakdown(dto);
  }

  @Get('comparison')
  async getAiComparison(
    @Query() dto: GetAiComparisonDto,
  ): Promise<AiComparisonResponseDto | null> {
    return this.service.getAiComparison(dto);
  }

  @Get('issue-alerts')
  async getAiIssueAlerts(
    @Query() dto: GetAiIssueAlertsDto,
  ): Promise<AiIssueAlertResponseDto[]> {
    return this.service.getAiIssueAlerts(dto);
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
