export enum ApprovalWorkflowMode {
  SINGLE_LEVEL = 'SINGLE_LEVEL',
  MULTI_LEVEL = 'MULTI_LEVEL',
  SEQUENTIAL = 'SEQUENTIAL',
  PARALLEL = 'PARALLEL',
  CONDITIONAL = 'CONDITIONAL',
  /** All steps activate together (like PARALLEL) but each step's own `condition` is evaluated independently, so only the matrix cells relevant to this request end up active — a grid of approver-by-criteria rather than a single linear/parallel chain. */
  MATRIX = 'MATRIX',
}

/** How many of a step's PENDING assignments must approve before the step is satisfied. QUORUM uses `requiredApprovals` verbatim; ANY_ONE, MAJORITY and UNANIMOUS are computed dynamically off the step's total assignment count. */
export enum ApprovalStrategy {
  QUORUM = 'QUORUM',
  ANY_ONE = 'ANY_ONE',
  MAJORITY = 'MAJORITY',
  UNANIMOUS = 'UNANIMOUS',
}

export enum ApprovalWorkflowStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export enum ApproverType {
  USER = 'USER',
  ROLE = 'ROLE',
  TEAM = 'TEAM',
  BUSINESS_UNIT = 'BUSINESS_UNIT',
}

export enum ApprovalRequestStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  CANCELLED = 'CANCELLED',
  RECALLED = 'RECALLED',
  EXPIRED = 'EXPIRED',
}

export enum ApprovalStepStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  SKIPPED = 'SKIPPED',
  ESCALATED = 'ESCALATED',
  EXPIRED = 'EXPIRED',
}

export enum ApprovalAssignmentStatus {
  PENDING = 'PENDING',
  ACTED = 'ACTED',
  DELEGATED = 'DELEGATED',
  REASSIGNED = 'REASSIGNED',
  EXPIRED = 'EXPIRED',
}

export enum ApprovalDecisionAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_CHANGES = 'REQUEST_CHANGES',
  DEFER = 'DEFER',
  DELEGATE = 'DELEGATE',
  REASSIGN = 'REASSIGN',
  CANCEL = 'CANCEL',
  RECALL = 'RECALL',
  OVERRIDE = 'OVERRIDE',
}

export enum ApprovalWorkflowEvent {
  DEFINITION_CREATED = 'approval-workflow.definition_created',
  DEFINITION_UPDATED = 'approval-workflow.definition_updated',
  DEFINITION_PUBLISHED = 'approval-workflow.definition_published',
  DEFINITION_PAUSED = 'approval-workflow.definition_paused',
  DEFINITION_ARCHIVED = 'approval-workflow.definition_archived',
  DEFINITION_RESTORED = 'approval-workflow.definition_restored',
  REQUEST_CREATED = 'approval-workflow.request_created',
  REQUEST_STEP_ACTIVATED = 'approval-workflow.step_activated',
  REQUEST_APPROVED = 'approval-workflow.request_approved',
  REQUEST_REJECTED = 'approval-workflow.request_rejected',
  REQUEST_CHANGES_REQUESTED = 'approval-workflow.request_changes_requested',
  REQUEST_RESUBMITTED = 'approval-workflow.request_resubmitted',
  REQUEST_CANCELLED = 'approval-workflow.request_cancelled',
  REQUEST_RECALLED = 'approval-workflow.request_recalled',
  REQUEST_EXPIRED = 'approval-workflow.request_expired',
  ASSIGNMENT_DELEGATED = 'approval-workflow.assignment_delegated',
  ASSIGNMENT_REASSIGNED = 'approval-workflow.assignment_reassigned',
  STEP_ESCALATED = 'approval-workflow.step_escalated',
  REMINDER_DUE = 'approval-workflow.reminder_due',
  REQUEST_DEFERRED = 'approval-workflow.request_deferred',
  REQUEST_OVERRIDDEN = 'approval-workflow.request_overridden',
}

