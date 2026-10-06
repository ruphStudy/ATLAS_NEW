import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SalesAnalyticsRepository } from './sales-analytics.repository';
import { SalesAnalyticsEventQueue } from './jobs';
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
import {
  ISalesAnalyticsFilters,
  SalesAnalyticsEventType,
  SalesComparisonType,
} from './interfaces';

@Injectable()
export class SalesAnalyticsService {
  private readonly logger = new Logger(SalesAnalyticsService.name);
  private readonly CACHE_TTL_MINUTES = 15;

  constructor(
    private readonly repository: SalesAnalyticsRepository,
    private readonly eventQueue: SalesAnalyticsEventQueue,
  ) {}

  async getSalesSummary(dto: GetSalesSummaryDto): Promise<SalesSummaryResponseDto> {
    const cacheKey = this.buildCacheKey('summary', dto);
    
    const cached = await this.repository.getCachedSummary(dto.workspaceId, cacheKey);
    if (cached) {
      return cached as SalesSummaryResponseDto;
    }

    const filters = this.buildFilters(dto);
    const summary = await this.repository.getSalesSummary(filters);

    await this.repository.setCachedSummary(
      dto.workspaceId,
      cacheKey,
      summary,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: SalesAnalyticsEventType.SALES_DATA_REFRESHED,
      workspaceId: dto.workspaceId,
      timestamp: new Date(),
      metadata: { type: 'summary' },
    });

