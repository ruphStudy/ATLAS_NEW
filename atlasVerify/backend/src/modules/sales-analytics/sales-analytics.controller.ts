import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SalesAnalyticsService } from './sales-analytics.service';
import {
  GetSalesSummaryDto,
  GetSalesTrendsDto,
  GetSalesBreakdownDto,
  GetSalesComparisonDto,
  GetProductPerformanceDto,
  CreateSalesTargetDto,
  UpdateSalesTargetDto,
  CreateSavedViewDto,
  UpdateSavedViewDto,
  DrillDownRequestDto,
  ExportSalesDataDto,
  SalesSummaryResponseDto,
  SalesTrendResponseDto,
  SalesBreakdownResponseDto,
  SalesComparisonResponseDto,
  ProductPerformanceResponseDto,
  SalesTargetResponseDto,
  SalesTargetPerformanceResponseDto,
  SavedViewResponseDto,
} from './dto';

@Controller('sales-analytics')
export class SalesAnalyticsController {
  constructor(private readonly salesAnalyticsService: SalesAnalyticsService) {}

  @Post('summary')
  @HttpCode(HttpStatus.OK)
  async getSalesSummary(
    @Body() dto: GetSalesSummaryDto,
  ): Promise<SalesSummaryResponseDto> {
    return this.salesAnalyticsService.getSalesSummary(dto);
  }

  @Post('trends')
  @HttpCode(HttpStatus.OK)
  async getSalesTrends(
    @Body() dto: GetSalesTrendsDto,
  ): Promise<SalesTrendResponseDto[]> {
    return this.salesAnalyticsService.getSalesTrends(dto);
  }

  @Post('breakdown')
  @HttpCode(HttpStatus.OK)
  async getSalesBreakdown(
    @Body() dto: GetSalesBreakdownDto,
  ): Promise<SalesBreakdownResponseDto[]> {
    return this.salesAnalyticsService.getSalesBreakdown(dto);
  }

  @Post('comparison')
  @HttpCode(HttpStatus.OK)
  async getSalesComparison(
    @Body() dto: GetSalesComparisonDto,
  ): Promise<SalesComparisonResponseDto> {
    return this.salesAnalyticsService.getSalesComparison(dto);
  }

  @Post('product-performance')
  @HttpCode(HttpStatus.OK)
  async getProductPerformance(
    @Body() dto: GetProductPerformanceDto,
  ): Promise<ProductPerformanceResponseDto[]> {
    return this.salesAnalyticsService.getProductPerformance(dto);
  }

  @Post('targets')
  async createTarget(
    @Body() dto: CreateSalesTargetDto,
  ): Promise<SalesTargetResponseDto> {
    return this.salesAnalyticsService.createTarget(dto);
  }

  @Put('targets/:id')
  async updateTarget(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateSalesTargetDto,
  ): Promise<SalesTargetResponseDto> {
    return this.salesAnalyticsService.updateTarget(id, workspaceId, dto);
  }

  @Get('targets/:id')
  async getTargetById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<SalesTargetResponseDto> {
    return this.salesAnalyticsService.getTargetById(id, workspaceId);
  }

  @Get('targets')
  async getAllTargets(
    @Query('workspaceId') workspaceId: string,
  ): Promise<SalesTargetResponseDto[]> {
    return this.salesAnalyticsService.getAllTargets(workspaceId);
  }

  @Delete('targets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTarget(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.salesAnalyticsService.deleteTarget(id, workspaceId);
  }

  @Get('targets/:id/performance')
  async getTargetPerformance(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<SalesTargetPerformanceResponseDto> {
    return this.salesAnalyticsService.getTargetPerformance(id, workspaceId);
  }

  @Post('saved-views')
  async createSavedView(
    @Body() dto: CreateSavedViewDto,
  ): Promise<SavedViewResponseDto> {
    return this.salesAnalyticsService.createSavedView(dto);
  }

  @Put('saved-views/:id')
  async updateSavedView(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateSavedViewDto,
  ): Promise<SavedViewResponseDto> {
    return this.salesAnalyticsService.updateSavedView(id, workspaceId, dto);
  }

  @Get('saved-views/:id')
  async getSavedViewById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<SavedViewResponseDto> {
    return this.salesAnalyticsService.getSavedViewById(id, workspaceId);
  }

  @Get('saved-views')
  async getAllSavedViews(
    @Query('workspaceId') workspaceId: string,
  ): Promise<SavedViewResponseDto[]> {
    return this.salesAnalyticsService.getAllSavedViews(workspaceId);
  }

  @Delete('saved-views/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSavedView(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.salesAnalyticsService.deleteSavedView(id, workspaceId);
  }

  @Post('drill-down/orders')
  @HttpCode(HttpStatus.OK)
  async getDrillDownOrders(@Body() dto: DrillDownRequestDto): Promise<{
    orders: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.salesAnalyticsService.getDrillDownOrders(dto);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  async exportSalesData(
    @Body() dto: ExportSalesDataDto,
  ): Promise<{ url: string; expiresAt: Date }> {
    return this.salesAnalyticsService.exportSalesData(dto);
  }

  @Delete('cache')
  @HttpCode(HttpStatus.OK)
  async invalidateCache(
    @Query('workspaceId') workspaceId: string,
    @Query('pattern') pattern?: string,
  ): Promise<{ invalidated: number }> {
    const count = await this.salesAnalyticsService.invalidateCache(workspaceId, pattern);
    return { invalidated: count };
  }
}
