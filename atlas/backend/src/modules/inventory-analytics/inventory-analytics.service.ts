import { Injectable, Logger } from '@nestjs/common';
import { InventoryAnalyticsRepository } from './inventory-analytics.repository';
import { InventoryAnalyticsEventQueue } from './jobs';
import {
  DashboardFilterDto,
  TrendFilterDto,
  ProductAnalyticsFilterDto,
  WarehouseBreakdownFilterDto,
  RefreshCacheDto,
  DashboardSummaryResponseDto,
  InventoryKPIsResponseDto,
  StockLevelMetricsResponseDto,
  InventoryMovementMetricsResponseDto,
  WarehousePerformanceResponseDto,
  InventoryValueMetricsResponseDto,
  InventoryAgingMetricsResponseDto,
  InventoryTrendResponseDto,
  ProductAnalyticsResponseDto,
  PaginatedProductAnalyticsResponseDto,
  WarehouseBreakdownResponseDto,
} from './dto';
import {
  IDashboardSummary,
  IInventoryKPIs,
  IStockLevelMetrics,
  IInventoryMovementMetrics,
  IWarehousePerformance,
  IInventoryValueMetrics,
  IInventoryAgingMetrics,
  InventoryAnalyticsEvent,
  InventoryAnalyticsPeriod,
} from './interfaces';

@Injectable()
export class InventoryAnalyticsService {
  private readonly logger = new Logger(InventoryAnalyticsService.name);
  private readonly CACHE_TTL_MINUTES = 15;

  constructor(
    private readonly repository: InventoryAnalyticsRepository,
    private readonly eventQueue: InventoryAnalyticsEventQueue,
  ) {}

