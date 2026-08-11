export enum AnalyticsService {
  ANALYTICS_FOUNDATION = 'analytics_foundation',
  DATA_AGGREGATION = 'data_aggregation',
  ANALYTICS_CACHE = 'analytics_cache',
  KPI_MANAGEMENT = 'kpi_management',
  REPORT_BUILDER = 'report_builder',
  SCHEDULED_REPORTS = 'scheduled_reports',
  EXPORT_FRAMEWORK = 'export_framework',
  FORECASTING_ENGINE = 'forecasting_engine',
  BUSINESS_INSIGHTS = 'business_insights',
  ANALYTICS_API = 'analytics_api',
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  FAILED = 'failed',
  UNKNOWN = 'unknown',
}

export enum HealthCheckType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  AUTOMATIC = 'automatic',
}

export enum AnalyticsHealthEventType {
  HEALTH_CHECK_COMPLETED = 'health_check_completed',
  SERVICE_DEGRADED = 'service_degraded',
  SERVICE_FAILED = 'service_failed',
  SERVICE_RESTORED = 'service_restored',
  INCIDENT_DETECTED = 'incident_detected',
  INCIDENT_RESOLVED = 'incident_resolved',
}

export interface IHealthMetrics {
  availability: number;
  averageLatency?: number;
  throughput?: number;
  failureRate?: number;
  cacheHitRate?: number;
  queueDelay?: number;
  staleDataPercentage?: number;
}

export interface IServiceHealth {
  service: AnalyticsService;
  status: HealthStatus;
  metrics: IHealthMetrics;
  lastSuccessful?: Date;
  lastCheck: Date;
  issues?: string[];
  metadata?: Record<string, any>;
}

export interface IWorkspaceHealthSummary {
  workspaceId: string;
  overallStatus: HealthStatus;
  services: IServiceHealth[];
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  failedServices: number;
  lastUpdated: Date;
}

export interface ISystemHealthSummary {
  overallStatus: HealthStatus;
  totalWorkspaces: number;
  healthyWorkspaces: number;
  degradedWorkspaces: number;
  failedWorkspaces: number;
  services: IServiceHealth[];
  lastUpdated: Date;
}

export interface IHealthCheck {
  id: string;
  workspaceId?: string;
  service?: AnalyticsService;
  type: HealthCheckType;
  status: HealthStatus;
  metrics?: IHealthMetrics;
  issues?: string[];
  triggeredBy?: string;
  completedAt: Date;
  duration?: number;
}

export interface IHealthIncident {
  id: string;
  workspaceId?: string;
  service: AnalyticsService;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  title: string;
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  affectedOperations?: number;
  errorSummary?: string;
  metadata?: Record<string, any>;
}

export interface IOperationStatus {
  operationType: string;
  lastSuccessful?: Date;
  lastFailed?: Date;
  consecutiveFailures: number;
  isStuck: boolean;
  isDelayed: boolean;
}

export interface IAnalyticsHealthEventPayload {
  event: AnalyticsHealthEventType;
  workspaceId?: string;
  service?: AnalyticsService;
  status?: HealthStatus;
  incidentId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
