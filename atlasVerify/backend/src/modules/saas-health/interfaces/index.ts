import { SaasHealthModuleKey, SaasHealthStatus } from '@modules/saas-monitoring/interfaces';

// Re-exported so callers of this module don't also need to import from
// saas-monitoring directly — same enums, not redeclared equivalents, per
// "reuse existing... patterns" / "aggregate existing health signals,
// don't duplicate module-specific monitoring logic". This module never
// re-gathers the underlying queue/audit signals itself — it only reads
// SaaS Monitoring's already-computed per-module status.
export { SaasHealthModuleKey, SaasHealthStatus };

/** The consolidated status vocabulary — a strict superset of SaaS Monitoring's own `SaasHealthStatus`, adding the two states only the aggregate view can determine: OFFLINE (every monitored module unhealthy at once) and MAINTENANCE (an active suppression window covers this scope). */
export enum SaasHealthLevel {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
}

export enum SaasHealthEvaluationTrigger {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  EVENT_DRIVEN = 'EVENT_DRIVEN',
}

export enum SaasHealthAggregateIncidentStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
}

export enum SaasHealthAggregateEvent {
  CHANGED = 'saas-health.changed',
  DEGRADED = 'saas-health.degraded',
  FAILED = 'saas-health.failed',
  RESTORED = 'saas-health.restored',
}

export interface IDependencyIssue {
  /** The module whose consumers are impacted. */
  module: SaasHealthModuleKey;
  /** The upstream module(s) actually unhealthy/degraded, causing this cascading impact. */
  dependsOn: SaasHealthModuleKey[];
  message: string;
}

export interface IModuleBreakdownEntry {
  module: SaasHealthModuleKey;
  status: SaasHealthStatus;
  /** Per-module contribution to the composite score (0-100), before dependency/business blending. */
  scoreContribution: number;
}

export interface ISaasHealthAggregateSnapshot {
  id: string;
  workspaceId: string;
  level: SaasHealthLevel;
  healthScore: number;
  moduleBreakdown: IModuleBreakdownEntry[];
  cascadingImpacts: IDependencyIssue[];
  dependencyIssues: IDependencyIssue[];
  consecutiveDegradedEvaluations: number;
  consecutiveHealthyEvaluations: number;
  safeSummary?: string | null;
  lastEvaluatedAt: Date;
  lastHealthyAt?: Date | null;
  lastDegradedAt?: Date | null;
  lastUnhealthyAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISaasHealthAggregateIncident {
  id: string;
  workspaceId: string;
  severity: SaasHealthLevel;
  status: SaasHealthAggregateIncidentStatus;
  triggerSummary: string;
  affectedModules: string[];
  cascadingFrom: string[];
  openedAt: Date;
  resolvedAt?: Date | null;
  durationMs?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISaasHealthEvaluationLog {
  id: string;
  workspaceId: string;
  level: SaasHealthLevel;
  previousLevel?: SaasHealthLevel | null;
  trigger: SaasHealthEvaluationTrigger;
  healthScore: number;
  moduleBreakdown: IModuleBreakdownEntry[];
  safeSummary?: string | null;
  evaluatedAt: Date;
}

export interface ISaasHealthMaintenanceWindow {
  id: string;
  workspaceId: string | null;
  module: string | null;
  reason: string;
  startAt: Date;
  endAt: Date;
  createdBy: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Live-computed maintenance-window state — never persisted (see `SaasHealthMaintenanceWindow`'s own doc comment). */
export enum SaasHealthMaintenanceState {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface ITenantHealthResult {
  workspaceId: string;
  level: SaasHealthLevel;
  healthScore: number;
  moduleBreakdown: IModuleBreakdownEntry[];
  cascadingImpacts: IDependencyIssue[];
  dependencyIssues: IDependencyIssue[];
  safeSummary: string;
}

export interface IPlatformHealthResult {
  level: SaasHealthLevel;
  averageHealthScore: number;
  tenantsEvaluated: number;
  levelBreakdown: Record<string, number>;
}

export interface IOrganizationHealthResult {
  organizationId: string;
  level: SaasHealthLevel;
  averageHealthScore: number;
  tenants: ISaasHealthAggregateSnapshot[];
}

export interface ISaasHealthAggregateEventPayload {
  event: SaasHealthAggregateEvent;
  workspaceId: string;
  level: SaasHealthLevel;
  previousLevel?: SaasHealthLevel;
  healthScore: number;
  incidentId?: string;
  metadata?: Record<string, unknown>;
}
