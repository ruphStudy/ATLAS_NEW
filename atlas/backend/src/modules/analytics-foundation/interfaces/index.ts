export enum AnalyticsEntityType {
  WORKSPACE = 'workspace',
  PROVIDER = 'provider',
  MARKETPLACE = 'marketplace',
  AI_MODEL = 'ai_model',
  PRODUCT = 'product',
  SUPPLIER = 'supplier',
  ORDER = 'order',
  INVENTORY = 'inventory',
  USER = 'user',
  CUSTOM = 'custom',
}

export enum AnalyticsDimensionType {
  TIME = 'time',
  CATEGORY = 'category',
  GEOGRAPHY = 'geography',
  ENTITY = 'entity',
  ATTRIBUTE = 'attribute',
}

export enum AnalyticsMetricType {
  COUNT = 'count',
  SUM = 'sum',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  PERCENTAGE = 'percentage',
  RATIO = 'ratio',
  CUSTOM = 'custom',
}

export enum AnalyticsAggregation {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  TOTAL = 'total',
}

export enum AnalyticsFilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  IN = 'in',
  NOT_IN = 'not_in',
  GREATER_THAN = 'greater_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN = 'less_than',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
  BETWEEN = 'between',
}

export enum AnalyticsEventType {
  ENTITY_REGISTERED = 'entity_registered',
  DIMENSION_REGISTERED = 'dimension_registered',
  METRIC_REGISTERED = 'metric_registered',
  QUERY_EXECUTED = 'query_executed',
  SNAPSHOT_CREATED = 'snapshot_created',
  KPI_CALCULATED = 'kpi_calculated',
  CONFIGURATION_UPDATED = 'configuration_updated',
}

export interface IAnalyticsEntity {
  id: string;
  workspaceId: string;
  entityType: AnalyticsEntityType;
  entityKey: string;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnalyticsDimension {
  id: string;
  workspaceId: string;
  entityType: AnalyticsEntityType;
  dimensionKey: string;
  name: string;
  dimensionType: AnalyticsDimensionType;
  dataType: string;
  sourceColumn?: string;
  transformFunction?: string;
  description?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnalyticsMetric {
  id: string;
  workspaceId: string;
  entityType: AnalyticsEntityType;
  metricKey: string;
  name: string;
  metricType: AnalyticsMetricType;
  aggregationFunction: string;
  sourceColumn?: string;
  formula?: string;
  unit?: string;
  description?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnalyticsFilter {
  dimensionKey: string;
  operator: AnalyticsFilterOperator;
  value: any;
  values?: any[];
}

export interface IAnalyticsQuery {
  entityType: AnalyticsEntityType;
  metrics: string[];
  dimensions?: string[];
  filters?: IAnalyticsFilter[];
  aggregation?: AnalyticsAggregation;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface IAnalyticsQueryResult {
  queryId: string;
  entityType: AnalyticsEntityType;
  data: Record<string, any>[];
  total: number;
  executionTimeMs: number;
  metadata?: Record<string, any>;
}

export interface IAnalyticsKpi {
  id: string;
  workspaceId: string;
  kpiKey: string;
  name: string;
  entityType: AnalyticsEntityType;
  metricKey: string;
  targetValue?: number;
  currentValue?: number;
  previousValue?: number;
  changePercent?: number;
  period: AnalyticsAggregation;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastCalculatedAt?: Date;
}

export interface IAnalyticsSnapshot {
  id: string;
  workspaceId: string;
  snapshotKey: string;
  entityType: AnalyticsEntityType;
  period: AnalyticsAggregation;
  startDate: Date;
  endDate: Date;
  data: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface IAnalyticsConfiguration {
  id: string;
  workspaceId: string;
  configKey: string;
  entityType?: AnalyticsEntityType;
  configData: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnalyticsEvent {
  event: AnalyticsEventType;
  workspaceId: string;
  entityType?: AnalyticsEntityType;
  entityId?: string;
  metadata?: Record<string, any>;
}
