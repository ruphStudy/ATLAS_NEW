export enum ProcurementMetricType {
  TOTAL_SPEND = 'total_spend',
  ORDER_VALUE = 'order_value',
  SAVINGS_ACHIEVED = 'savings_achieved',
  COST_VARIANCE = 'cost_variance',
  PURCHASE_VOLUME = 'purchase_volume',
  AVERAGE_ORDER_VALUE = 'average_order_value',
  RFQ_RESPONSE_RATE = 'rfq_response_rate',
  QUOTATION_COMPETITIVENESS = 'quotation_competitiveness',
  APPROVAL_TIME = 'approval_time',
  PROCUREMENT_CYCLE_TIME = 'procurement_cycle_time',
  FULFILLMENT_RATE = 'fulfillment_rate',
  ON_TIME_DELIVERY_RATE = 'on_time_delivery_rate',
  LEAD_TIME_VARIANCE = 'lead_time_variance',
  QUALITY_PASS_RATE = 'quality_pass_rate',
  REJECTION_RATE = 'rejection_rate',
  LANDED_COST = 'landed_cost',
}

export enum ProcurementDimension {
  SUPPLIER = 'supplier',
  PRODUCT = 'product',
  CATEGORY = 'category',
  PURCHASE_ORDER = 'purchase_order',
  RFQ = 'rfq',
  QUOTATION = 'quotation',
  COUNTRY = 'country',
  CURRENCY = 'currency',
  WAREHOUSE = 'warehouse',
  BUYER = 'buyer',
}

export enum ProcurementPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum ProcurementPerformanceCategory {
  EFFICIENT = 'efficient',
  NORMAL = 'normal',
  DELAYED = 'delayed',
  HIGH_COST = 'high_cost',
  LOW_QUALITY = 'low_quality',
  INCOMPLETE = 'incomplete',
  RISKY = 'risky',
  COST_SAVING = 'cost_saving',
}

export enum PurchaseOrderStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  IN_TRANSIT = 'in_transit',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed',
}

export enum CostVarianceType {
  EXPECTED_VS_ACTUAL = 'expected_vs_actual',
  LANDED_COST_VARIANCE = 'landed_cost_variance',
  SHIPPING_VARIANCE = 'shipping_variance',
  TAX_VARIANCE = 'tax_variance',
  MISCELLANEOUS_VARIANCE = 'miscellaneous_variance',
}

export enum ProcurementComparisonType {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  EXPECTED_VS_ACTUAL = 'expected_vs_actual',
  TARGET = 'target',
  SUPPLIER_COMPARISON = 'supplier_comparison',
}

export enum ProcurementAnalyticsEventType {
  SPEND_CALCULATED = 'spend_calculated',
  SAVINGS_IDENTIFIED = 'savings_identified',
  COST_VARIANCE_DETECTED = 'cost_variance_detected',
  DELAYED_PROCUREMENT_DETECTED = 'delayed_procurement_detected',
  HIGH_COST_PROCUREMENT_DETECTED = 'high_cost_procurement_detected',
  LOW_QUALITY_DETECTED = 'low_quality_detected',
  INCOMPLETE_PROCUREMENT_DETECTED = 'incomplete_procurement_detected',
  RISKY_PROCUREMENT_DETECTED = 'risky_procurement_detected',
  PERFORMANCE_CALCULATED = 'performance_calculated',
  TREND_UPDATED = 'trend_updated',
  COMPARISON_GENERATED = 'comparison_generated',
}

export interface IRfqQuotationMetrics {
  rfqCount: number;
  quotationsReceived: number;
  responseRate: number;
  averageQuotationCompetitiveness: number;
  averageResponseTime: number;
  approvedQuotations: number;
  approvalRate: number;
  averageApprovalTime: number;
}

export interface IPurchaseOrderMetrics {
  totalOrders: number;
  totalOrderValue: number;
  averageOrderValue: number;
  pendingOrders: number;
  approvedOrders: number;
  inTransitOrders: number;
  partiallyReceivedOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
  delayedOrders: number;
  fulfillmentRate: number;
  cancellationRate: number;
}

export interface ICostMetrics {
  expectedProductCost: number;
  actualProductCost: number;
  productCostVariance: number;
  productCostVariancePercent: number;
  expectedLandedCost: number;
  actualLandedCost: number;
  landedCostVariance: number;
  landedCostVariancePercent: number;
  shippingCost: number;
  taxAmount: number;
  miscellaneousCharges: number;
  totalSpend: number;
  savingsAchieved: number;
  savingsPercent: number;
}