  async getDashboardSummary(
    dto: DashboardFilterDto,
  ): Promise<DashboardSummaryResponseDto> {
    const cacheKey = this.buildCacheKey('dashboard', dto as unknown as Record<string, unknown>);
    
    const cached = await this.repository.getCachedDashboard(
      dto.workspaceId,
      cacheKey,
    );

    if (cached) {
      this.logger.debug(`Returning cached dashboard for ${dto.workspaceId}`);
      return cached as unknown as IDashboardSummary;
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

    const [kpis, stockLevels, movements, warehouses] = await Promise.all([
      this.getInventoryKPIs(dto.workspaceId, dto.warehouseId),
      this.getStockLevelMetrics(dto.workspaceId, dto.warehouseId),
      this.getInventoryMovementMetrics(
        dto.workspaceId,
        dto.warehouseId,
        startDate,
        endDate,
      ),
      this.getWarehousePerformance(dto.workspaceId),
    ]);

    const value = await this.getInventoryValueMetrics(
      dto.workspaceId,
      dto.warehouseId,
    );

    const aging = await this.getInventoryAgingMetrics(
      dto.workspaceId,
      dto.warehouseId,
    );

    const summary: IDashboardSummary = {
      kpis,
      stockLevels,
      movements,
      value,
      aging,
      warehouses,
      lastUpdated: new Date(),
    };

    await this.repository.setCachedDashboard(
      dto.workspaceId,
      dto.warehouseId || null,
      cacheKey,
      summary as unknown as Record<string, unknown>,
      this.CACHE_TTL_MINUTES,
    );

    await this.eventQueue.publish({
      event: InventoryAnalyticsEvent.ANALYTICS_REFRESHED,
      workspaceId: dto.workspaceId,
      warehouseId: dto.warehouseId,
    });

    return summary;
  }

  async getInventoryKPIs(
    workspaceId: string,
    warehouseId?: string,
  ): Promise<InventoryKPIsResponseDto> {
    const kpis = await this.repository.getInventoryKPIs(workspaceId, warehouseId);

    return {
      physicalStock: kpis.physicalStock,
      availableStock: kpis.availableStock,
      reservedStock: kpis.reservedStock,
      allocatedStock: kpis.allocatedStock,
      blockedStock: kpis.blockedStock,
      damagedStock: kpis.damagedStock,
      inTransitStock: 0,
      incomingStock: 0,
      stockValue: 0,
      averageCost: 0,
      turnoverRate: 0,
      daysOfCover: 0,
    };
  }

  async getStockLevelMetrics(
    workspaceId: string,
    warehouseId?: string,
  ): Promise<StockLevelMetricsResponseDto> {
    const counts = await this.repository.getStockLevelCounts(
      workspaceId,
      warehouseId,
    );

    return {
      lowStockCount: counts.lowStockCount,
      outOfStockCount: counts.outOfStockCount,
      excessStockCount: counts.excessStockCount,
      deadStockCount: 0,
      normalStockCount: 0,
      criticalStockCount: 0,
    };
  }

  async getInventoryMovementMetrics(
    workspaceId: string,
    warehouseId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<InventoryMovementMetricsResponseDto> {
    const metrics = await this.repository.getMovementMetrics(
      workspaceId,
      warehouseId,
      startDate,
      endDate,
    );

    const netMovement =
      metrics.receivedQuantity -
      metrics.dispatchedQuantity +
      metrics.adjustmentQuantity;

    return {
      receivedQuantity: metrics.receivedQuantity,
      dispatchedQuantity: metrics.dispatchedQuantity,
      adjustmentQuantity: metrics.adjustmentQuantity,
      transferInQuantity: 0,
      transferOutQuantity: 0,
      netMovement,
    };
  }

  async getWarehousePerformance(
    workspaceId: string,
  ): Promise<WarehousePerformanceResponseDto[]> {
    const breakdown = await this.repository.getWarehouseBreakdown(workspaceId);

    return breakdown.map((item) => ({
      warehouseId: item.warehouseId,
      warehouseName: undefined,
      receivingCount: 0,
      putawayCount: 0,
      pickingCount: 0,
      packingCount: 0,
      dispatchCount: 0,
      transferCount: 0,
      adjustmentCount: 0,
      cycleCountCount: 0,
      averageReceivingTime: undefined,
      averagePutawayTime: undefined,
      averagePickingTime: undefined,
      averagePackingTime: undefined,
      capacityUtilization: undefined,
      occupancyPercentage: undefined,
    }));
  }

  async getInventoryValueMetrics(
    workspaceId: string,
    warehouseId?: string,
  ): Promise<InventoryValueMetricsResponseDto> {
    return {
      totalStockValue: 0,
      availableStockValue: 0,
      reservedStockValue: 0,
      blockedStockValue: 0,
      damagedStockValue: 0,
      carryingCost: 0,
      totalSKUs: 0,
      totalProducts: 0,
    };
  }

  async getInventoryAgingMetrics(
    workspaceId: string,
    warehouseId?: string,
  ): Promise<InventoryAgingMetricsResponseDto> {
    return {
      lessThan30Days: 0,
      between30And60Days: 0,
      between60And90Days: 0,
      moreThan90Days: 0,
      averageAgingDays: 0,
    };
  }

  async getInventoryTrend(
    dto: TrendFilterDto,
  ): Promise<InventoryTrendResponseDto> {
    return {
      metric: dto.metric,
      period: dto.period,
      dataPoints: [],
    };
  }

  async getProductAnalytics(
    dto: ProductAnalyticsFilterDto,
  ): Promise<PaginatedProductAnalyticsResponseDto> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const offset = (page - 1) * limit;

    const [products, total] = await this.repository.getProductAnalytics(
      dto.workspaceId,
      dto.warehouseId,
      limit,
      offset,
    );

    const data = products.map((product) => ({
      inventoryItemId: product.inventoryItemId,
      sku: undefined,
      productName: undefined,
      physicalStock: product.physicalStock,
      availableStock: product.availableStock,
      stockValue: undefined,
      turnoverRate: undefined,
      daysOfCover: undefined,
      lastReceived: undefined,
      lastDispatched: undefined,
      totalReceived: 0,
      totalDispatched: 0,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getWarehouseBreakdown(
    dto: WarehouseBreakdownFilterDto,
  ): Promise<WarehouseBreakdownResponseDto[]> {
    const breakdown = await this.repository.getWarehouseBreakdown(dto.workspaceId);

    return breakdown.map((item) => ({
      warehouseId: item.warehouseId,
      warehouseName: undefined,
      physicalStock: item.physicalStock,
      availableStock: item.physicalStock,
      stockValue: undefined,
      skuCount: item.skuCount,
      capacityUtilization: undefined,
    }));
  }

  async refreshCache(dto: RefreshCacheDto): Promise<{ invalidated: number }> {
    const pattern = dto.cacheKeys?.join('|') || undefined;
    const count = await this.repository.invalidateCache(dto.workspaceId, pattern);

    await this.eventQueue.publish({
      event: InventoryAnalyticsEvent.CACHE_INVALIDATED,
      workspaceId: dto.workspaceId,
      warehouseId: dto.warehouseId,
      cacheKeys: dto.cacheKeys,
    });

    return { invalidated: count };
  }

  private buildCacheKey(prefix: string, filter: Record<string, unknown>): string {
    const parts = [prefix];
    
    if (filter.warehouseId) parts.push(`w:${filter.warehouseId}`);
    if (filter.marketplaceAccountId) parts.push(`m:${filter.marketplaceAccountId}`);
    if (filter.channel) parts.push(`c:${filter.channel}`);
    if (filter.region) parts.push(`r:${filter.region}`);
    if (filter.startDate) parts.push(`sd:${filter.startDate}`);
    if (filter.endDate) parts.push(`ed:${filter.endDate}`);

    return parts.join(':');
  }
}