/** A single step in a workflow definition's `steps` Json — interpreted only by the generic engine, never owning-module-specific. */
export interface IApprovalStepConfig {
  stepOrder: number;
  name: string;
  approverType: ApproverType;
  /** One entry per eligible approver reference — a userId, a role key, a team id, or a business-unit id, depending on `approverType`. */
  approverRefs: string[];
  /** N-of-M approvals required to satisfy this step (defaults to 1) — only consulted when `strategy` is QUORUM or unset. */
  requiredApprovals?: number;
  /** ANY_ONE/MAJORITY/UNANIMOUS compute the effective threshold off the step's total assignment count; defaults to QUORUM (the pre-existing `requiredApprovals` behavior). */
  strategy?: ApprovalStrategy;
  /** Only evaluated when the definition's `mode` is CONDITIONAL or MATRIX — skips this step if the request doesn't match. */
  condition?: IApprovalCondition;
  slaHours?: number;
}

export interface IApprovalCondition {
  field: 'amount' | 'riskLevel' | 'entityType' | 'countryCode' | 'marketplaceKey';
  operator: 'eq' | 'neq' | 'gte' | 'lte' | 'in';
  value: unknown;
}

export interface IApprovalMatchCriteria {
  entityTypes?: string[];
  minAmount?: number;
  maxAmount?: number;
  riskLevels?: string[];
  countryCodes?: string[];
  marketplaceKeys?: string[];
  businessUnitIds?: string[];
}

export interface IApprovalEscalationConfig {
  afterHours: number;
  escalateToRoleKeys?: string[];
  escalateToUserIds?: string[];
}

export interface IApprovalWorkflowDefinition {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  businessId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  module: string;
  entityType?: string | null;
  mode: ApprovalWorkflowMode;
  steps: IApprovalStepConfig[];
  matchCriteria?: IApprovalMatchCriteria | null;
  slaHours?: number | null;
  escalation?: IApprovalEscalationConfig | null;
  isTemplate: boolean;
  templateKey?: string | null;
  version: number;
  status: ApprovalWorkflowStatus;
  createdBy?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IApprovalWorkflowDefinitionHistory {
  id: string;
  definitionId: string;
  workspaceId: string;
  fromStatus?: ApprovalWorkflowStatus | null;
  toStatus: ApprovalWorkflowStatus;
  version: number;
  changeReason?: string | null;
  changedBy?: string | null;
  snapshot: unknown;
  createdAt: Date;
}

export interface IApprovalRequest {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  businessId?: string | null;
  definitionId: string;
  definitionVersion: number;
  module: string;
  entityType: string;
  entityId: string;
  requestedBy?: string | null;
  title: string;
  amount?: number | null;
  riskLevel?: string | null;
  countryCode?: string | null;
  marketplaceKey?: string | null;
  currentStepIndex: number;
  status: ApprovalRequestStatus;
  /** Set when this request was started as a step of an Enterprise Workflow Engine execution — used to resume/terminate that workflow after the final decision. */
  sourceWorkflowExecutionId?: string | null;
  sourceWorkflowStepExecutionId?: string | null;
  metadata: unknown;
  slaDueAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
  deletedAt?: Date | null;
}

export interface IApprovalStepInstance {
  id: string;
  requestId: string;
  workspaceId: string;
  stepIndex: number;
  name: string;
  status: ApprovalStepStatus;
  strategy: ApprovalStrategy;
  requiredApprovals: number;
  receivedApprovals: number;
  dueAt?: Date | null;
  escalatedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApprovalAssignment {
  id: string;
  stepInstanceId: string;
  requestId: string;
  workspaceId: string;
  approverType: ApproverType;
  approverRef: string;
  status: ApprovalAssignmentStatus;
  delegatedToUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApprovalDecision {
  id: string;
  requestId: string;
  stepInstanceId?: string | null;
  workspaceId: string;
  decidedBy: string;
  action: ApprovalDecisionAction;
  comment?: string | null;
  delegatedToUserId?: string | null;
  reassignedToUserId?: string | null;
  evidence?: unknown;
  sourceReference?: unknown;
  idempotencyKey?: string | null;
  metadata?: unknown;
  createdAt: Date;
}

/** A standing substitute-approver mapping — distinct from an ad-hoc per-decision DELEGATE action. */
export interface IApprovalSubstitute {
  id: string;
  workspaceId: string;
  approverType: ApproverType;
  approverRef: string;
  substituteUserId: string;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  reason?: string | null;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApprovalWorkflowEventPayload {
  event: ApprovalWorkflowEvent;
  workspaceId: string;
  definitionId?: string;
  requestId?: string;
  stepInstanceId?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  status?: ApprovalRequestStatus;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
