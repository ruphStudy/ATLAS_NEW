export enum DashboardStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum WidgetType {
  KPI = 'kpi',
  CHART = 'chart',
  TABLE = 'table',
  TREND = 'trend',
  SUMMARY = 'summary',
  ALERT = 'alert',
}

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter',
  GAUGE = 'gauge',
  HEATMAP = 'heatmap',
}

export enum RefreshInterval {
  MANUAL = 'manual',
  REALTIME = 'realtime',
  EVERY_MINUTE = 'every_minute',
  EVERY_5_MINUTES = 'every_5_minutes',
  EVERY_15_MINUTES = 'every_15_minutes',
  EVERY_HOUR = 'every_hour',
  EVERY_DAY = 'every_day',
}

export enum DashboardEventType {
  DASHBOARD_CREATED = 'dashboard_created',
  DASHBOARD_UPDATED = 'dashboard_updated',
  DASHBOARD_CLONED = 'dashboard_cloned',
  DASHBOARD_PUBLISHED = 'dashboard_published',
  DASHBOARD_ARCHIVED = 'dashboard_archived',
  DASHBOARD_RESTORED = 'dashboard_restored',
  WIDGET_ADDED = 'widget_added',
  WIDGET_UPDATED = 'widget_updated',
  WIDGET_REMOVED = 'widget_removed',
  LAYOUT_UPDATED = 'layout_updated',
  FILTER_APPLIED = 'filter_applied',
  DATA_EXPORTED = 'data_exported',
}

export interface IDashboardLayout {
  columns: number;
  rows: number;
  gap: number;
  padding: number;
}

export interface IWidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IWidgetDataSource {
  type: 'analytics_query' | 'kpi' | 'snapshot' | 'custom';
  entityType?: string;
  metrics?: string[];
  dimensions?: string[];
  filters?: any[];
  aggregation?: string;
  kpiKey?: string;
  snapshotKey?: string;
  customEndpoint?: string;
}

export interface IWidgetConfig {
  title: string;
  description?: string;
  widgetType: WidgetType;
  chartType?: ChartType;
  dataSource: IWidgetDataSource;
  displayOptions: Record<string, any>;
  refreshInterval?: RefreshInterval;
}

export interface IDashboard {
  id: string;
  workspaceId: string;
  dashboardKey: string;
  name: string;
  description?: string;
  status: DashboardStatus;
  layout: IDashboardLayout;
  templateId?: string;
  isTemplate: boolean;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  refreshInterval: RefreshInterval;
  permissions?: {
    roles?: string[];
    userIds?: string[];
  };
  metadata?: Record<string, any>;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

export interface IDashboardWidget {
  id: string;
  dashboardId: string;
  widgetKey: string;
  position: IWidgetPosition;
  config: IWidgetConfig;
  cacheKey?: string;
  cacheTtl?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDashboardVersion {
  id: string;
  dashboardId: string;
  version: number;
  layout: IDashboardLayout;
  filters?: Record<string, any>;
  widgets: any[];
  changeDescription?: string;
  createdBy: string;
  createdAt: Date;
}

export interface IDashboardTemplate {
  id: string;
  workspaceId?: string;
  templateKey: string;
  name: string;
  description?: string;
  category?: string;
  layout: IDashboardLayout;
  defaultWidgets: any[];
  isGlobal: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDashboardExport {
  id: string;
  dashboardId: string;
  workspaceId: string;
  exportFormat: string;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  fileUrl?: string;
  status: string;
  createdBy: string;
  createdAt: Date;
}

export interface IDashboardEvent {
  event: DashboardEventType;
  workspaceId: string;
  dashboardId?: string;
  widgetId?: string;
  metadata?: Record<string, any>;
}
