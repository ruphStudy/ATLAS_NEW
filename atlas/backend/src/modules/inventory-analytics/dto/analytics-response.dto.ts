import {
  IDashboardSummary,
  IInventoryKPIs,
  IStockLevelMetrics,
  IInventoryMovementMetrics,
  IWarehousePerformance,
  IInventoryValueMetrics,
  IInventoryAgingMetrics,
  IInventoryTrend,
  IProductAnalytics,
  IWarehouseBreakdown,
} from '../interfaces';

export type DashboardSummaryResponseDto = IDashboardSummary;
export type InventoryKPIsResponseDto = IInventoryKPIs;
export type StockLevelMetricsResponseDto = IStockLevelMetrics;
export type InventoryMovementMetricsResponseDto = IInventoryMovementMetrics;
export type WarehousePerformanceResponseDto = IWarehousePerformance;
export type InventoryValueMetricsResponseDto = IInventoryValueMetrics;
export type InventoryAgingMetricsResponseDto = IInventoryAgingMetrics;
export type InventoryTrendResponseDto = IInventoryTrend;
export type ProductAnalyticsResponseDto = IProductAnalytics;
export type WarehouseBreakdownResponseDto = IWarehouseBreakdown;

export interface PaginatedProductAnalyticsResponseDto {
  data: ProductAnalyticsResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReportExportResponseDto {
  reportId: string;
  format: string;
  url?: string;
  status: string;
  generatedAt: Date;
}
