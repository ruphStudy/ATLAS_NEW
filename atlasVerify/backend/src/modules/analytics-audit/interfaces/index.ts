export enum AnalyticsAuditModule {
  ANALYTICS_FOUNDATION = 'analytics_foundation',
  KPI_MANAGEMENT = 'kpi_management',
  DASHBOARD_FRAMEWORK = 'dashboard_framework',
  REPORT_BUILDER = 'report_builder',
  SCHEDULED_REPORTS = 'scheduled_reports',
  EXPORT_FRAMEWORK = 'export_framework',
  DATA_AGGREGATION = 'data_aggregation',
  ANALYTICS_CACHE = 'analytics_cache',
  FORECASTING_ENGINE = 'forecasting_engine',
  BUSINESS_INSIGHTS = 'business_insights',
}

export enum AnalyticsAuditAction {
  QUERY_EXECUTED = 'query_executed',
  KPI_CALCULATED = 'kpi_calculated',
  REPORT_EXECUTED = 'report_executed',
  REPORT_SCHEDULED = 'report_scheduled',
  EXPORT_GENERATED = 'export_generated',
  AGGREGATION_EXECUTED = 'aggregation_executed',
  FORECAST_GENERATED = 'forecast_generated',
  INSIGHT_GENERATED = 'insight_generated',
  CACHE_READ = 'cache_read',
  CACHE_WRITE = 'cache_write',
  CACHE_INVALIDATED = 'cache_invalidated',
  DASHBOARD_VIEWED = 'dashboard_viewed',
  WIDGET_RENDERED = 'widget_rendered',
}

export enum AuditActor {
  USER = 'user',
  SYSTEM = 'system',
  SCHEDULER = 'scheduler',
  AI = 'ai',
}

export enum AuditOutcome {
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL = 'partial',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

export enum AnalyticsAuditEventType {
  AUDIT_RECORDED = 'audit_recorded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

export interface IAuditMetadata {
  metrics?: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  reportId?: string;
  forecastId?: string;
  insightId?: string;
  aggregationId?: string;
  kpiId?: string;
  dashboardId?: string;
  widgetId?: string;
  exportFormat?: string;
  cacheKey?: string;
}

export interface IAuditInputOutput {
  inputSize?: number;
  outputSize?: number;
  rowCount?: number;
  recordCount?: number;
  errorMessage?: string;
  warnings?: string[];
}

export interface IAnalyticsAuditRecord {
  id: string;
  workspaceId: string;
  module: AnalyticsAuditModule;
  action: AnalyticsAuditAction;
  actor: AuditActor;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  timestamp: Date;
  outcome: AuditOutcome;
  duration?: number;
  correlationId?: string;
  parentAuditId?: string;
  metadata?: IAuditMetadata;
  inputOutput?: IAuditInputOutput;
  status?: string;
  ipAddress?: string;
  userAgent?: string;
  immutable: boolean;
  createdAt: Date;
}

export interface IAuditTimeline {
  entityType: string;
  entityId: string;
  records: IAnalyticsAuditRecord[];
  totalEvents: number;
  firstEvent: Date;
  lastEvent: Date;
}

export interface ISuspiciousActivity {
  id: string;
  workspaceId: string;
  actorId?: string;
  pattern: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  auditRecordIds: string[];
  description: string;
  metadata?: Record<string, any>;
}

export interface IAnalyticsAuditEventPayload {
  event: AnalyticsAuditEventType;
  workspaceId: string;
  auditRecordId?: string;
  module?: AnalyticsAuditModule;
  action?: AnalyticsAuditAction;
  outcome?: AuditOutcome;
  timestamp: Date;
  metadata?: Record<string, any>;
}
