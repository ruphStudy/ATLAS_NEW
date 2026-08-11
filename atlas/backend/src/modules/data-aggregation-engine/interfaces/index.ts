export enum AggregationMode {
  REAL_TIME = 'real_time',
  INCREMENTAL = 'incremental',
  SCHEDULED = 'scheduled',
  ON_DEMAND = 'on_demand',
}

export enum AggregationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  STALE = 'stale',
}

export enum TimeBucket {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum DimensionType {
  WORKSPACE = 'workspace',
  MARKETPLACE = 'marketplace',
  PROVIDER = 'provider',
  ACCOUNT = 'account',
  WAREHOUSE = 'warehouse',
  PRODUCT = 'product',
  CATEGORY = 'category',
  SUPPLIER = 'supplier',
  COUNTRY = 'country',
  REGION = 'region',
  CURRENCY = 'currency',
  USER = 'user',
}

export enum MetricType {
  SUM = 'sum',
  COUNT = 'count',
  AVERAGE = 'average',
  MINIMUM = 'minimum',
  MAXIMUM = 'maximum',
  DISTINCT_COUNT = 'distinct_count',
  RATIO = 'ratio',
  WEIGHTED = 'weighted',
}

export enum SourceModule {
  PRODUCT = 'product',
  SUPPLIER = 'supplier',
  PROCUREMENT = 'procurement',
  INVENTORY = 'inventory',
  WAREHOUSE = 'warehouse',
  MARKETPLACE = 'marketplace',
  SALES = 'sales',
  PROFIT = 'profit',
  AI = 'ai',
}

export enum AggregationEventType {
  AGGREGATION_REQUESTED = 'aggregation_requested',
  AGGREGATION_STARTED = 'aggregation_started',
  AGGREGATION_PROGRESS = 'aggregation_progress',
  AGGREGATION_COMPLETED = 'aggregation_completed',
  AGGREGATION_FAILED = 'aggregation_failed',
  BACKFILL_STARTED = 'backfill_started',
  BACKFILL_COMPLETED = 'backfill_completed',
  SNAPSHOT_CREATED = 'snapshot_created',
  AGGREGATION_INVALIDATED = 'aggregation_invalidated',
}

export interface IDimension {
  type: DimensionType;
  key: string;
  name: string;
  description?: string;
  sourceColumn: string;
  hierarchyPath?: string[];
}

export interface IMetric {
  key: string;
  name: string;
  description?: string;
  type: MetricType;
  sourceColumn: string;
  sourceModule: SourceModule;
  formula?: string;
  decimals?: number;
  unit?: string;
  conditions?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
}

export interface IMeasure {
  metricKey: string;
  dimensions: DimensionType[];
  timeBucket: TimeBucket;
  value: number;
  count?: number;
  metadata?: Record<string, any>;
}

export interface IAggregationDefinition {
  id: string;
  workspaceId: string;
  definitionKey: string;
  name: string;
  description?: string;
  sourceModule: SourceModule;
  mode: AggregationMode;
  timeBucket: TimeBucket;
  dimensions: IDimension[];
  metrics: IMetric[];
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  scheduleExpression?: string;
  refreshIntervalMinutes?: number;
  retentionDays?: number;
  enabled: boolean;
  version: number;
  metadata?: Record<string, any>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAggregationExecution {
  id: string;
  definitionId: string;
  workspaceId: string;
  definitionKey: string;
  mode: AggregationMode;
  status: AggregationStatus;
  timeBucket: TimeBucket;
  periodStart: Date;
  periodEnd: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  progress?: number;
  progressMessage?: string;
  cursorPosition?: string;
  eventsProcessed?: number;
  recordsAggregated?: number;
  snapshotId?: string;
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAggregationSnapshot {
  id: string;
  definitionId: string;
  executionId: string;
  workspaceId: string;
  definitionKey: string;
  timeBucket: TimeBucket;
  periodStart: Date;
  periodEnd: Date;
  version: number;
  measures: IMeasure[];
  recordCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface IAggregationCursor {
  id: string;
  definitionId: string;
  workspaceId: string;
  definitionKey: string;
  lastProcessedEventId?: string;
  lastProcessedTimestamp?: Date;
  position: string;
  metadata?: Record<string, any>;
  updatedAt: Date;
}

export interface IAggregationEventPayload {
  event: AggregationEventType;
  workspaceId: string;
  definitionId?: string;
  definitionKey?: string;
  executionId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
