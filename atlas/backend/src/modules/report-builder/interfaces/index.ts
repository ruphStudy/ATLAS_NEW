export enum ReportType {
  TABLE = 'table',
  SUMMARY = 'summary',
  CHART = 'chart',
  PIVOT = 'pivot',
  GROUPED = 'grouped',
}

export enum ReportStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ReportDataSource {
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

export enum ReportColumnType {
  DIMENSION = 'dimension',
  METRIC = 'metric',
  CALCULATED = 'calculated',
  KPI = 'kpi',
}

export enum ReportAggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  DISTINCT_COUNT = 'distinct_count',
  NONE = 'none',
}

export enum ReportSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export enum ReportFilterOperator {
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

export enum ReportExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ReportEventType {
  REPORT_CREATED = 'report_created',
  REPORT_UPDATED = 'report_updated',
  REPORT_CLONED = 'report_cloned',
  REPORT_PUBLISHED = 'report_published',
  REPORT_ARCHIVED = 'report_archived',
  REPORT_RESTORED = 'report_restored',
  REPORT_EXECUTED = 'report_executed',
  EXECUTION_STARTED = 'execution_started',
  EXECUTION_COMPLETED = 'execution_completed',
  EXECUTION_FAILED = 'execution_failed',
  VERSION_CREATED = 'version_created',
  TEMPLATE_CREATED = 'template_created',
}

export interface IReportColumn {
  columnKey: string;
  name: string;
  type: ReportColumnType;
  sourceKey: string;
  aggregation?: ReportAggregationType;
  formula?: string;
  width?: number;
  sortable: boolean;
  filterable: boolean;
  visible: boolean;
  order: number;
  conditionalFormatting?: {
    rules: Array<{
      condition: string;
      style: Record<string, any>;
    }>;
  };
}

export interface IReportFilter {
  columnKey: string;
  operator: ReportFilterOperator;
  value: any;
  value2?: any;
}

export interface IReportSort {
  columnKey: string;
  direction: ReportSortDirection;
}

export interface IReportGrouping {
  columnKey: string;
  aggregations: Array<{
    columnKey: string;
    aggregation: ReportAggregationType;
  }>;
}

export interface IReportDateRange {
  start: Date;
  end: Date;
  presetKey?: string;
}

export interface IReportDefinition {
  id: string;
  workspaceId?: string;
  reportKey: string;
  name: string;
  description?: string;
  type: ReportType;
  dataSource: ReportDataSource;
  status: ReportStatus;
  version: number;
  columns: IReportColumn[];
  filters?: IReportFilter[];
  sorting?: IReportSort[];
  grouping?: IReportGrouping[];
  dateRange?: IReportDateRange;
  limit?: number;
  offset?: number;
  drillDownEnabled: boolean;
  cacheEnabled: boolean;
  cacheTtlMinutes?: number;
  templateId?: string;
  isTemplate: boolean;
  permissions?: {
    roles?: string[];
    userIds?: string[];
  };
  metadata?: Record<string, any>;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

export interface IReportExecution {
  id: string;
  reportDefinitionId: string;
  workspaceId: string;
  reportKey: string;
  status: ReportExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  resultCount?: number;
  errorCode?: string;
  errorMessage?: string;
  filters?: IReportFilter[];
  dateRange?: IReportDateRange;
  limit?: number;
  offset?: number;
  executedBy?: string;
  metadata?: Record<string, any>;
}

export interface IReportResult {
  executionId: string;
  reportDefinitionId: string;
  workspaceId: string;
  columns: IReportColumn[];
  rows: Record<string, any>[];
  total: number;
  aggregations?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface IReportVersion {
  id: string;
  reportDefinitionId: string;
  version: number;
  definition: Partial<IReportDefinition>;
  changeDescription?: string;
  createdBy: string;
  createdAt: Date;
}

export interface IReportTemplate {
  id: string;
  workspaceId?: string;
  templateKey: string;
  name: string;
  description?: string;
  type: ReportType;
  dataSource: ReportDataSource;
  columns: IReportColumn[];
  filters?: IReportFilter[];
  sorting?: IReportSort[];
  grouping?: IReportGrouping[];
  isGlobal: boolean;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReportEvent {
  event: ReportEventType;
  workspaceId: string;
  reportDefinitionId?: string;
  reportKey?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface IReportExecutionRequest {
  reportDefinitionId: string;
  workspaceId: string;
  filters?: IReportFilter[];
  dateRange?: IReportDateRange;
  limit?: number;
  offset?: number;
  executedBy?: string;
  forceRefresh?: boolean;
}
