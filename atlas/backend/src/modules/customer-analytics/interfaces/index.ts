export enum CustomerMetricType {
  CUSTOMER_COUNT = 'customer_count',
  NEW_CUSTOMERS = 'new_customers',
  REPEAT_CUSTOMERS = 'repeat_customers',
  ACTIVE_CUSTOMERS = 'active_customers',
  RETENTION_RATE = 'retention_rate',
  PURCHASE_FREQUENCY = 'purchase_frequency',
  AVERAGE_ORDER_VALUE = 'average_order_value',
  CUSTOMER_LIFETIME_VALUE = 'customer_lifetime_value',
  REVENUE_CONTRIBUTION = 'revenue_contribution',
  REPEAT_PURCHASE_RATE = 'repeat_purchase_rate',
  CHURN_RATE = 'churn_rate',
  RETURN_RATE = 'return_rate',
  REFUND_RATE = 'refund_rate',
  CANCELLATION_RATE = 'cancellation_rate',
}

export enum CustomerDimension {
  MARKETPLACE = 'marketplace',
  ACCOUNT = 'account',
  COUNTRY = 'country',
  REGION = 'region',
  CHANNEL = 'channel',
  SEGMENT = 'segment',
  CATEGORY = 'category',
  PRODUCT = 'product',
}

export enum CustomerPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum CustomerSegment {
  HIGH_VALUE = 'high_value',
  LOYAL = 'loyal',
  INACTIVE = 'inactive',
  AT_RISK = 'at_risk',
  HIGH_RETURN = 'high_return',
  NEW = 'new',
  PROMISING = 'promising',
  CHURNED = 'churned',
}

export enum CustomerComparisonType {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  CROSS_MARKETPLACE = 'cross_marketplace',
  CROSS_SEGMENT = 'cross_segment',
}

export enum CustomerAnalyticsEventType {
  PERFORMANCE_CALCULATED = 'performance_calculated',
  TREND_UPDATED = 'trend_updated',
  COMPARISON_GENERATED = 'comparison_generated',
  COHORT_ANALYZED = 'cohort_analyzed',
  HIGH_VALUE_DETECTED = 'high_value_detected',
  CHURN_RISK_DETECTED = 'churn_risk_detected',
  INACTIVE_DETECTED = 'inactive_detected',
  HIGH_RETURN_DETECTED = 'high_return_detected',
}

export interface ICustomerCountMetrics {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  churnedCustomers: number;
  retentionRate: number;
  churnRate: number;
}

export interface IPurchaseBehaviorMetrics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  averagePurchaseFrequency: number;
  averageCustomerLifetimeValue: number;
  repeatPurchaseRate: number;
  averageDaysBetweenPurchases: number;
  revenueContributionPercent: number;
}

export interface IReturnRefundMetrics {
  totalReturns: number;
  returnRate: number;
  totalRefunds: number;
  refundRate: number;
  totalCancellations: number;
  cancellationRate: number;
  returnImpactAmount: number;
  refundImpactAmount: number;
}

export interface ICustomerValueMetrics {
  highValueCustomers: number;
  mediumValueCustomers: number;
  lowValueCustomers: number;
  topPercentRevenueContribution: number;
  averageLifetimeValue: number;
  totalLifetimeValue: number;
}

export interface ICustomerPerformance {
  workspaceId: string;
  period: CustomerPeriod;
  startDate: Date;
  endDate: Date;
  segment: CustomerSegment;
  marketplaceId?: string;
  marketplaceName?: string;
  accountId?: string;
  country?: string;
  region?: string;
  countMetrics: ICustomerCountMetrics;
  purchaseBehaviorMetrics: IPurchaseBehaviorMetrics;
  returnRefundMetrics: IReturnRefundMetrics;
  valueMetrics: ICustomerValueMetrics;
  overallScore: number;
  metadata?: Record<string, any>;
}

export interface ICustomerTrend {
  workspaceId: string;
  period: CustomerPeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: CustomerMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  dimension?: CustomerDimension;
  dimensionValue?: string;
  metadata?: Record<string, any>;
}

export interface ICustomerBreakdown {
  workspaceId: string;
  dimension: CustomerDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: CustomerPeriod;
  startDate: Date;
  endDate: Date;
  countMetrics: ICustomerCountMetrics;
  purchaseBehaviorMetrics: IPurchaseBehaviorMetrics;
  returnRefundMetrics: IReturnRefundMetrics;
  valueMetrics: ICustomerValueMetrics;
  overallScore: number;
  rank?: number;
  metadata?: Record<string, any>;
}

export interface ICustomerComparison {
  workspaceId: string;
  comparisonType: CustomerComparisonType;
  period: CustomerPeriod;
  startDate: Date;
  endDate: Date;
  actualMetrics: {
    countMetrics: ICustomerCountMetrics;
    purchaseBehaviorMetrics: IPurchaseBehaviorMetrics;
    returnRefundMetrics: IReturnRefundMetrics;
    valueMetrics: ICustomerValueMetrics;
    overallScore: number;
  };
  comparisonMetrics: {
    countMetrics: ICustomerCountMetrics;
    purchaseBehaviorMetrics: IPurchaseBehaviorMetrics;
    returnRefundMetrics: IReturnRefundMetrics;
    valueMetrics: ICustomerValueMetrics;
    overallScore: number;
  };
  variance: {
    customerGrowthVariance: number;
    customerGrowthVariancePercent: number;
    retentionRatePoints: number;
    clvVariance: number;
    clvVariancePercent: number;
    returnRatePoints: number;
    overallScorePoints: number;
  };
  marketplaceId?: string;
  marketplaceName?: string;
  segment?: CustomerSegment;
  metadata?: Record<string, any>;
}

export interface ICustomerCohort {
  workspaceId: string;
  cohortPeriod: CustomerPeriod;
  cohortStart: Date;
  cohortEnd: Date;
  customersInCohort: number;
  retentionByPeriod: Array<{
    period: number;
    periodLabel: string;
    activeCustomers: number;
    retentionRate: number;
    revenue: number;
  }>;
  metadata?: Record<string, any>;
}

export interface IProductAffinity {
  workspaceId: string;
  productId: string;
  productName?: string;
  categoryId?: string;
  categoryName?: string;
  customerCount: number;
  purchaseCount: number;
  revenue: number;
  affinityScore: number;
  crossSellOpportunities: Array<{
    productId: string;
    productName?: string;
    coOccurrenceRate: number;
    upliftPotential: number;
  }>;
}

export interface ICustomerSegmentAlert {
  workspaceId: string;
  alertType: CustomerSegment;
  severity: 'low' | 'medium' | 'high' | 'critical';
  customerCount: number;
  marketplaceId?: string;
  marketplaceName?: string;
  segment?: CustomerSegment;
  reason: string;
  details: Record<string, any>;
  detectedAt: Date;
  metadata?: Record<string, any>;
}

export interface ICustomerAnalyticsFilters {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  period?: CustomerPeriod;
  marketplaceIds?: string[];
  accountIds?: string[];
  countries?: string[];
  regions?: string[];
  segments?: CustomerSegment[];
  minLifetimeValue?: number;
  maxLifetimeValue?: number;
  minOrderCount?: number;
  minRetentionRate?: number;
  minOverallScore?: number;
}

export interface ICustomerAnalyticsEvent {
  event: CustomerAnalyticsEventType;
  workspaceId: string;
  marketplaceId?: string;
  accountId?: string;
  segment?: CustomerSegment;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}