export interface IDeliveryQualityMetrics {
  totalDeliveries: number;
  onTimeDeliveries: number;
  onTimeDeliveryRate: number;
  averageLeadTime: number;
  expectedLeadTime: number;
  leadTimeVariance: number;
  leadTimeVariancePercent: number;
  inspectionsCompleted: number;
  qualityPassedCount: number;
  qualityFailedCount: number;
  qualityPassRate: number;
  rejectionRate: number;
  inspectionImpactAmount: number;
}

export interface IProcurementPerformance {
  workspaceId: string;
  period: ProcurementPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  performanceCategory: ProcurementPerformanceCategory;
  rfqQuotationMetrics: IRfqQuotationMetrics;
  purchaseOrderMetrics: IPurchaseOrderMetrics;
  costMetrics: ICostMetrics;
  deliveryQualityMetrics: IDeliveryQualityMetrics;
  procurementCycleTime: number;
  overallScore: number;
  supplierId?: string;
  supplierName?: string;
  productId?: string;
  productName?: string;
  category?: string;
  country?: string;
  metadata?: Record<string, any>;
}

export interface IProcurementTrend {
  workspaceId: string;
  period: ProcurementPeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: ProcurementMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  dimension?: ProcurementDimension;
  dimensionValue?: string;
  metadata?: Record<string, any>;
}

export interface IProcurementBreakdown {
  workspaceId: string;
  dimension: ProcurementDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: ProcurementPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  rfqQuotationMetrics: IRfqQuotationMetrics;
  purchaseOrderMetrics: IPurchaseOrderMetrics;
  costMetrics: ICostMetrics;
  deliveryQualityMetrics: IDeliveryQualityMetrics;
  overallScore: number;
  rank?: number;
  metadata?: Record<string, any>;
}

export interface IProcurementComparison {
  workspaceId: string;
  comparisonType: ProcurementComparisonType;
  period: ProcurementPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  actualMetrics: {
    rfqQuotationMetrics: IRfqQuotationMetrics;
    purchaseOrderMetrics: IPurchaseOrderMetrics;
    costMetrics: ICostMetrics;
    deliveryQualityMetrics: IDeliveryQualityMetrics;
    overallScore: number;
  };
  comparisonMetrics: {
    rfqQuotationMetrics: IRfqQuotationMetrics;
    purchaseOrderMetrics: IPurchaseOrderMetrics;
    costMetrics: ICostMetrics;
    deliveryQualityMetrics: IDeliveryQualityMetrics;
    overallScore: number;
  };
  variance: {
    spendVariance: number;
    spendVariancePercent: number;
    savingsVariance: number;
    savingsVariancePercent: number;
    fulfillmentRatePoints: number;
    onTimeDeliveryRatePoints: number;
    qualityPassRatePoints: number;
    cycleTimeVariance: number;
    overallScorePoints: number;
  };
  supplierId?: string;
  supplierName?: string;
  productId?: string;
  productName?: string;
  metadata?: Record<string, any>;
}

export interface IProcurementRiskAlert {
  workspaceId: string;
  alertType: ProcurementPerformanceCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  purchaseOrderId?: string;
  supplierId?: string;
  supplierName?: string;
  productId?: string;
  productName?: string;
  rfqId?: string;
  quotationId?: string;
  reason: string;
  details: Record<string, any>;
  detectedAt: Date;
  metadata?: Record<string, any>;
}

export interface IProcurementAnalyticsFilters {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  period?: ProcurementPeriod;
  supplierIds?: string[];
  productIds?: string[];
  categories?: string[];
  countries?: string[];
  currencies?: string[];
  purchaseOrderIds?: string[];
  rfqIds?: string[];
  quotationIds?: string[];
  statuses?: PurchaseOrderStatus[];
  performanceCategories?: ProcurementPerformanceCategory[];
  minOrderValue?: number;
  maxOrderValue?: number;
  minOverallScore?: number;
  buyerIds?: string[];
  warehouseIds?: string[];
}

export interface IProcurementAnalyticsEvent {
  event: ProcurementAnalyticsEventType;
  workspaceId: string;
  purchaseOrderId?: string;
  supplierId?: string;
  productId?: string;
  rfqId?: string;
  quotationId?: string;
  performanceCategory?: ProcurementPerformanceCategory;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}
