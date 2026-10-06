import { Injectable, Logger } from '@nestjs/common';
import { ExecutiveDashboardRepository } from './executive-dashboard.repository';
import {
  GetExecutiveOverviewDto,
  ExecutiveOverviewResponseDto,
  ExecutiveKpiResponseDto,
  ExecutiveSummaryResponseDto,
  ExecutiveAlertResponseDto,
  ExecutiveInsightResponseDto,
  MarketplaceComparisonResponseDto,
  AiOperationsSummaryResponseDto,
} from './dto';
import {
  IExecutiveDashboardFilters,
  ExecutiveMetricCategory,
  TrendDirection,
  AlertSeverity,
} from './interfaces';

@Injectable()
export class ExecutiveDashboardService {
  private readonly logger = new Logger(ExecutiveDashboardService.name);

  constructor(private readonly repository: ExecutiveDashboardRepository) {}

  async getExecutiveOverview(
    dto: GetExecutiveOverviewDto,
  ): Promise<ExecutiveOverviewResponseDto> {
    const filters: IExecutiveDashboardFilters = {
      workspaceId: dto.workspaceId,
      dateRange: {
        start: dto.startDate,
        end: dto.endDate,
      },
      marketplaceIds: dto.marketplaceIds,
      accountIds: dto.accountIds,
      warehouseIds: dto.warehouseIds,
      categoryIds: dto.categoryIds,
      currency: dto.currency,
      comparisonPeriod: dto.comparisonPeriod,
    };

    const [
      kpis,
      summaries,
      alerts,
      insights,
      marketplaceComparisons,
      aiOperations,
    ] = await Promise.all([
      this.getKpis(filters),
      this.getSummaries(filters),
      this.getAlerts(dto.workspaceId),
      this.getInsights(filters),
      this.getMarketplaceComparisons(filters),
      this.getAiOperationsSummary(filters),
    ]);

    return {
      kpis,
      summaries,
      alerts,
      insights,
      marketplaceComparisons,
      aiOperations,
      generatedAt: new Date(),
    };
  }

  async getKpisByCategory(
    workspaceId: string,
    category: ExecutiveMetricCategory,
    startDate: Date,
    endDate: Date,
  ): Promise<ExecutiveKpiResponseDto[]> {
    const filters: IExecutiveDashboardFilters = {
      workspaceId,
      dateRange: { start: startDate, end: endDate },
    };

    const allKpis = await this.repository.getKpis(filters);
    return allKpis.filter((kpi) => kpi.category === category) as ExecutiveKpiResponseDto[];
  }

  async getAlerts(
    workspaceId: string,
    resolved?: boolean,
  ): Promise<ExecutiveAlertResponseDto[]> {
    const alerts = await this.repository.getAlerts(workspaceId, resolved);
    return alerts as ExecutiveAlertResponseDto[];
  }

  async getSummaryByCategory(
    workspaceId: string,
    category: ExecutiveMetricCategory,
    startDate: Date,
    endDate: Date,
  ): Promise<ExecutiveSummaryResponseDto | null> {
    const filters: IExecutiveDashboardFilters = {
      workspaceId,
      dateRange: { start: startDate, end: endDate },
    };

    const summaries = await this.repository.getSummaries(filters);
    const summary = summaries.find((s) => s.category === category);

    return summary ? (summary as ExecutiveSummaryResponseDto) : null;
  }

  private async getKpis(
    filters: IExecutiveDashboardFilters,
  ): Promise<ExecutiveKpiResponseDto[]> {
    const kpis = await this.repository.getKpis(filters);

    const calculatedKpis = await Promise.all([
      this.calculateRevenueKpis(filters),
      this.calculateProfitKpis(filters),
      this.calculateOrderKpis(filters),
      this.calculateProductKpis(filters),
      this.calculateSupplierKpis(filters),
      this.calculateInventoryKpis(filters),
      this.calculateProcurementKpis(filters),
      this.calculateWarehouseKpis(filters),
    ]);

    return [...kpis, ...calculatedKpis.flat()] as ExecutiveKpiResponseDto[];
  }

  private async getSummaries(
    filters: IExecutiveDashboardFilters,
  ): Promise<ExecutiveSummaryResponseDto[]> {
    const summaries = await this.repository.getSummaries(filters);
    return summaries as ExecutiveSummaryResponseDto[];
  }

  private async getInsights(
    filters: IExecutiveDashboardFilters,
  ): Promise<ExecutiveInsightResponseDto[]> {
    const insights = await this.repository.getInsights(filters);
    return insights as ExecutiveInsightResponseDto[];
  }

  private async getMarketplaceComparisons(
    filters: IExecutiveDashboardFilters,
  ): Promise<MarketplaceComparisonResponseDto[]> {
    const comparisons = await this.repository.getMarketplaceComparisons(filters);
    return comparisons as MarketplaceComparisonResponseDto[];
  }

  private async getAiOperationsSummary(
    filters: IExecutiveDashboardFilters,
  ): Promise<AiOperationsSummaryResponseDto> {
    const summary = await this.repository.getAiOperationsSummary(filters);
    return summary as AiOperationsSummaryResponseDto;
  }

