export enum GuardrailStage {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
  TOOL_USE = 'TOOL_USE',
  ACTION = 'ACTION',
}

export enum GuardrailCheckType {
  PATTERN_MATCH = 'PATTERN_MATCH',
  ALLOWLIST = 'ALLOWLIST',
  BLOCKLIST = 'BLOCKLIST',
  ROLE_PERMISSION = 'ROLE_PERMISSION',
  TOOL_PERMISSION = 'TOOL_PERMISSION',
  ACTION_LIMIT = 'ACTION_LIMIT',
}

export enum GuardrailViolationCategory {
  PROMPT_INJECTION = 'PROMPT_INJECTION',
  CREDENTIAL_EXPOSURE = 'CREDENTIAL_EXPOSURE',
  PII_EXPOSURE = 'PII_EXPOSURE',
  FINANCIAL_DATA_EXPOSURE = 'FINANCIAL_DATA_EXPOSURE',
  CUSTOMER_DATA_EXPOSURE = 'CUSTOMER_DATA_EXPOSURE',
  WORKSPACE_DATA_EXPOSURE = 'WORKSPACE_DATA_EXPOSURE',
  DATA_LEAKAGE = 'DATA_LEAKAGE',
  UNSAFE_CONTENT = 'UNSAFE_CONTENT',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  UNSUPPORTED_CLAIM = 'UNSUPPORTED_CLAIM',
  RISKY_AUTOMATION = 'RISKY_AUTOMATION',
  ALLOWLIST_VIOLATION = 'ALLOWLIST_VIOLATION',
  BLOCKLIST_VIOLATION = 'BLOCKLIST_VIOLATION',
  ROLE_PERMISSION_VIOLATION = 'ROLE_PERMISSION_VIOLATION',
  TOOL_PERMISSION_VIOLATION = 'TOOL_PERMISSION_VIOLATION',
  ACTION_LIMIT_EXCEEDED = 'ACTION_LIMIT_EXCEEDED',
  OTHER = 'OTHER',
}

export enum GuardrailSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum GuardrailDecision {
  ALLOW = 'ALLOW',
  WARN = 'WARN',
  REDACT = 'REDACT',
  BLOCK = 'BLOCK',
  REQUIRE_REVIEW = 'REQUIRE_REVIEW',
  RETRY = 'RETRY',
  FALLBACK = 'FALLBACK',
}

export enum GuardrailOverrideScope {
  GLOBAL = 'GLOBAL',
  WORKSPACE = 'WORKSPACE',
  PROVIDER = 'PROVIDER',
  MODEL = 'MODEL',
}

