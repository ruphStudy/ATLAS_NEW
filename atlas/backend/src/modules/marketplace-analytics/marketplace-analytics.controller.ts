import { Controller, Get, Delete, Query } from '@nestjs/common';
import { MarketplaceAnalyticsService } from './marketplace-analytics.service';
import {
  GetMarketplacePerformanceDto,
  GetMarketplaceTrendsDto,
  GetMarketplaceBreakdownDto,
  GetMarketplaceComparisonDto,
  GetProductMarketplaceComparisonDto,
  MarketplacePerformanceResponseDto,
  MarketplaceTrendResponseDto,
  MarketplaceBreakdownResponseDto,
  MarketplaceComparisonResponseDto,
  ProductMarketplaceComparisonResponseDto,
} from './dto';

@Controller('marketplace-analytics')
export class MarketplaceAnalyticsController {
  constructor(private readonly service: MarketplaceAnalyticsService) {}

  @Get('performance')
  async getMarketplacePerformance(@Query() dto: GetMarketplacePerformanceDto): Promise<MarketplacePerformanceResponseDto[]> {
    return this.service.getMarketplacePerformance(dto);
  }

  @Get('trends')
  async getMarketplaceTrends(@Query() dto: GetMarketplaceTrendsDto): Promise<MarketplaceTrendResponseDto[]> {
    return this.service.getMarketplaceTrends(dto);
  }

  @Get('breakdown')
  async getMarketplaceBreakdown(@Query() dto: GetMarketplaceBreakdownDto): Promise<MarketplaceBreakdownResponseDto[]> {
    return this.service.getMarketplaceBreakdown(dto);
  }

  @Get('comparison')
  async getMarketplaceComparison(@Query() dto: GetMarketplaceComparisonDto): Promise<MarketplaceComparisonResponseDto> {
    return this.service.getMarketplaceComparison(dto);
  }

  @Get('product-comparison')
  async getProductMarketplaceComparison(@Query() dto: GetProductMarketplaceComparisonDto): Promise<ProductMarketplaceComparisonResponseDto> {
    return this.service.getProductMarketplaceComparison(dto);
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