    return summary as SalesSummaryResponseDto;
  }

  async getSalesTrends(dto: GetSalesTrendsDto): Promise<SalesTrendResponseDto[]> {
    const filters = this.buildFilters(dto);
    const trends = await this.repository.getSalesTrends(
      filters,
      dto.metricType,
      dto.period,
    );

    await this.eventQueue.publish({
      event: SalesAnalyticsEventType.TREND_CALCULATED,
      workspaceId: dto.workspaceId,
      timestamp: new Date(),
      metadata: { metricType: dto.metricType, period: dto.period },
    });

    return trends as SalesTrendResponseDto[];
  }

  async getSalesBreakdown(dto: GetSalesBreakdownDto): Promise<SalesBreakdownResponseDto[]> {
    const filters = this.buildFilters(dto);
    const breakdown = await this.repository.getSalesBreakdown(
      filters,
      dto.dimension,
      dto.limit,
      dto.sortBy,
      dto.sortOrder,
    );

    await this.eventQueue.publish({
      event: SalesAnalyticsEventType.BREAKDOWN_GENERATED,
      workspaceId: dto.workspaceId,
      timestamp: new Date(),
      metadata: { dimension: dto.dimension },
    });

    return breakdown as SalesBreakdownResponseDto[];
  }

  async getSalesComparison(dto: GetSalesComparisonDto): Promise<SalesComparisonResponseDto> {
    const { comparisonStartDate, comparisonEndDate } = this.calculateComparisonPeriod(
      dto.currentStartDate,
      dto.currentEndDate,
      dto.comparisonType,
      dto.comparisonStartDate,
      dto.comparisonEndDate,
    );

    const comparison = await this.repository.getSalesComparison(
      dto.workspaceId,
      dto.currentStartDate,
      dto.currentEndDate,
      dto.comparisonType,
      comparisonStartDate,
      comparisonEndDate,
      {
        marketplaceIds: dto.marketplaceIds,
        accountIds: dto.accountIds,
        currency: dto.currency,
      },
    );

    return comparison as SalesComparisonResponseDto;
  }

  async getProductPerformance(
    dto: GetProductPerformanceDto,
  ): Promise<ProductPerformanceResponseDto[]> {
    const filters = this.buildFilters(dto);
    const performance = await this.repository.getProductPerformance(
      filters,
      dto.performanceCategory,
      dto.limit,
    );

    return performance as ProductPerformanceResponseDto[];
  }

  async createTarget(dto: CreateSalesTargetDto): Promise<SalesTargetResponseDto> {
    const target = await this.repository.createTarget(dto);

    await this.eventQueue.publish({
      event: SalesAnalyticsEventType.TARGET_UPDATED,
      workspaceId: dto.workspaceId,
      timestamp: new Date(),
      metadata: { action: 'created', targetId: target.id },
    });

    return target as SalesTargetResponseDto;
  }

  async updateTarget(
    id: string,
    workspaceId: string,
    dto: UpdateSalesTargetDto,
  ): Promise<SalesTargetResponseDto> {
    const existing = await this.repository.findTargetById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`Target ${id} not found`);
    }

    const updated = await this.repository.updateTarget(id, workspaceId, dto);

    await this.eventQueue.publish({
      event: SalesAnalyticsEventType.TARGET_UPDATED,
      workspaceId,
      timestamp: new Date(),
      metadata: { action: 'updated', targetId: id },
    });

    return updated as SalesTargetResponseDto;
  }

  async getTargetById(id: string, workspaceId: string): Promise<SalesTargetResponseDto> {
    const target = await this.repository.findTargetById(id, workspaceId);
    if (!target) {
      throw new NotFoundException(`Target ${id} not found`);
    }

    return target as SalesTargetResponseDto;
  }

  async getAllTargets(workspaceId: string): Promise<SalesTargetResponseDto[]> {
    const targets = await this.repository.findAllTargets(workspaceId);
    return targets as SalesTargetResponseDto[];
  }

  async deleteTarget(id: string, workspaceId: string): Promise<void> {
    const existing = await this.repository.findTargetById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`Target ${id} not found`);
    }

    await this.repository.deleteTarget(id, workspaceId);
  }

  async getTargetPerformance(
    id: string,
    workspaceId: string,
  ): Promise<SalesTargetPerformanceResponseDto> {
    const performance = await this.repository.getTargetPerformance(id, workspaceId);
    if (!performance) {
      throw new NotFoundException(`Target performance for ${id} not found`);
    }

    return performance as SalesTargetPerformanceResponseDto;
  }

  async createSavedView(dto: CreateSavedViewDto): Promise<SavedViewResponseDto> {
    const view = await this.repository.createSavedView(dto);

    await this.eventQueue.publish({
      event: SalesAnalyticsEventType.VIEW_SAVED,
      workspaceId: dto.workspaceId,
      timestamp: new Date(),
      metadata: { action: 'created', viewId: view.id },
    });

    return view as SavedViewResponseDto;
  }

  async updateSavedView(
    id: string,
    workspaceId: string,
    dto: UpdateSavedViewDto,
  ): Promise<SavedViewResponseDto> {
    const existing = await this.repository.findSavedViewById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`Saved view ${id} not found`);
    }

    const updated = await this.repository.updateSavedView(id, workspaceId, dto);

    await this.eventQueue.publish({
      event: SalesAnalyticsEventType.VIEW_SAVED,
      workspaceId,
      timestamp: new Date(),
      metadata: { action: 'updated', viewId: id },
    });

    return updated as SavedViewResponseDto;
  }

  async getSavedViewById(id: string, workspaceId: string): Promise<SavedViewResponseDto> {
    const view = await this.repository.findSavedViewById(id, workspaceId);
    if (!view) {
      throw new NotFoundException(`Saved view ${id} not found`);
    }

    return view as SavedViewResponseDto;
  }

  async getAllSavedViews(workspaceId: string): Promise<SavedViewResponseDto[]> {
    const views = await this.repository.findAllSavedViews(workspaceId);
    return views as SavedViewResponseDto[];
  }

  async deleteSavedView(id: string, workspaceId: string): Promise<void> {
    const existing = await this.repository.findSavedViewById(id, workspaceId);
    if (!existing) {
      throw new NotFoundException(`Saved view ${id} not found`);
    }

    await this.repository.deleteSavedView(id, workspaceId);
  }

  async getDrillDownOrders(dto: DrillDownRequestDto): Promise<{
    orders: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;

    const filters: Record<string, any> = {};
    if (dto.productId) filters.productId = dto.productId;
    if (dto.sku) filters.sku = dto.sku;
    if (dto.marketplace) filters.marketplace = dto.marketplace;
    if (dto.account) filters.account = dto.account;

    const { orders, total } = await this.repository.getDrillDownOrders(
      dto.workspaceId,
      dto.startDate,
      dto.endDate,
      filters,
      page,
      limit,
    );

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async exportSalesData(dto: ExportSalesDataDto): Promise<{ url: string; expiresAt: Date }> {
    await this.eventQueue.publish({
      event: SalesAnalyticsEventType.REPORT_EXPORTED,
      workspaceId: dto.workspaceId,
      timestamp: new Date(),
      metadata: { format: dto.format },
    });

    const exportUrl = `https://exports.atlas.example.com/${dto.workspaceId}/sales_${Date.now()}.${dto.format}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      url: exportUrl,
      expiresAt,
    };
  }

  async invalidateCache(workspaceId: string, pattern?: string): Promise<number> {
    return this.repository.invalidateCache(workspaceId, pattern);
  }

  private buildFilters(dto: GetSalesSummaryDto): ISalesAnalyticsFilters {
    return {
      workspaceId: dto.workspaceId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      period: dto.period,
      marketplaceIds: dto.marketplaceIds,
      accountIds: dto.accountIds,
      providerKeys: dto.providerKeys,
      productIds: dto.productIds,
      skus: dto.skus,
      categories: dto.categories,
      brands: dto.brands,
      countries: dto.countries,
      regions: dto.regions,
      currency: dto.currency,
      customerType: dto.customerType,
      orderStatuses: dto.orderStatuses,
    };
  }

  private buildCacheKey(type: string, dto: any): string {
    const parts = [
      'sales',
      type,
      dto.startDate.toISOString().split('T')[0],
      dto.endDate.toISOString().split('T')[0],
    ];

    if (dto.period) parts.push(dto.period);
    if (dto.metricType) parts.push(dto.metricType);
    if (dto.dimension) parts.push(dto.dimension);
    if (dto.marketplaceIds?.length) parts.push(dto.marketplaceIds.join(','));

    return parts.join(':');
  }

  private calculateComparisonPeriod(
    currentStart: Date,
    currentEnd: Date,
    comparisonType: SalesComparisonType,
    customStart?: Date,
    customEnd?: Date,
  ): { comparisonStartDate: Date; comparisonEndDate: Date } {
    if (comparisonType === SalesComparisonType.CUSTOM_PERIOD) {
      return {
        comparisonStartDate: customStart || currentStart,
        comparisonEndDate: customEnd || currentEnd,
      };
    }

    const currentDuration = currentEnd.getTime() - currentStart.getTime();

    if (comparisonType === SalesComparisonType.PREVIOUS_PERIOD) {
      return {
        comparisonStartDate: new Date(currentStart.getTime() - currentDuration),
        comparisonEndDate: new Date(currentStart.getTime() - 1),
      };
    }

    if (comparisonType === SalesComparisonType.SAME_PERIOD_LAST_YEAR) {
      const yearAgo = new Date(currentStart);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      const yearAgoEnd = new Date(currentEnd);
      yearAgoEnd.setFullYear(yearAgoEnd.getFullYear() - 1);

      return {
        comparisonStartDate: yearAgo,
        comparisonEndDate: yearAgoEnd,
      };
    }

    return {
      comparisonStartDate: currentStart,
      comparisonEndDate: currentEnd,
    };
  }
}