export enum GuardrailIncidentStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum GuardrailApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum GuardrailEvaluationStatus {
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

/** Rank used to resolve the single worst decision across every rule that matched. */
export const GUARDRAIL_DECISION_RANK: Record<GuardrailDecision, number> = {
  [GuardrailDecision.ALLOW]: 0,
  [GuardrailDecision.WARN]: 1,
  [GuardrailDecision.REDACT]: 2,
  [GuardrailDecision.FALLBACK]: 3,
  [GuardrailDecision.RETRY]: 4,
  [GuardrailDecision.REQUIRE_REVIEW]: 5,
  [GuardrailDecision.BLOCK]: 6,
};

/** Rank used to resolve the single worst severity across every rule that matched. */
export const GUARDRAIL_SEVERITY_RANK: Record<GuardrailSeverity, number> = {
  [GuardrailSeverity.INFO]: 0,
  [GuardrailSeverity.LOW]: 1,
  [GuardrailSeverity.MEDIUM]: 2,
  [GuardrailSeverity.HIGH]: 3,
  [GuardrailSeverity.CRITICAL]: 4,
};

export enum AiGuardrailEvent {
  RULE_CREATED = 'ai-guardrails.rule_created',
  RULE_UPDATED = 'ai-guardrails.rule_updated',
  RULE_DELETED = 'ai-guardrails.rule_deleted',
  OVERRIDE_CREATED = 'ai-guardrails.override_created',
  OVERRIDE_UPDATED = 'ai-guardrails.override_updated',
  OVERRIDE_DELETED = 'ai-guardrails.override_deleted',
  EVALUATION_COMPLETED = 'ai-guardrails.evaluation_completed',
  EVALUATION_BLOCKED = 'ai-guardrails.evaluation_blocked',
  EVALUATION_WARNED = 'ai-guardrails.evaluation_warned',
  INCIDENT_REPORTED = 'ai-guardrails.incident_reported',
  INCIDENT_UPDATED = 'ai-guardrails.incident_updated',
  APPROVAL_REQUESTED = 'ai-guardrails.approval_requested',
  APPROVAL_DECIDED = 'ai-guardrails.approval_decided',
}

// ── Entity interfaces (mirror the Prisma models) ────────────────────

export interface IAiGuardrailRule {
  id: string;
  workspaceId?: string | null;
  name: string;
  description?: string | null;
  stage: GuardrailStage;
  category: GuardrailViolationCategory;
  checkType: GuardrailCheckType;
  capability?: string | null;
  useCase?: string | null;
  modelProvider?: string | null;
  enabled: boolean;
  config: unknown;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  riskWeight: number;
  requiresApproval: boolean;
  priority: number;
  stopOnMatch: boolean;
  version: number;
  tags: string[];
  metadata: unknown;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiGuardrailRuleVersion {
  id: string;
  ruleId: string;
  workspaceId?: string | null;
  version: number;
  snapshot: unknown;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IAiGuardrailOverride {
  id: string;
  scope: GuardrailOverrideScope;
  ruleId?: string | null;
  workspaceId?: string | null;
  providerKey?: string | null;
  modelId?: string | null;
  enabledOverride?: boolean | null;
  decisionOverride?: GuardrailDecision | null;
  severityOverride?: GuardrailSeverity | null;
  priority: number;
  reason?: string | null;
  metadata: unknown;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiGuardrailEvaluation {
  id: string;
  workspaceId: string;
  stage: GuardrailStage;
  status: GuardrailEvaluationStatus;
  capability?: string | null;
  useCase?: string | null;
  modelProvider?: string | null;
  modelId?: string | null;
  orchestratorRequestId?: string | null;
  agentExecutionId?: string | null;
  workflowExecutionId?: string | null;
  toolName?: string | null;
  actionName?: string | null;
  userId?: string | null;
  userRole?: string | null;
  contentHash?: string | null;
  contentLength?: number | null;
  riskScore: number;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  reasons: string[];
  matchedRuleCount: number;
  requiresApproval: boolean;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiGuardrailEvaluationResult {
  id: string;
  evaluationId: string;
  workspaceId: string;
  ruleId?: string | null;
  ruleName: string;
  category: GuardrailViolationCategory;
  matched: boolean;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  reason: string;
  matchCount: number;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiGuardrailIncident {
  id: string;
  workspaceId: string;
  evaluationId?: string | null;
  category: GuardrailViolationCategory;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  status: GuardrailIncidentStatus;
  description: string;
  reportedBy?: string | null;
  assignedTo?: string | null;
  resolution?: string | null;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiGuardrailIncidentHistory {
  id: string;
  incidentId: string;
  workspaceId: string;
  action: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  details?: string | null;
  performedBy?: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiGuardrailApproval {
  id: string;
  workspaceId: string;
  evaluationId: string;
  status: GuardrailApprovalStatus;
  stage: GuardrailStage;
  category: GuardrailViolationCategory;
  severity: GuardrailSeverity;
  requestedBy?: string | null;
  decidedBy?: string | null;
  decidedAt?: Date | null;
  reason?: string | null;
  expiresAt?: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiGuardrailApprovalHistory {
  id: string;
  approvalId: string;
  workspaceId: string;
  action: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  details?: string | null;
  performedBy?: string | null;
  metadata: unknown;
  createdAt: Date;
}

// ── Check engine contracts ───────────────────────────────────────────

export interface IGuardrailCheckContext {
  stage: GuardrailStage;
  workspaceId: string;
  /** Raw prompt/response text under evaluation. Never persisted verbatim. */
  content?: string;
  toolName?: string;
  actionName?: string;
  userRole?: string;
  /** Count of actions/tool-calls already performed in the current execution, for ACTION_LIMIT checks. */
  actionCount?: number;
  metadata?: Record<string, unknown>;
}

export interface IGuardrailCheckOutcome {
  matched: boolean;
  reason: string;
  matchCount?: number;
  redactedContent?: string;
}

export interface IGuardrailCheck {
  readonly checkType: GuardrailCheckType;
  evaluate(
    rule: IAiGuardrailRule,
    context: IGuardrailCheckContext,
  ): IGuardrailCheckOutcome | Promise<IGuardrailCheckOutcome>;
}

// ── Evaluate pipeline contracts ──────────────────────────────────────

export interface IGuardrailRuleMatch {
  rule: IAiGuardrailRule;
  outcome: IGuardrailCheckOutcome;
  effectiveSeverity: GuardrailSeverity;
  effectiveDecision: GuardrailDecision;
}

export interface IGuardrailEvaluationOutcome {
  evaluationId: string;
  stage: GuardrailStage;
  riskScore: number;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  reasons: string[];
  matchedRuleCount: number;
  requiresApproval: boolean;
  approvalId?: string;
  incidentId?: string;
  redactedContent?: string;
}

export interface IGuardrailEventPayload {
  event: AiGuardrailEvent;
  workspaceId: string;
  ruleId?: string;
  overrideId?: string;
  evaluationId?: string;
  incidentId?: string;
  approvalId?: string;
  decision?: GuardrailDecision;
  severity?: GuardrailSeverity;
  metadata?: Record<string, unknown>;
}
