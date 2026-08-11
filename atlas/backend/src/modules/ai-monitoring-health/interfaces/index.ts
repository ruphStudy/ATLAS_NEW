export enum AiHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  OFFLINE = 'OFFLINE',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  MAINTENANCE = 'MAINTENANCE',
}

export enum AiHealthCheckType {
  PROVIDER = 'PROVIDER',
  MODEL = 'MODEL',
  ORCHESTRATOR = 'ORCHESTRATOR',
  AGENT = 'AGENT',
  WORKFLOW = 'WORKFLOW',
  QUEUE = 'QUEUE',
  CACHE = 'CACHE',
  SYSTEM = 'SYSTEM',
}

export enum AiHealthEventType {
  HEALTH_CHECK = 'HEALTH_CHECK',
  DEGRADATION = 'DEGRADATION',
  OUTAGE = 'OUTAGE',
  RECOVERY = 'RECOVERY',
  THRESHOLD_EXCEEDED = 'THRESHOLD_EXCEEDED',
  INCIDENT_CREATED = 'INCIDENT_CREATED',
  INCIDENT_RESOLVED = 'INCIDENT_RESOLVED',
}

export interface IAiHealthCheck {
  id: string;
  workspaceId: string;
  checkType: AiHealthCheckType;
  targetId?: string;
  targetName: string;
  provider?: string;
  model?: string;
  capability?: string;
  status: AiHealthStatus;
  previousStatus?: AiHealthStatus;
  availabilityPercent?: number;
  averageLatencyMs?: number;
  p95LatencyMs?: number;
  p99LatencyMs?: number;
  throughputRpm?: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  fallbackCount: number;
  rateLimitHits: number;
  quotaRemaining?: number;
  budgetRemaining?: number;
  totalTokensUsed: number;
  totalCost: number;
  lastCheckAt: Date;
  checkDurationMs?: number;
  errorMessage?: string;
  errorCode?: string;
  errorDetails?: unknown;
  isManual: boolean;
  scheduledCheck: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface IAiHealthIncident {
  id: string;
  workspaceId: string;
  healthCheckId?: string;
  incidentType: string;
  severity: string;
  checkType: AiHealthCheckType;
  targetId?: string;
  targetName: string;
  provider?: string;
  model?: string;
  capability?: string;
  status: string;
  title: string;
  description: string;
  detectedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  resolutionTime?: number;
  affectedRequests: number;
  failureRate?: number;
  rootCause?: string;
  resolution?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiHealthMetrics {
  id: string;
  workspaceId: string;
  checkType: AiHealthCheckType;
  targetName: string;
  provider?: string;
  model?: string;
  capability?: string;
  status: AiHealthStatus;
  availabilityPercent?: number;
  latencyMs?: number;
  throughput?: number;
  requestCount: number;
  successCount: number;
  failureCount: number;
  tokensUsed?: number;
  cost?: number;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface IAiHealthSummary {
  id: string;
  workspaceId: string;
  checkType: AiHealthCheckType;
  targetName: string;
  provider?: string;
  model?: string;
  overallStatus: AiHealthStatus;
  uptimePercent: number;
  averageLatencyMs: number;
  totalRequests: number;
  successRate: number;
  activeIncidents: number;
  totalIncidents: number;
  lastHealthyAt?: Date;
  lastCheckedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHealthCheckRequest {
  workspaceId: string;
  checkType: AiHealthCheckType;
  targetId?: string;
  targetName: string;
  provider?: string;
  model?: string;
  capability?: string;
  isManual?: boolean;
  metadata?: Record<string, unknown>;
}

export interface IHealthCheckResult {
  status: AiHealthStatus;
  availabilityPercent?: number;
  averageLatencyMs?: number;
  p95LatencyMs?: number;
  p99LatencyMs?: number;
  throughputRpm?: number;
  successCount: number;
  failureCount: number;
  retryCount: number;
  fallbackCount: number;
  rateLimitHits: number;
  quotaRemaining?: number;
  budgetRemaining?: number;
  totalTokensUsed: number;
  totalCost: number;
  checkDurationMs: number;
  errorMessage?: string;
  errorCode?: string;
  errorDetails?: unknown;
}

export interface IAiHealthCheckEvent {
  event: AiHealthEventType.HEALTH_CHECK;
  workspaceId: string;
  healthCheckId: string;
  status: AiHealthStatus;
}

export interface IAiHealthDegradationEvent {
  event: AiHealthEventType.DEGRADATION;
  workspaceId: string;
  healthCheckId: string;
  checkType: AiHealthCheckType;
  targetName: string;
}

export interface IAiHealthOutageEvent {
  event: AiHealthEventType.OUTAGE;
  workspaceId: string;
  healthCheckId: string;
  checkType: AiHealthCheckType;
  targetName: string;
}

export interface IAiHealthRecoveryEvent {
  event: AiHealthEventType.RECOVERY;
  workspaceId: string;
  healthCheckId: string;
  checkType: AiHealthCheckType;
  targetName: string;
  previousStatus: AiHealthStatus;
}

export interface IAiHealthThresholdExceededEvent {
  event: AiHealthEventType.THRESHOLD_EXCEEDED;
  workspaceId: string;
  healthCheckId: string;
  metricName: string;
  threshold: number;
  actualValue: number;
}

export interface IAiHealthIncidentCreatedEvent {
  event: AiHealthEventType.INCIDENT_CREATED;
  workspaceId: string;
  incidentId: string;
  severity: string;
}

export interface IAiHealthIncidentResolvedEvent {
  event: AiHealthEventType.INCIDENT_RESOLVED;
  workspaceId: string;
  incidentId: string;
  resolutionTime: number;
}

export type AiHealthEvent =
  | IAiHealthCheckEvent
  | IAiHealthDegradationEvent
  | IAiHealthOutageEvent
  | IAiHealthRecoveryEvent
  | IAiHealthThresholdExceededEvent
  | IAiHealthIncidentCreatedEvent
  | IAiHealthIncidentResolvedEvent;
