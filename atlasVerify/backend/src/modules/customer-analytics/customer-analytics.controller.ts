import { Controller, Get, Query, Delete, Param } from '@nestjs/common';
import { CustomerAnalyticsService } from './customer-analytics.service';
import {
  GetCustomerPerformanceDto,
  GetCustomerTrendsDto,
  GetCustomerBreakdownDto,
  GetCustomerComparisonDto,
  GetCustomerCohortDto,
  GetProductAffinityDto,
  GetCustomerSegmentAlertsDto,
  CustomerPerformanceResponseDto,
  CustomerTrendResponseDto,
  CustomerBreakdownResponseDto,
  CustomerComparisonResponseDto,
  CustomerCohortResponseDto,
  ProductAffinityResponseDto,
  CustomerSegmentAlertResponseDto,
} from './dto';

@Controller('customer-analytics')
export class CustomerAnalyticsController {
  constructor(private readonly service: CustomerAnalyticsService) {}

  @Get('performance')
  async getCustomerPerformance(
    @Query() dto: GetCustomerPerformanceDto,
  ): Promise<CustomerPerformanceResponseDto[]> {
    return this.service.getCustomerPerformance(dto);
  }

  @Get('trends')
  async getCustomerTrends(
    @Query() dto: GetCustomerTrendsDto,
  ): Promise<CustomerTrendResponseDto[]> {
    return this.service.getCustomerTrends(dto);
  }

  @Get('breakdown')
  async getCustomerBreakdown(
    @Query() dto: GetCustomerBreakdownDto,
  ): Promise<CustomerBreakdownResponseDto[]> {
    return this.service.getCustomerBreakdown(dto);
  }

  @Get('comparison')
  async getCustomerComparison(
    @Query() dto: GetCustomerComparisonDto,
  ): Promise<CustomerComparisonResponseDto | null> {
    return this.service.getCustomerComparison(dto);
  }

  @Get('cohort')
  async getCustomerCohort(
    @Query() dto: GetCustomerCohortDto,
  ): Promise<CustomerCohortResponseDto> {
    return this.service.getCustomerCohort(dto);
  }

  @Get('product-affinity')
  async getProductAffinity(
    @Query() dto: GetProductAffinityDto,
  ): Promise<ProductAffinityResponseDto[]> {
    return this.service.getProductAffinity(dto);
  }

  @Get('segment-alerts')
  async getCustomerSegmentAlerts(
    @Query() dto: GetCustomerSegmentAlertsDto,
  ): Promise<CustomerSegmentAlertResponseDto[]> {
    return this.service.getCustomerSegmentAlerts(dto);
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
