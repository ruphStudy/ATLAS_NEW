export enum KpiScope {
  SYSTEM = 'system',
  WORKSPACE = 'workspace',
  CUSTOM = 'custom',
}

export enum KpiCategory {
  PRODUCT = 'product',
  SUPPLIER = 'supplier',
  PROCUREMENT = 'procurement',
  INVENTORY = 'inventory',
  WAREHOUSE = 'warehouse',
  MARKETPLACE = 'marketplace',
  SALES = 'sales',
  PROFIT = 'profit',
  AI = 'ai',
  CUSTOM = 'custom',
}

export enum KpiStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  DISABLED = 'disabled',
  ARCHIVED = 'archived',
}

export enum KpiHealthStatus {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}

export enum KpiTrendDirection {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
  UNKNOWN = 'unknown',
}

export enum KpiAggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  PERCENTILE = 'percentile',
  CUSTOM = 'custom',
}

export enum KpiComparisonPeriod {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  SAME_PERIOD_LAST_MONTH = 'same_period_last_month',
  CUSTOM = 'custom',
}

export enum KpiThresholdOperator {
  GREATER_THAN = 'greater_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN = 'less_than',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  BETWEEN = 'between',
  OUTSIDE = 'outside',
}

export enum KpiEventType {
  KPI_CREATED = 'kpi_created',
  KPI_UPDATED = 'kpi_updated',
  KPI_ENABLED = 'kpi_enabled',
  KPI_DISABLED = 'kpi_disabled',
  KPI_ARCHIVED = 'kpi_archived',
  KPI_CALCULATED = 'kpi_calculated',
  THRESHOLD_EXCEEDED = 'threshold_exceeded',
  TARGET_ACHIEVED = 'target_achieved',
  TARGET_MISSED = 'target_missed',
  SNAPSHOT_CREATED = 'snapshot_created',
  VERSION_CREATED = 'version_created',
}

export interface IKpiFormula {
  expression: string;
  variables: Record<string, string>;
  description?: string;
}

export interface IKpiTarget {
  value: number;
  period: string;
  startDate?: Date;
  endDate?: Date;
}

export interface IKpiThreshold {
  name: string;
  operator: KpiThresholdOperator;
  value: number;
  value2?: number;
  healthStatus: KpiHealthStatus;
  alertEnabled: boolean;
  alertSeverity?: string;
}

export interface IKpiDimension {
  dimensionKey: string;
  values?: string[];
  isRequired: boolean;
}

export interface IKpiMetric {
  metricKey: string;
  aggregation?: KpiAggregationType;
  weight?: number;
}

export interface IKpiDefinition {
  id: string;
  workspaceId?: string;
  kpiKey: string;
  name: string;
  description?: string;
  scope: KpiScope;
  category: KpiCategory;
  status: KpiStatus;
  version: number;
  formula?: IKpiFormula;
  dimensions?: IKpiDimension[];
  metrics?: IKpiMetric[];
  target?: IKpiTarget;
  thresholds?: IKpiThreshold[];
  unit?: string;
  aggregation: KpiAggregationType;
  comparisonPeriod?: KpiComparisonPeriod;
  drillDownEnabled: boolean;
  cacheEnabled: boolean;
  cacheTtlMinutes?: number;
  groupKey?: string;
  ownerId?: string;
  metadata?: Record<string, any>;
  isSystem: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

export interface IKpiValue {
  id: string;
  kpiDefinitionId: string;
  workspaceId: string;
  kpiKey: string;
  value: number;
  targetValue?: number;
  variance?: number;
  variancePercent?: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  healthStatus: KpiHealthStatus;
  trendDirection: KpiTrendDirection;
  dimensions?: Record<string, any>;
  calculatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  metadata?: Record<string, any>;
}

export interface IKpiSnapshot {
  id: string;
  kpiDefinitionId: string;
  workspaceId: string;
  kpiKey: string;
  snapshotKey: string;
  values: IKpiValue[];
  aggregatedValue: number;
  targetValue?: number;
  variance?: number;
  variancePercent?: number;
  healthStatus: KpiHealthStatus;
  trendDirection: KpiTrendDirection;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface IKpiVersion {
  id: string;
  kpiDefinitionId: string;
  version: number;
  definition: Partial<IKpiDefinition>;
  changeDescription?: string;
  createdBy: string;
  createdAt: Date;
}

export interface IKpiHistory {
  id: string;
  kpiDefinitionId: string;
  workspaceId: string;
  kpiKey: string;
  value: number;
  targetValue?: number;
  variance?: number;
  variancePercent?: number;
  healthStatus: KpiHealthStatus;
  trendDirection: KpiTrendDirection;
  dimensions?: Record<string, any>;
  recordedAt: Date;
  periodStart: Date;
  periodEnd: Date;
}

export interface IKpiGroup {
  id: string;
  workspaceId?: string;
  groupKey: string;
  name: string;
  description?: string;
  category?: KpiCategory;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IKpiAlert {
  id: string;
  kpiDefinitionId: string;
  workspaceId: string;
  kpiKey: string;
  thresholdName: string;
  severity: string;
  value: number;
  thresholdValue: number;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface IKpiEvent {
  event: KpiEventType;
  workspaceId: string;
  kpiDefinitionId?: string;
  kpiKey?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface IKpiCalculationRequest {
  kpiDefinitionId: string;
  workspaceId: string;
  periodStart: Date;
  periodEnd: Date;
  dimensions?: Record<string, any>;
  forceRecalculate?: boolean;
}

export interface IKpiCalculationResult {
  kpiDefinitionId: string;
  kpiKey: string;
  value: number;
  targetValue?: number;
  variance?: number;
  variancePercent?: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  healthStatus: KpiHealthStatus;
  trendDirection: KpiTrendDirection;
  calculatedAt: Date;
  metadata?: Record<string, any>;
}
