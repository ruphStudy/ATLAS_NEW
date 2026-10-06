export enum AiAuditActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  SCHEDULER = 'SCHEDULER',
  WEBHOOK = 'WEBHOOK',
  AI_AGENT = 'AI_AGENT',
}

export enum AiAuditAction {
  REQUEST_CREATED = 'REQUEST_CREATED',
  REQUEST_EXECUTED = 'REQUEST_EXECUTED',
  REQUEST_COMPLETED = 'REQUEST_COMPLETED',
  REQUEST_FAILED = 'REQUEST_FAILED',
  REQUEST_CANCELLED = 'REQUEST_CANCELLED',
  DECISION_EVALUATED = 'DECISION_EVALUATED',
  RECOMMENDATION_GENERATED = 'RECOMMENDATION_GENERATED',
  RETRY_ATTEMPTED = 'RETRY_ATTEMPTED',
  FALLBACK_TRIGGERED = 'FALLBACK_TRIGGERED',
  GUARDRAIL_EVALUATED = 'GUARDRAIL_EVALUATED',
  GUARDRAIL_BLOCKED = 'GUARDRAIL_BLOCKED',
  GUARDRAIL_REDACTED = 'GUARDRAIL_REDACTED',
  COST_RECORDED = 'COST_RECORDED',
  USAGE_RECORDED = 'USAGE_RECORDED',
  CACHE_HIT = 'CACHE_HIT',
  CACHE_MISS = 'CACHE_MISS',
  CACHE_STORED = 'CACHE_STORED',
  HEALTH_CHECK_PERFORMED = 'HEALTH_CHECK_PERFORMED',
  INCIDENT_CREATED = 'INCIDENT_CREATED',
  INCIDENT_RESOLVED = 'INCIDENT_RESOLVED',
}

export enum AiAuditOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
  BLOCKED = 'BLOCKED',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
}

export enum AiAuditEventType {
  ACTIVITY_RECORDED = 'ACTIVITY_RECORDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

export interface IAiAuditLog {
  id: string;
  workspaceId: string;
  actorType: AiAuditActorType;
  actorId?: string;
  actorName?: string;
  action: AiAuditAction;
  outcome: AiAuditOutcome;
  capability?: string;
  useCase?: string;
  provider?: string;
  model?: string;
  agentId?: string;
  agentExecutionId?: string;
  workflowId?: string;
  workflowExecutionId?: string;
  jobId?: string;
  jobExecutionId?: string;
  queueJobId?: string;
  orchestratorRequestId?: string;
  correlationId?: string;
  externalReferenceId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  latencyMs?: number;
  validationResult?: string;
  guardrailDecision?: string;
  guardrailReasons: string[];
  inputReference?: string;
  outputReference?: string;
  errorCode?: string;
  errorMessage?: string;
  suspicious: boolean;
  suspicionReasons: string[];
  ipAddress?: string;
  userAgent?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  timestamp: Date;
  retentionDate?: Date;
  archivedAt?: Date;
}

export interface IAiAuditSummary {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  totalActivities: number;
  successCount: number;
  failureCount: number;
  blockedCount: number;
  totalTokens: number;
  totalCost: number;
  suspiciousCount: number;
  firstActivityAt?: Date;
  lastActivityAt: Date;
  periodStart: Date;
  periodEnd: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecordAuditRequest {
  workspaceId: string;
  actorType: AiAuditActorType;
  actorId?: string;
  actorName?: string;
  action: AiAuditAction;
  outcome: AiAuditOutcome;
  capability?: string;
  useCase?: string;
  provider?: string;
  model?: string;
  agentId?: string;
  agentExecutionId?: string;
  workflowId?: string;
  workflowExecutionId?: string;
  jobId?: string;
  jobExecutionId?: string;
  queueJobId?: string;
  orchestratorRequestId?: string;
  correlationId?: string;
  externalReferenceId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  latencyMs?: number;
  validationResult?: string;
  guardrailDecision?: string;
  guardrailReasons?: string[];
  inputReference?: string;
  outputReference?: string;
  errorCode?: string;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface IAiAuditActivityRecordedEvent {
  event: AiAuditEventType.ACTIVITY_RECORDED;
  workspaceId: string;
  auditLogId: string;
  action: AiAuditAction;
  outcome: AiAuditOutcome;
}

export interface IAiAuditSuspiciousActivityEvent {
  event: AiAuditEventType.SUSPICIOUS_ACTIVITY;
  workspaceId: string;
  auditLogId: string;
  reasons: string[];
  actorId?: string;
}

export type AiAuditEvent =
  | IAiAuditActivityRecordedEvent
  | IAiAuditSuspiciousActivityEvent;
