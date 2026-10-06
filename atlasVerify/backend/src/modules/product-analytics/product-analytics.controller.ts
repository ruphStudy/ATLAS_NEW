import { Controller, Get, Delete, Query } from '@nestjs/common';
import { ProductAnalyticsService } from './product-analytics.service';
import {
  GetProductPerformanceDto,
  GetProductTrendsDto,
  GetProductBreakdownDto,
  GetProductComparisonDto,
  GetProductCohortDto,
  GetListingPerformanceDto,
  GetMarketplacePerformanceDto,
  ProductPerformanceResponseDto,
  ProductTrendResponseDto,
  ProductBreakdownResponseDto,
  ProductComparisonResponseDto,
  ProductCohortResponseDto,
  ListingPerformanceResponseDto,
  MarketplacePerformanceResponseDto,
} from './dto';

@Controller('product-analytics')
export class ProductAnalyticsController {
  constructor(private readonly service: ProductAnalyticsService) {}

  @Get('performance')
  async getProductPerformance(@Query() dto: GetProductPerformanceDto): Promise<ProductPerformanceResponseDto[]> {
    return this.service.getProductPerformance(dto);
  }

  @Get('trends')
  async getProductTrends(@Query() dto: GetProductTrendsDto): Promise<ProductTrendResponseDto[]> {
    return this.service.getProductTrends(dto);
  }

  @Get('breakdown')
  async getProductBreakdown(@Query() dto: GetProductBreakdownDto): Promise<ProductBreakdownResponseDto[]> {
    return this.service.getProductBreakdown(dto);
  }

  @Get('comparison')
  async getProductComparison(@Query() dto: GetProductComparisonDto): Promise<ProductComparisonResponseDto> {
    return this.service.getProductComparison(dto);
  }

  @Get('cohort')
  async getProductCohort(@Query() dto: GetProductCohortDto): Promise<ProductCohortResponseDto[]> {
    return this.service.getProductCohort(dto);
  }

  @Get('listing-performance')
  async getListingPerformance(@Query() dto: GetListingPerformanceDto): Promise<ListingPerformanceResponseDto[]> {
    return this.service.getListingPerformance(dto);
  }

  @Get('marketplace-performance')
  async getMarketplacePerformance(@Query() dto: GetMarketplacePerformanceDto): Promise<MarketplacePerformanceResponseDto[]> {
    return this.service.getMarketplacePerformance(dto);
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
