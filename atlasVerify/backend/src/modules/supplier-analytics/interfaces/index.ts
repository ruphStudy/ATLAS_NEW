export enum SupplierMetricType {
  QUOTATION_RESPONSE_RATE = 'quotation_response_rate',
  PRICE_COMPETITIVENESS = 'price_competitiveness',
  PURCHASE_ORDER_VALUE = 'purchase_order_value',
  FULFILLMENT_RATE = 'fulfillment_rate',
  ON_TIME_DISPATCH_RATE = 'on_time_dispatch_rate',
  ON_TIME_DELIVERY_RATE = 'on_time_delivery_rate',
  QUALITY_SCORE = 'quality_score',
  DEFECT_RATE = 'defect_rate',
  REJECTION_RATE = 'rejection_rate',
  RETURN_RATE = 'return_rate',
  AVERAGE_LEAD_TIME = 'average_lead_time',
  AVERAGE_MOQ = 'average_moq',
}

export enum SupplierDimension {
  SUPPLIER = 'supplier',
  PROVIDER = 'provider',
  CATEGORY = 'category',
  PRODUCT = 'product',
  COUNTRY = 'country',
  REGION = 'region',
  CURRENCY = 'currency',
}

export enum SupplierPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum SupplierPerformanceCategory {
  PREFERRED = 'preferred',
  IMPROVING = 'improving',
  DECLINING = 'declining',
  RISKY = 'risky',
  INACTIVE = 'inactive',
  AVERAGE = 'average',
  NEW = 'new',
}

export enum SupplierComparisonType {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  VERIFICATION_SCORE = 'verification_score',
  RISK_SCORE = 'risk_score',
  EXPECTED_PERFORMANCE = 'expected_performance',
}

export enum SupplierAnalyticsEventType {
  PERFORMANCE_CALCULATED = 'performance_calculated',
  TREND_UPDATED = 'trend_updated',
  CATEGORY_CHANGED = 'category_changed',
  COMPARISON_GENERATED = 'comparison_generated',
  RANKING_UPDATED = 'ranking_updated',
  RISKY_DETECTED = 'risky_detected',
  INACTIVE_DETECTED = 'inactive_detected',
}

export interface ISupplierQuotationMetrics {
  rfqSent: number;
  quotationsReceived: number;
  responseRate: number;
  averagePriceCompetitiveness: number;
  averageMoq: number;
  averageLeadTime: number;
  favorablePaymentTermsPercent: number;
}

export interface ISupplierProcurementMetrics {
  purchaseOrderCount: number;
  totalPurchaseOrderValue: number;
  fulfillmentRate: number;
  onTimeDispatchRate: number;
  onTimeDeliveryRate: number;
  averageDeliveryDays: number;
}

export interface ISupplierQualityMetrics {
  inspectionsCompleted: number;
  qualityScore: number;
  defectRate: number;
  rejectionRate: number;
  inspectionFailureRate: number;
  returnRate: number;
  returnImpactAmount: number;
}

export interface ISupplierPerformance {
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  providerKey?: string;
  category?: string;
  country?: string;
  performanceCategory: SupplierPerformanceCategory;
  quotationMetrics: ISupplierQuotationMetrics;
  procurementMetrics: ISupplierProcurementMetrics;
  qualityMetrics: ISupplierQualityMetrics;
  overallScore: number;
  rank?: number;
  period: SupplierPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export interface ISupplierTrend {
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  period: SupplierPeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: SupplierMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  metadata?: Record<string, any>;
}

export interface ISupplierBreakdown {
  workspaceId: string;
  dimension: SupplierDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: SupplierPeriod;
  startDate: Date;
  endDate: Date;
  quotationMetrics: ISupplierQuotationMetrics;
  procurementMetrics: ISupplierProcurementMetrics;
  qualityMetrics: ISupplierQualityMetrics;
  overallScore: number;
  rank?: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface ISupplierComparison {
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  comparisonType: SupplierComparisonType;
  actualMetrics: {
    quotationMetrics: ISupplierQuotationMetrics;
    procurementMetrics: ISupplierProcurementMetrics;
    qualityMetrics: ISupplierQualityMetrics;
    overallScore: number;
  };
  comparisonMetrics: {
    quotationMetrics: ISupplierQuotationMetrics;
    procurementMetrics: ISupplierProcurementMetrics;
    qualityMetrics: ISupplierQualityMetrics;
    overallScore: number;
  };
  variance: {
    responseRatePoints: number;
    priceCompetitivenessPoints: number;
    fulfillmentRatePoints: number;
    onTimeDeliveryRatePoints: number;
    qualityScorePoints: number;
    defectRatePoints: number;
    overallScorePoints: number;
  };
  period: SupplierPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export interface ISupplierRanking {
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  category?: string;
  overallScore: number;
  rank: number;
  quotationScore: number;
  procurementScore: number;
  qualityScore: number;
  verificationScore?: number;
  riskScore?: number;
  period: SupplierPeriod;
  startDate: Date;
  endDate: Date;
  metadata?: Record<string, any>;
}

export interface ISupplierAnalyticsFilters {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  period?: SupplierPeriod;
  supplierIds?: string[];
  providerKeys?: string[];
  categories?: string[];
  productIds?: string[];
  countries?: string[];
  regions?: string[];
  currency?: string;
  performanceCategory?: SupplierPerformanceCategory;
  minOverallScore?: number;
}

export interface ISupplierAnalyticsEvent {
  event: SupplierAnalyticsEventType;
  workspaceId: string;
  supplierId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}