  private async calculateRevenueKpis(
    filters: IExecutiveDashboardFilters,
  ): Promise<ExecutiveKpiResponseDto[]> {
    const metrics = await this.repository.getRevenueMetrics(filters);

    return [
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.REVENUE,
        'total_revenue',
        'Total Revenue',
        metrics.totalRevenue || 0,
        metrics.revenueTarget,
        metrics.previousRevenue,
        filters.currency || 'USD',
      ),
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.REVENUE,
        'revenue_growth',
        'Revenue Growth',
        metrics.revenueGrowth || 0,
        undefined,
        undefined,
        '%',
      ),
    ];
  }

  private async calculateProfitKpis(
    filters: IExecutiveDashboardFilters,
  ): Promise<ExecutiveKpiResponseDto[]> {
    const metrics = await this.repository.getProfitMetrics(filters);

    return [
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.PROFIT,
        'gross_profit',
        'Gross Profit',
        metrics.grossProfit || 0,
        metrics.profitTarget,
        metrics.previousProfit,
        filters.currency || 'USD',
      ),
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.PROFIT,
        'profit_margin',
        'Profit Margin',
        metrics.profitMargin || 0,
        undefined,
        undefined,
        '%',
      ),
    ];
  }

  private async calculateOrderKpis(
    filters: IExecutiveDashboardFilters,
  ): Promise<ExecutiveKpiResponseDto[]> {
    const metrics = await this.repository.getOrderMetrics(filters);

    return [
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.ORDERS,
        'total_orders',
        'Total Orders',
        metrics.totalOrders || 0,
        metrics.orderTarget,
        metrics.previousOrders,
      ),
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.ORDERS,
        'average_order_value',
        'Average Order Value',
        metrics.averageOrderValue || 0,
        undefined,
        undefined,
        filters.currency || 'USD',
      ),
    ];
  }

  private async calculateProductKpis(
    filters: IExecutiveDashboardFilters,
  ): Promise<ExecutiveKpiResponseDto[]> {
    const metrics = await this.repository.getProductMetrics(filters);

    return [
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.PRODUCTS,
        'active_products',
        'Active Products',
        metrics.activeProducts || 0,
      ),
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.PRODUCTS,
        'new_products',
        'New Products',
        metrics.newProducts || 0,
      ),
    ];
  }

  private async calculateSupplierKpis(
    filters: IExecutiveDashboardFilters,
  ): Promise<ExecutiveKpiResponseDto[]> {
    const metrics = await this.repository.getSupplierMetrics(filters);

    return [
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.SUPPLIERS,
        'active_suppliers',
        'Active Suppliers',
        metrics.activeSuppliers || 0,
      ),
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.SUPPLIERS,
        'supplier_performance',
        'Supplier Performance',
        metrics.supplierPerformance || 0,
        undefined,
        undefined,
        '%',
      ),
    ];
  }

  private async calculateInventoryKpis(
    filters: IExecutiveDashboardFilters,
  ): Promise<ExecutiveKpiResponseDto[]> {
    const metrics = await this.repository.getInventoryMetrics(filters);

    return [
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.INVENTORY,
        'inventory_value',
        'Inventory Value',
        metrics.inventoryValue || 0,
        undefined,
        undefined,
        filters.currency || 'USD',
      ),
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.INVENTORY,
        'stockout_risk',
        'Stockout Risk',
        metrics.stockoutRisk || 0,
        undefined,
        undefined,
        '%',
      ),
    ];
  }

  private async calculateProcurementKpis(
    filters: IExecutiveDashboardFilters,
  ): Promise<ExecutiveKpiResponseDto[]> {
    const metrics = await this.repository.getProcurementMetrics(filters);

    return [
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.PROCUREMENT,
        'pending_pos',
        'Pending POs',
        metrics.pendingPurchaseOrders || 0,
      ),
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.PROCUREMENT,
        'procurement_cost',
        'Procurement Cost',
        metrics.procurementCost || 0,
        undefined,
        undefined,
        filters.currency || 'USD',
      ),
    ];
  }

  private async calculateWarehouseKpis(
    filters: IExecutiveDashboardFilters,
  ): Promise<ExecutiveKpiResponseDto[]> {
    const metrics = await this.repository.getWarehouseMetrics(filters);

    return [
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.WAREHOUSE,
        'warehouse_capacity',
        'Warehouse Capacity',
        metrics.warehouseCapacity || 0,
        undefined,
        undefined,
        '%',
      ),
      this.createKpi(
        filters.workspaceId,
        ExecutiveMetricCategory.WAREHOUSE,
        'fulfillment_rate',
        'Fulfillment Rate',
        metrics.fulfillmentRate || 0,
        undefined,
        undefined,
        '%',
      ),
    ];
  }

  private createKpi(
    workspaceId: string,
    category: ExecutiveMetricCategory,
    metricKey: string,
    name: string,
    currentValue: number,
    targetValue?: number,
    previousValue?: number,
    unit?: string,
  ): ExecutiveKpiResponseDto {
    const variance = targetValue ? currentValue - targetValue : undefined;
    const variancePercent =
      targetValue && targetValue !== 0
        ? ((currentValue - targetValue) / targetValue) * 100
        : undefined;

    let trendDirection = TrendDirection.STABLE;
    if (previousValue !== undefined && previousValue !== 0) {
      const change = ((currentValue - previousValue) / previousValue) * 100;
      if (change > 5) trendDirection = TrendDirection.UP;
      else if (change < -5) trendDirection = TrendDirection.DOWN;
    }

    return {
      id: `${category}-${metricKey}`,
      workspaceId,
      category,
      metricKey,
      name,
      currentValue,
      targetValue,
      previousValue,
      variance,
      variancePercent,
      trendDirection,
      unit,
      period: 'current',
      updatedAt: new Date(),
    };
  }
}
