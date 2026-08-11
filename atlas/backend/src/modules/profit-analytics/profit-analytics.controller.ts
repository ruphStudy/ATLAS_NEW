import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ProfitAnalyticsService } from './profit-analytics.service';
import {
  GetProfitSummaryDto,
  GetProfitTrendsDto,
  GetProfitBreakdownDto,
  GetProfitComparisonDto,
  GetProfitabilityAnalysisDto,
  GetProfitLeakageDto,
  CreateProfitTargetDto,
  UpdateProfitTargetDto,
  ProfitSummaryResponseDto,
  ProfitTrendResponseDto,
  ProfitBreakdownResponseDto,
  ProfitComparisonResponseDto,
  ProfitabilityAnalysisResponseDto,
  ProfitLeakageResponseDto,
  ProfitTargetResponseDto,
  ProfitTargetPerformanceResponseDto,
} from './dto';

@Controller('profit-analytics')
export class ProfitAnalyticsController {
  constructor(private readonly service: ProfitAnalyticsService) {}

  @Get('summary')
  async getProfitSummary(@Query() dto: GetProfitSummaryDto): Promise<ProfitSummaryResponseDto> {
    return this.service.getProfitSummary(dto);
  }

  @Get('trends')
  async getProfitTrends(@Query() dto: GetProfitTrendsDto): Promise<ProfitTrendResponseDto[]> {
    return this.service.getProfitTrends(dto);
  }

  @Get('breakdown')
  async getProfitBreakdown(@Query() dto: GetProfitBreakdownDto): Promise<ProfitBreakdownResponseDto[]> {
    return this.service.getProfitBreakdown(dto);
  }

  @Get('comparison')
  async getProfitComparison(@Query() dto: GetProfitComparisonDto): Promise<ProfitComparisonResponseDto> {
    return this.service.getProfitComparison(dto);
  }

  @Get('profitability-analysis')
  async getProfitabilityAnalysis(@Query() dto: GetProfitabilityAnalysisDto): Promise<ProfitabilityAnalysisResponseDto[]> {
    return this.service.getProfitabilityAnalysis(dto);
  }

  @Get('leakage')
  async getProfitLeakage(@Query() dto: GetProfitLeakageDto): Promise<ProfitLeakageResponseDto[]> {
    return this.service.getProfitLeakage(dto);
  }

  @Post('targets')
  async createTarget(@Body() dto: CreateProfitTargetDto): Promise<ProfitTargetResponseDto> {
    return this.service.createTarget(dto);
  }

  @Put('targets/:id')
  async updateTarget(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateProfitTargetDto,
  ): Promise<ProfitTargetResponseDto> {
    return this.service.updateTarget(id, workspaceId, dto);
  }

  @Get('targets/:id')
  async getTargetById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ProfitTargetResponseDto> {
    return this.service.findTargetById(id, workspaceId);
  }

  @Get('targets')
  async getAllTargets(
    @Query('workspaceId') workspaceId: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<ProfitTargetResponseDto[]> {
    return this.service.findAllTargets(workspaceId, isActive);
  }

  @Delete('targets/:id')
  async deleteTarget(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.service.deleteTarget(id, workspaceId);
  }

  @Get('targets/:id/performance')
  async getTargetPerformance(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ProfitTargetPerformanceResponseDto> {
    return this.service.getTargetPerformance(id, workspaceId);
  }

  @Get('targets/performance/all')
  async getAllTargetPerformances(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<ProfitTargetPerformanceResponseDto[]> {
    return this.service.getAllTargetPerformances(
      workspaceId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Delete('cache')
  async invalidateCache(
    @Query('workspaceId') workspaceId: string,
    @Query('pattern') pattern?: string,
  ): Promise<{ invalidatedCount: number }> {
    const count = await this.service.invalidateCache(workspaceId, pattern);
    return { invalidatedCount: count };
  }
}
