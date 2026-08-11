export enum MarketplaceMetricType {
  REVENUE = 'revenue',
  ORDERS = 'orders',
  UNITS_SOLD = 'units_sold',
  GROSS_PROFIT = 'gross_profit',
  NET_PROFIT = 'net_profit',
  GROSS_MARGIN = 'gross_margin',
  NET_MARGIN = 'net_margin',
  ROI = 'roi',
  MARKETPLACE_FEES = 'marketplace_fees',
  RETURN_RATE = 'return_rate',
  CANCELLATION_RATE = 'cancellation_rate',
  GROWTH_RATE = 'growth_rate',
  LISTING_COUNT = 'listing_count',
  ACTIVE_LISTING_COUNT = 'active_listing_count',
}

export enum MarketplaceDimension {
  MARKETPLACE = 'marketplace',
  PROVIDER = 'provider',
  ACCOUNT = 'account',
  COUNTRY = 'country',
  REGION = 'region',
  PRODUCT = 'product',
  CATEGORY = 'category',
}

export enum MarketplacePeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum MarketplacePerformanceCategory {
  BEST_PERFORMING = 'best_performing',
  DECLINING = 'declining',
  HIGH_COST = 'high_cost',
  HIGH_RETURN = 'high_return',
  UNDERPERFORMING = 'underperforming',
  GROWING = 'growing',
  STABLE = 'stable',
  INACTIVE = 'inactive',
}

export enum MarketplaceComparisonType {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  CROSS_MARKETPLACE = 'cross_marketplace',
}

export enum AccountHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  CRITICAL = 'critical',
  SUSPENDED = 'suspended',
}

export enum MarketplaceAnalyticsEventType {
  PERFORMANCE_CALCULATED = 'performance_calculated',
  TREND_UPDATED = 'trend_updated',
  COMPARISON_GENERATED = 'comparison_generated',
  LISTING_HEALTH_UPDATED = 'listing_health_updated',
  ACCOUNT_HEALTH_CHANGED = 'account_health_changed',
  UNDERPERFORMING_DETECTED = 'underperforming_detected',
  HIGH_COST_DETECTED = 'high_cost_detected',
  SYNC_ISSUE_DETECTED = 'sync_issue_detected',
}

export interface IMarketplaceSalesMetrics {
  revenue: number;
  orders: number;
  unitsSold: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface IMarketplaceProfitMetrics {
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roi: number;
  marketplaceFees: number;
  feePercent: number;
}

export interface IMarketplaceOperationsMetrics {
  returnRate: number;
  returnAmount: number;
  cancellationRate: number;
  cancellationAmount: number;
  refundAmount: number;
}

export interface IMarketplaceListingMetrics {
  totalListings: number;
  activeListings: number;
  inactiveListings: number;
  averageListingQuality: number;
  publicationSuccessRate: number;
  publicationFailures: number;
  syncHealthScore: number;
}

export interface IMarketplaceInventoryMetrics {
  availabilityRate: number;
  stockoutRate: number;
  oversellingIncidents: number;
  fulfillmentRate: number;
  averageFulfillmentDays: number;
}

export interface IMarketplaceAccountHealth {
  healthStatus: AccountHealthStatus;
  apiHealthScore: number;
  syncLatencyMs: number;
  errorRate: number;
  rateLimitHitCount: number;
  lastSyncTimestamp: Date;
  consecutiveFailures: number;
}

export interface IMarketplacePerformance {
  workspaceId: string;
  marketplaceId: string;
  marketplaceName: string;
  providerKey: string;
  accountId?: string;
  country?: string;
  region?: string;
  performanceCategory: MarketplacePerformanceCategory;
  salesMetrics: IMarketplaceSalesMetrics;
  profitMetrics: IMarketplaceProfitMetrics;
  operationsMetrics: IMarketplaceOperationsMetrics;
  listingMetrics: IMarketplaceListingMetrics;
  inventoryMetrics: IMarketplaceInventoryMetrics;
  accountHealth: IMarketplaceAccountHealth;
  overallScore: number;
  rank?: number;
  period: MarketplacePeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IMarketplaceTrend {
  workspaceId: string;
  marketplaceId: string;
  marketplaceName: string;
  period: MarketplacePeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: MarketplaceMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface IMarketplaceBreakdown {
  workspaceId: string;
  dimension: MarketplaceDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: MarketplacePeriod;
  startDate: Date;
  endDate: Date;
  salesMetrics: IMarketplaceSalesMetrics;
  profitMetrics: IMarketplaceProfitMetrics;
  operationsMetrics: IMarketplaceOperationsMetrics;
  overallScore: number;
  rank?: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IMarketplaceComparison {
  workspaceId: string;
  marketplaceId: string;
  marketplaceName: string;
  comparisonType: MarketplaceComparisonType;
  actualMetrics: {
    salesMetrics: IMarketplaceSalesMetrics;
    profitMetrics: IMarketplaceProfitMetrics;
    operationsMetrics: IMarketplaceOperationsMetrics;
  };
  comparisonMetrics: {
    salesMetrics: IMarketplaceSalesMetrics;
    profitMetrics: IMarketplaceProfitMetrics;
    operationsMetrics: IMarketplaceOperationsMetrics;
  };
  variance: {
    revenueAmount: number;
    revenuePercent: number;
    ordersAmount: number;
    ordersPercent: number;
    grossProfitAmount: number;
    grossProfitPercent: number;
    netProfitAmount: number;
    netProfitPercent: number;
    grossMarginPoints: number;
    netMarginPoints: number;
  };
  period: MarketplacePeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IProductMarketplaceComparison {
  workspaceId: string;
  productId: string;
  sku: string;
  productName: string;
  marketplaces: Array<{
    marketplaceId: string;
    marketplaceName: string;
    revenue: number;
    unitsSold: number;
    grossProfit: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
    isActive: boolean;
    listingQuality: number;
    rank?: number;
  }>;
  recommendedMarketplaces: string[];
  period: MarketplacePeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IMarketplaceAnalyticsFilters {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  period?: MarketplacePeriod;
  marketplaceIds?: string[];
  providerKeys?: string[];
  accountIds?: string[];
  countries?: string[];
  regions?: string[];
  productIds?: string[];
  categories?: string[];
  currency?: string;
  performanceCategory?: MarketplacePerformanceCategory;
  minOverallScore?: number;
}

export interface IMarketplaceAnalyticsEvent {
  event: MarketplaceAnalyticsEventType;
  workspaceId: string;
  marketplaceId?: string;
  accountId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}
