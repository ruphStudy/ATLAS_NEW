export enum FinancialMetricType {
  REVENUE = 'revenue',
  GROSS_PROFIT = 'gross_profit',
  NET_PROFIT = 'net_profit',
  MARGIN = 'margin',
  ROI = 'roi',
  CASH_INFLOW = 'cash_inflow',
  CASH_OUTFLOW = 'cash_outflow',
  OPERATING_COST = 'operating_cost',
  MARKETPLACE_FEES = 'marketplace_fees',
  FULFILLMENT_FEES = 'fulfillment_fees',
  SHIPPING_COST = 'shipping_cost',
  TAX = 'tax',
  ADVERTISING_COST = 'advertising_cost',
  DISCOUNTS = 'discounts',
  REFUNDS = 'refunds',
  RETURNS_COST = 'returns_cost',
  SUPPLIER_COST = 'supplier_cost',
}

export enum FinancialDimension {
  PRODUCT = 'product',
  SKU = 'sku',
  CATEGORY = 'category',
  SUPPLIER = 'supplier',
  MARKETPLACE = 'marketplace',
  ACCOUNT = 'account',
  WAREHOUSE = 'warehouse',
  COUNTRY = 'country',
  REGION = 'region',
  CURRENCY = 'currency',
}

export enum FinancialPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum FinancialComparisonType {
  PERIOD_OVER_PERIOD = 'period_over_period',
  YEAR_OVER_YEAR = 'year_over_year',
  EXPECTED_VS_ACTUAL = 'expected_vs_actual',
  BUDGET_VS_ACTUAL = 'budget_vs_actual',
}

export enum FinancialHealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  LOSS_MAKING = 'loss_making',
}

export enum FinancialAnalyticsEventType {
  PERFORMANCE_CALCULATED = 'performance_calculated',
  TREND_UPDATED = 'trend_updated',
  COMPARISON_GENERATED = 'comparison_generated',
  PROFIT_LEAKAGE_DETECTED = 'profit_leakage_detected',
  FEE_ANOMALY_DETECTED = 'fee_anomaly_detected',
  SETTLEMENT_DELAY_DETECTED = 'settlement_delay_detected',
  LOSS_MAKING_PRODUCT_DETECTED = 'loss_making_product_detected',
  CASH_FLOW_RISK_DETECTED = 'cash_flow_risk_detected',
}

export interface IRevenueMetrics {
  totalRevenue: number;
  expectedRevenue: number;
  actualRevenue: number;
  revenueVariance: number;
  revenueVariancePercent: number;
}

export interface IProfitMetrics {
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roi: number;
  expectedProfit: number;
  actualProfit: number;
  profitVariance: number;
  profitVariancePercent: number;
}

export interface ICostBreakdown {
  supplierCost: number;
  marketplaceFees: number;
  fulfillmentFees: number;
  shippingCost: number;
  tax: number;
  advertisingCost: number;
  discounts: number;
  refunds: number;
  returnsCost: number;
  otherOperatingCost: number;
  totalCost: number;
}

export interface ICashFlowMetrics {
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  operatingCashFlow: number;
  receivables: number;
  payables: number;
  pendingSettlements: number;
}

export interface ISettlementMetrics {
  expectedSettlement: number;
  actualSettlement: number;
  settlementVariance: number;
  settlementVariancePercent: number;
  deductions: number;
  reconciliationDifferences: number;
  averageSettlementDays: number;
}

export interface IFinancialPerformance {
  workspaceId: string;
  period: FinancialPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  productId?: string;
  productSku?: string;
  categoryId?: string;
  supplierId?: string;
  marketplaceId?: string;
  accountId?: string;
  warehouseId?: string;
  country?: string;
  region?: string;
  revenueMetrics: IRevenueMetrics;
  profitMetrics: IProfitMetrics;
  costBreakdown: ICostBreakdown;
  cashFlowMetrics: ICashFlowMetrics;
  settlementMetrics: ISettlementMetrics;
  healthStatus: FinancialHealthStatus;
  overallScore: number;
}

export interface IFinancialTrend {
  period: Date;
  metricValue: number;
  metricType: FinancialMetricType;
  currency: string;
  normalizedValue?: number;
  changeFromPrevious?: number;
  changeFromPreviousPercent?: number;
}

export interface IFinancialBreakdown {
  dimensionValue: string;
  dimensionLabel?: string;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
  totalCost: number;
  orderCount: number;
  contribution: number;
  contributionPercent: number;
  healthStatus: FinancialHealthStatus;
}

export interface IFinancialComparison {
  workspaceId: string;
  comparisonType: FinancialComparisonType;
  period: FinancialPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  actualMetrics: {
    revenueMetrics: IRevenueMetrics;
    profitMetrics: IProfitMetrics;
    costBreakdown: ICostBreakdown;
    cashFlowMetrics: ICashFlowMetrics;
    settlementMetrics: ISettlementMetrics;
    overallScore: number;
  };
  comparisonMetrics: {
    revenueMetrics: IRevenueMetrics;
    profitMetrics: IProfitMetrics;
    costBreakdown: ICostBreakdown;
    cashFlowMetrics: ICashFlowMetrics;
    settlementMetrics: ISettlementMetrics;
    overallScore: number;
  };
  variance: {
    revenueVariance: number;
    revenueVariancePercent: number;
    profitVariance: number;
    profitVariancePercent: number;
    marginPoints: number;
    cashFlowVariance: number;
    overallScorePoints: number;
  };
  marketplaceId?: string;
  productId?: string;
}

export interface IFinancialAlert {
  id: string;
  workspaceId: string;
  alertType: FinancialAnalyticsEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  detectedAt: Date;
  productId?: string;
  productSku?: string;
  marketplaceId?: string;
  supplierId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface IFinancialAnalyticsFilters {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  period?: FinancialPeriod;
  currency?: string;
  productIds?: string[];
  productSkus?: string[];
  categoryIds?: string[];
  supplierIds?: string[];
  marketplaceIds?: string[];
  accountIds?: string[];
  warehouseIds?: string[];
  countries?: string[];
  regions?: string[];
  minRevenue?: number;
  maxRevenue?: number;
  minMargin?: number;
  maxMargin?: number;
  healthStatuses?: FinancialHealthStatus[];
  minOverallScore?: number;
}

export interface IFinancialAnalyticsEvent {
  event: FinancialAnalyticsEventType;
  workspaceId: string;
  productId?: string;
  productSku?: string;
  marketplaceId?: string;
  supplierId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
}
