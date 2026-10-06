export enum SalesMetricType {
  REVENUE = 'revenue',
  GROSS_SALES = 'gross_sales',
  NET_SALES = 'net_sales',
  UNITS_SOLD = 'units_sold',
  ORDER_COUNT = 'order_count',
  AVERAGE_ORDER_VALUE = 'average_order_value',
  DISCOUNT_AMOUNT = 'discount_amount',
  TAX_AMOUNT = 'tax_amount',
  SHIPPING_AMOUNT = 'shipping_amount',
  REFUND_AMOUNT = 'refund_amount',
  CANCELLATION_AMOUNT = 'cancellation_amount',
  RETURN_AMOUNT = 'return_amount',
  FEE_AMOUNT = 'fee_amount',
}

export enum SalesTrendPeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum SalesBreakdownDimension {
  PRODUCT = 'product',
  SKU = 'sku',
  VARIANT = 'variant',
  CATEGORY = 'category',
  BRAND = 'brand',
  MARKETPLACE = 'marketplace',
  PROVIDER = 'provider',
  ACCOUNT = 'account',
  COUNTRY = 'country',
  REGION = 'region',
  CURRENCY = 'currency',
  CUSTOMER_TYPE = 'customer_type',
}

export enum SalesCustomerType {
  NEW = 'new',
  REPEAT = 'repeat',
  UNKNOWN = 'unknown',
}

export enum SalesComparisonType {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  CUSTOM_PERIOD = 'custom_period',
  TARGET = 'target',
}

export enum SalesAnalyticsEventType {
  SALES_DATA_REFRESHED = 'sales_data_refreshed',
  TREND_CALCULATED = 'trend_calculated',
  BREAKDOWN_GENERATED = 'breakdown_generated',
  TARGET_UPDATED = 'target_updated',
  VIEW_SAVED = 'view_saved',
  REPORT_EXPORTED = 'report_exported',
}

export enum ProductPerformanceCategory {
  TOP_PERFORMING = 'top_performing',
  LOW_PERFORMING = 'low_performing',
  DECLINING = 'declining',
  GROWING = 'growing',
  STABLE = 'stable',
}

export interface ISalesSummary {
  workspaceId: string;
  period: SalesTrendPeriod;
  startDate: Date;
  endDate: Date;
  revenue: number;
  grossSales: number;
  netSales: number;
  unitsSold: number;
  orderCount: number;
  averageOrderValue: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  refundAmount: number;
  cancellationAmount: number;
  returnAmount: number;
  feeAmount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface ISalesTrend {
  workspaceId: string;
  period: SalesTrendPeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: SalesMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface ISalesBreakdown {
  workspaceId: string;
  dimension: SalesBreakdownDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: SalesTrendPeriod;
  startDate: Date;
  endDate: Date;
  revenue: number;
  grossSales: number;
  netSales: number;
  unitsSold: number;
  orderCount: number;
  averageOrderValue: number;
  sharePercent?: number;
  rank?: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface ISalesComparison {
  workspaceId: string;
  comparisonType: SalesComparisonType;
  currentPeriod: {
    startDate: Date;
    endDate: Date;
    revenue: number;
    grossSales: number;
    netSales: number;
    unitsSold: number;
    orderCount: number;
    averageOrderValue: number;
  };
  comparisonPeriod: {
    startDate: Date;
    endDate: Date;
    revenue: number;
    grossSales: number;
    netSales: number;
    unitsSold: number;
    orderCount: number;
    averageOrderValue: number;
  };
  variance: {
    revenueAmount: number;
    revenuePercent: number;
    grossSalesAmount: number;
    grossSalesPercent: number;
    netSalesAmount: number;
    netSalesPercent: number;
    unitsSoldAmount: number;
    unitsSoldPercent: number;
    orderCountAmount: number;
    orderCountPercent: number;
    aovAmount: number;
    aovPercent: number;
  };
  currency: string;
  metadata?: Record<string, any>;
}

export interface IProductPerformance {
  workspaceId: string;
  productId: string;
  sku: string;
  productName: string;
  category?: string;
  brand?: string;
  performanceCategory: ProductPerformanceCategory;
  revenue: number;
  unitsSold: number;
  orderCount: number;
  averagePrice: number;
  revenueShare: number;
  growthPercent?: number;
  rank?: number;
  currency: string;
  period: SalesTrendPeriod;
  startDate: Date;
  endDate: Date;
  metadata?: Record<string, any>;
}

export interface ISalesTarget {
  id: string;
  workspaceId: string;
  targetKey: string;
  name: string;
  metricType: SalesMetricType;
  targetValue: number;
  period: SalesTrendPeriod;
  startDate: Date;
  endDate: Date;
  dimensions?: Record<string, any>;
  currency?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISalesTargetPerformance {
  targetId: string;
  workspaceId: string;
  targetKey: string;
  name: string;
  metricType: SalesMetricType;
  targetValue: number;
  actualValue: number;
  variance: number;
  variancePercent: number;
  achievementPercent: number;
  period: SalesTrendPeriod;
  startDate: Date;
  endDate: Date;
  currency?: string;
}

export interface ISavedView {
  id: string;
  workspaceId: string;
  viewKey: string;
  name: string;
  description?: string;
  filters: Record<string, any>;
  dimensions: SalesBreakdownDimension[];
  metrics: SalesMetricType[];
  period: SalesTrendPeriod;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISalesAnalyticsFilters {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  period?: SalesTrendPeriod;
  marketplaceIds?: string[];
  accountIds?: string[];
  providerKeys?: string[];
  productIds?: string[];
  skus?: string[];
  categories?: string[];
  brands?: string[];
  countries?: string[];
  regions?: string[];
  currency?: string;
  customerType?: SalesCustomerType;
  orderStatuses?: string[];
}

export interface ISalesAnalyticsEvent {
  event: SalesAnalyticsEventType;
  workspaceId: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}
