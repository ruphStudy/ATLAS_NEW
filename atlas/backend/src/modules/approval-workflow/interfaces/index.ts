export enum ApprovalWorkflowMode {
  SINGLE_LEVEL = 'SINGLE_LEVEL',
  MULTI_LEVEL = 'MULTI_LEVEL',
  SEQUENTIAL = 'SEQUENTIAL',
  PARALLEL = 'PARALLEL',
  CONDITIONAL = 'CONDITIONAL',
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
  DELEGATE = 'DELEGATE',
  REASSIGN = 'REASSIGN',
  CANCEL = 'CANCEL',
  RECALL = 'RECALL',
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
}

/** A single step in a workflow definition's `steps` Json — interpreted only by the generic engine, never owning-module-specific. */
export interface IApprovalStepConfig {
  stepOrder: number;
  name: string;
  approverType: ApproverType;
  /** One entry per eligible approver reference — a userId, a role key, or a team id, depending on `approverType`. */
  approverRefs: string[];
  /** N-of-M approvals required to satisfy this step (defaults to 1). */
  requiredApprovals?: number;
  /** Only evaluated when the definition's `mode` is CONDITIONAL — skips this step if the request doesn't match. */
  condition?: IApprovalCondition;
  slaHours?: number;
}

export interface IApprovalCondition {
  field: 'amount' | 'riskLevel' | 'entityType';
  operator: 'eq' | 'neq' | 'gte' | 'lte' | 'in';
  value: unknown;
}

export interface IApprovalMatchCriteria {
  entityTypes?: string[];
  minAmount?: number;
  maxAmount?: number;
  riskLevels?: string[];
}

export interface IApprovalEscalationConfig {
  afterHours: number;
  escalateToRoleKeys?: string[];
  escalateToUserIds?: string[];
}

export interface IApprovalWorkflowDefinition {
  id: string;
  workspaceId: string;
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
  definitionId: string;
  definitionVersion: number;
  module: string;
  entityType: string;
  entityId: string;
  requestedBy?: string | null;
  title: string;
  amount?: number | null;
  riskLevel?: string | null;
  currentStepIndex: number;
  status: ApprovalRequestStatus;
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
  metadata?: unknown;
  createdAt: Date;
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
