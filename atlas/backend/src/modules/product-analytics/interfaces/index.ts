export enum ProductMetricType {
  REVENUE = 'revenue',
  UNITS_SOLD = 'units_sold',
  GROSS_PROFIT = 'gross_profit',
  NET_PROFIT = 'net_profit',
  GROSS_MARGIN = 'gross_margin',
  NET_MARGIN = 'net_margin',
  ROI = 'roi',
  CONVERSION_RATE = 'conversion_rate',
  RETURN_RATE = 'return_rate',
  GROWTH_RATE = 'growth_rate',
  AVERAGE_SELLING_PRICE = 'average_selling_price',
  VIEWS = 'views',
  ORDERS = 'orders',
}

export enum ProductDimension {
  PRODUCT = 'product',
  SKU = 'sku',
  VARIANT = 'variant',
  CATEGORY = 'category',
  BRAND = 'brand',
  MARKETPLACE = 'marketplace',
  ACCOUNT = 'account',
  WAREHOUSE = 'warehouse',
  COUNTRY = 'country',
  REGION = 'region',
  CURRENCY = 'currency',
}

export enum ProductPeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum ProductPerformanceCategory {
  TOP_PERFORMING = 'top_performing',
  DECLINING = 'declining',
  LOW_MARGIN = 'low_margin',
  HIGH_RETURN = 'high_return',
  INACTIVE = 'inactive',
  GROWING = 'growing',
  STABLE = 'stable',
  NEW_LAUNCH = 'new_launch',
}

export enum ProductLifecycleStage {
  INTRODUCTION = 'introduction',
  GROWTH = 'growth',
  MATURITY = 'maturity',
  DECLINE = 'decline',
  DISCONTINUED = 'discontinued',
}

export enum ProductComparisonType {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  FORECAST = 'forecast',
  OPPORTUNITY_SCORE = 'opportunity_score',
  DEMAND_SCORE = 'demand_score',
}

export enum ListingQualityScore {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  INCOMPLETE = 'incomplete',
}

export enum PriceCompetitiveness {
  VERY_COMPETITIVE = 'very_competitive',
  COMPETITIVE = 'competitive',
  AVERAGE = 'average',
  EXPENSIVE = 'expensive',
  VERY_EXPENSIVE = 'very_expensive',
}

export enum StockAvailability {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  BACKORDERED = 'backordered',
  DISCONTINUED = 'discontinued',
}

export enum ProductAnalyticsEventType {
  PERFORMANCE_CALCULATED = 'performance_calculated',
  TREND_UPDATED = 'trend_updated',
  LIFECYCLE_CHANGED = 'lifecycle_changed',
  COHORT_ANALYZED = 'cohort_analyzed',
  COMPARISON_GENERATED = 'comparison_generated',
  LISTING_QUALITY_UPDATED = 'listing_quality_updated',
  COMPETITIVENESS_CHANGED = 'competitiveness_changed',
  INACTIVE_DETECTED = 'inactive_detected',
}

export interface IProductPerformanceMetrics {
  revenue: number;
  unitsSold: number;
  orders: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roi: number;
  conversionRate: number;
  returnRate: number;
  growthRate: number;
  averageSellingPrice: number;
  views: number;
}

export interface IProductPerformance {
  workspaceId: string;
  productId: string;
  sku: string;
  variantId?: string;
  productName: string;
  category?: string;
  brand?: string;
  performanceCategory: ProductPerformanceCategory;
  lifecycleStage: ProductLifecycleStage;
  metrics: IProductPerformanceMetrics;
  rank?: number;
  sharePercent?: number;
  period: ProductPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IProductTrend {
  workspaceId: string;
  productId: string;
  sku: string;
  period: ProductPeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: ProductMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface IProductBreakdown {
  workspaceId: string;
  dimension: ProductDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: ProductPeriod;
  startDate: Date;
  endDate: Date;
  metrics: IProductPerformanceMetrics;
  rank?: number;
  sharePercent?: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IProductComparison {
  workspaceId: string;
  productId: string;
  sku: string;
  comparisonType: ProductComparisonType;
  actualMetrics: IProductPerformanceMetrics;
  comparisonMetrics: IProductPerformanceMetrics;
  variance: {
    revenueAmount: number;
    revenuePercent: number;
    unitsSoldAmount: number;
    unitsSoldPercent: number;
    grossProfitAmount: number;
    grossProfitPercent: number;
    netProfitAmount: number;
    netProfitPercent: number;
    grossMarginPoints: number;
    netMarginPoints: number;
  };
  period: ProductPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IProductCohort {
  workspaceId: string;
  cohortKey: string;
  cohortName: string;
  launchDateStart: Date;
  launchDateEnd: Date;
  productCount: number;
  totalRevenue: number;
  totalUnitsSold: number;
  averageRevenue: number;
  averageUnitsSold: number;
  retentionRate: number;
  period: ProductPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IListingPerformance {
  workspaceId: string;
  productId: string;
  sku: string;
  marketplaceId: string;
  accountId: string;
  listingQuality: ListingQualityScore;
  qualityScore: number;
  priceCompetitiveness: PriceCompetitiveness;
  competitivenessScore: number;
  stockAvailability: StockAvailability;
  hasImages: boolean;
  hasDescription: boolean;
  hasBulletPoints: boolean;
  hasKeywords: boolean;
  hasReviews: boolean;
  averageRating?: number;
  reviewCount?: number;
  impressions: number;
  clicks: number;
  conversionRate: number;
  lastUpdated: Date;
  metadata?: Record<string, any>;
}

export interface IMarketplacePerformance {
  workspaceId: string;
  productId: string;
  sku: string;
  marketplaceId: string;
  marketplaceName: string;
  accountId: string;
  isActive: boolean;
  metrics: IProductPerformanceMetrics;
  listingQuality: ListingQualityScore;
  priceCompetitiveness: PriceCompetitiveness;
  stockAvailability: StockAvailability;
  rank?: number;
  period: ProductPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IProductAnalyticsFilters {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  period?: ProductPeriod;
  productIds?: string[];
  skus?: string[];
  variantIds?: string[];
  categories?: string[];
  brands?: string[];
  marketplaceIds?: string[];
  accountIds?: string[];
  warehouseIds?: string[];
  countries?: string[];
  regions?: string[];
  currency?: string;
  performanceCategory?: ProductPerformanceCategory;
  lifecycleStage?: ProductLifecycleStage;
}

export interface IProductAnalyticsEvent {
  event: ProductAnalyticsEventType;
  workspaceId: string;
  productId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}
