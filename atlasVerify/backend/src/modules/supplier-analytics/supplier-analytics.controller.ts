import { Controller, Get, Delete, Query } from '@nestjs/common';
import { SupplierAnalyticsService } from './supplier-analytics.service';
import {
  GetSupplierPerformanceDto,
  GetSupplierTrendsDto,
  GetSupplierBreakdownDto,
  GetSupplierComparisonDto,
  GetSupplierRankingDto,
  SupplierPerformanceResponseDto,
  SupplierTrendResponseDto,
  SupplierBreakdownResponseDto,
  SupplierComparisonResponseDto,
  SupplierRankingResponseDto,
} from './dto';

@Controller('supplier-analytics')
export class SupplierAnalyticsController {
  constructor(private readonly service: SupplierAnalyticsService) {}

  @Get('performance')
  async getSupplierPerformance(@Query() dto: GetSupplierPerformanceDto): Promise<SupplierPerformanceResponseDto[]> {
    return this.service.getSupplierPerformance(dto);
  }

  @Get('trends')
  async getSupplierTrends(@Query() dto: GetSupplierTrendsDto): Promise<SupplierTrendResponseDto[]> {
    return this.service.getSupplierTrends(dto);
  }

  @Get('breakdown')
  async getSupplierBreakdown(@Query() dto: GetSupplierBreakdownDto): Promise<SupplierBreakdownResponseDto[]> {
    return this.service.getSupplierBreakdown(dto);
  }

  @Get('comparison')
  async getSupplierComparison(@Query() dto: GetSupplierComparisonDto): Promise<SupplierComparisonResponseDto> {
    return this.service.getSupplierComparison(dto);
  }

  @Get('ranking')
  async getSupplierRanking(@Query() dto: GetSupplierRankingDto): Promise<SupplierRankingResponseDto[]> {
    return this.service.getSupplierRanking(dto);
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
