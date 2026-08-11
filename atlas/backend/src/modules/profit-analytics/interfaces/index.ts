export enum ProfitMetricType {
  GROSS_PROFIT = 'gross_profit',
  NET_PROFIT = 'net_profit',
  GROSS_MARGIN = 'gross_margin',
  NET_MARGIN = 'net_margin',
  ROI = 'roi',
  CONTRIBUTION_MARGIN = 'contribution_margin',
  PROFIT_GROWTH = 'profit_growth',
  PROFIT_PER_UNIT = 'profit_per_unit',
  PROFIT_PER_ORDER = 'profit_per_order',
}

export enum ProfitDimension {
  PRODUCT = 'product',
  SKU = 'sku',
  VARIANT = 'variant',
  CATEGORY = 'category',
  SUPPLIER = 'supplier',
  MARKETPLACE = 'marketplace',
  ACCOUNT = 'account',
  WAREHOUSE = 'warehouse',
  COUNTRY = 'country',
  CURRENCY = 'currency',
  BRAND = 'brand',
}

export enum ProfitPeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum ProfitComparisonType {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  EXPECTED_PROFIT = 'expected_profit',
  TARGET = 'target',
}

export enum ProfitabilityCategory {
  PROFITABLE = 'profitable',
  LOW_MARGIN = 'low_margin',
  LOSS_MAKING = 'loss_making',
  BREAK_EVEN = 'break_even',
  HIGH_MARGIN = 'high_margin',
}

export enum LeakageType {
  EXCESSIVE_FEES = 'excessive_fees',
  HIGH_RETURNS = 'high_returns',
  HIGH_REFUNDS = 'high_refunds',
  HIGH_DISCOUNTS = 'high_discounts',
  HIGH_SHIPPING = 'high_shipping',
  UNACCOUNTED_COSTS = 'unaccounted_costs',
}

export enum ProfitAnalyticsEventType {
  PROFIT_CALCULATED = 'profit_calculated',
  MARGIN_UPDATED = 'margin_updated',
  TARGET_ACHIEVED = 'target_achieved',
  TARGET_MISSED = 'target_missed',
  LEAKAGE_DETECTED = 'leakage_detected',
  PROFITABILITY_CHANGED = 'profitability_changed',
  COMPARISON_GENERATED = 'comparison_generated',
  BREAKDOWN_CALCULATED = 'breakdown_calculated',
}

export interface IProfitComponents {
  revenue: number;
  grossSales: number;
  netSales: number;
  productCost: number;
  landedCost: number;
  marketplaceFees: number;
  fulfillmentFees: number;
  shippingCost: number;
  taxAmount: number;
  advertisingCost: number;
  discounts: number;
  returns: number;
  refunds: number;
  otherCosts: number;
}

export interface IProfitSummary {
  workspaceId: string;
  period: ProfitPeriod;
  startDate: Date;
  endDate: Date;
  components: IProfitComponents;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roi: number;
  contributionMargin: number;
  profitPerUnit: number;
  profitPerOrder: number;
  unitsSold: number;
  orderCount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IProfitTrend {
  workspaceId: string;
  period: ProfitPeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: ProfitMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface IProfitBreakdown {
  workspaceId: string;
  dimension: ProfitDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: ProfitPeriod;
  startDate: Date;
  endDate: Date;
  components: IProfitComponents;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roi: number;
  contributionMargin: number;
  sharePercent?: number;
  rank?: number;
  unitsSold: number;
  orderCount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IProfitComparison {
  workspaceId: string;
  comparisonType: ProfitComparisonType;
  currentPeriod: {
    startDate: Date;
    endDate: Date;
    grossProfit: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
    roi: number;
    contributionMargin: number;
    revenue: number;
  };
  comparisonPeriod: {
    startDate: Date;
    endDate: Date;
    grossProfit: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
    roi: number;
    contributionMargin: number;
    revenue: number;
  };
  variance: {
    grossProfitAmount: number;
    grossProfitPercent: number;
    netProfitAmount: number;
    netProfitPercent: number;
    grossMarginPoints: number;
    netMarginPoints: number;
    roiPoints: number;
    contributionMarginPoints: number;
    revenueAmount: number;
    revenuePercent: number;
  };
  currency: string;
  metadata?: Record<string, any>;
}

export interface IProfitabilityAnalysis {
  workspaceId: string;
  productId: string;
  sku: string;
  productName: string;
  category?: string;
  supplier?: string;
  marketplace?: string;
  profitabilityCategory: ProfitabilityCategory;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roi: number;
  revenue: number;
  totalCost: number;
  unitsSold: number;
  orderCount: number;
  profitPerUnit: number;
  profitShare: number;
  rank?: number;
  currency: string;
  period: ProfitPeriod;
  startDate: Date;
  endDate: Date;
  metadata?: Record<string, any>;
}

export interface IProfitLeakage {
  workspaceId: string;
  leakageType: LeakageType;
  dimension: ProfitDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  leakageAmount: number;
  leakagePercent: number;
  expectedAmount: number;
  actualAmount: number;
  impactOnProfit: number;
  impactOnMargin: number;
  period: ProfitPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export interface IProfitTarget {
  id: string;
  workspaceId: string;
  targetKey: string;
  name: string;
  metricType: ProfitMetricType;
  targetValue: number;
  period: ProfitPeriod;
  startDate: Date;
  endDate: Date;
  dimensions?: Record<string, any>;
  currency?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProfitTargetPerformance {
  targetId: string;
  workspaceId: string;
  targetKey: string;
  name: string;
  metricType: ProfitMetricType;
  targetValue: number;
  actualValue: number;
  variance: number;
  variancePercent: number;
  achievementPercent: number;
  period: ProfitPeriod;
  startDate: Date;
  endDate: Date;
  currency?: string;
}

export interface IProfitAnalyticsFilters {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  period?: ProfitPeriod;
  marketplaceIds?: string[];
  accountIds?: string[];
  providerKeys?: string[];
  productIds?: string[];
  skus?: string[];
  categories?: string[];
  brands?: string[];
  supplierIds?: string[];
  warehouseIds?: string[];
  countries?: string[];
  currency?: string;
}

export interface IProfitAnalyticsEvent {
  event: ProfitAnalyticsEventType;
  workspaceId: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}
