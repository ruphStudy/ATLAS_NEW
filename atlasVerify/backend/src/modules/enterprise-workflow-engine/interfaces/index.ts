import { IRuleConditionGroup } from '../../business-rules-engine/interfaces';

// =============================================================
// Enterprise Workflow Engine – Core Interfaces & Enums
//
// A generic, configuration-driven workflow engine reusable across every
// ATLAS module. Step definitions are plain JSON (type/config/condition/
// onSuccess/onFailure/retries/timeout/compensation) — the engine itself
// never embeds business logic. Steps whose type maps onto an already-
// generic module (Task Management, Approval Workflow, Notification
// Center, Business Rules Engine, AI Workflow Engine) run through a
// built-in `IWorkflowStepExecutor`; anything module-specific must be
// registered by the owning module via `WorkflowStepExecutorRegistry`,
// mirroring `RuleActionRegistryService` in Business Rules Engine.
// =============================================================

// ── Definition lifecycle ──────────────────────────────────────

export enum WorkflowDefinitionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAUSED = 'PAUSED',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

export enum WorkflowKind {
  SEQUENTIAL = 'SEQUENTIAL',
  PARALLEL = 'PARALLEL',
  CONDITIONAL = 'CONDITIONAL',
  EVENT_DRIVEN = 'EVENT_DRIVEN',
  HUMAN_IN_THE_LOOP = 'HUMAN_IN_THE_LOOP',
}

export enum WorkflowTriggerType {
  API = 'API',
  EVENT = 'EVENT',
  SCHEDULE = 'SCHEDULE',
  APPROVAL = 'APPROVAL',
  RULE = 'RULE',
  AI_DECISION = 'AI_DECISION',
  MANUAL = 'MANUAL',
}

// ── Execution lifecycle ───────────────────────────────────────

export enum WorkflowExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  WAITING = 'WAITING',
  PAUSED = 'PAUSED',
  COMPENSATING = 'COMPENSATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
}

export enum WorkflowStepStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  WAITING = 'WAITING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  COMPENSATED = 'COMPENSATED',
  CANCELLED = 'CANCELLED',
}

// ── Step types ────────────────────────────────────────────────

/**
 * Built-in step types the engine ships an `IWorkflowStepExecutor` for —
 * each a thin wrapper over an already-generic module. `CONDITION`,
 * `PARALLEL`, `LOOP`, `TIMER` and `SUB_WORKFLOW` are control-flow,
 * handled by the engine itself rather than dispatched to the registry.
 * Any other string is treated as a custom type that must be registered
 * via `WorkflowStepExecutorRegistry.register()` by the owning module.
 */
export enum WorkflowStepType {
  TASK = 'TASK',
  APPROVAL = 'APPROVAL',
  NOTIFICATION = 'NOTIFICATION',
  RULE_EVALUATION = 'RULE_EVALUATION',
  AI_WORKFLOW = 'AI_WORKFLOW',
  BUSINESS_ACTION = 'BUSINESS_ACTION',
  EXTERNAL_INTEGRATION = 'EXTERNAL_INTEGRATION',
  CONDITION = 'CONDITION',
  PARALLEL = 'PARALLEL',
  LOOP = 'LOOP',
  TIMER = 'TIMER',
  SUB_WORKFLOW = 'SUB_WORKFLOW',
}

/** Handled directly by the execution engine (never dispatched through `WorkflowStepExecutorRegistry`). CONDITION and TIMER have built-in registered executors instead — see `executors/`. */
export const CONTROL_FLOW_STEP_TYPES: string[] = [
  WorkflowStepType.PARALLEL,
  WorkflowStepType.LOOP,
  WorkflowStepType.SUB_WORKFLOW,
];

// ── Events ────────────────────────────────────────────────────

export enum WorkflowEngineEvent {
  DEFINITION_CREATED = 'workflow-engine.definition_created',
  DEFINITION_UPDATED = 'workflow-engine.definition_updated',
  DEFINITION_PUBLISHED = 'workflow-engine.definition_published',
  DEFINITION_PAUSED = 'workflow-engine.definition_paused',
  DEFINITION_RESUMED = 'workflow-engine.definition_resumed',
  DEFINITION_ARCHIVED = 'workflow-engine.definition_archived',
  DEFINITION_RESTORED = 'workflow-engine.definition_restored',
  EXECUTION_STARTED = 'workflow-engine.execution_started',
  EXECUTION_STEP_STARTED = 'workflow-engine.execution_step_started',
  EXECUTION_STEP_COMPLETED = 'workflow-engine.execution_step_completed',
  EXECUTION_STEP_FAILED = 'workflow-engine.execution_step_failed',
  EXECUTION_STEP_WAITING = 'workflow-engine.execution_step_waiting',
  EXECUTION_STEP_ESCALATED = 'workflow-engine.execution_step_escalated',
  EXECUTION_COMPLETED = 'workflow-engine.execution_completed',
  EXECUTION_FAILED = 'workflow-engine.execution_failed',
  EXECUTION_CANCELLED = 'workflow-engine.execution_cancelled',
  EXECUTION_PAUSED = 'workflow-engine.execution_paused',
  EXECUTION_RESUMED = 'workflow-engine.execution_resumed',
  EXECUTION_COMPENSATED = 'workflow-engine.execution_compensated',
  EXECUTION_TIMEOUT = 'workflow-engine.execution_timeout',
}

// ── Step definition (stored as JSON on WorkflowDefinition.stages) ──

export interface IWorkflowStepDefinition {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  /** Evaluated with `evaluateConditionGroup` (Business Rules Engine) against the execution's current variables; skipped when false. */
  condition?: IRuleConditionGroup;
  onSuccess?: string[];
  onFailure?: string[];
  retries?: number;
  timeoutMs?: number;
  slaMs?: number;
  assigneeRef?: string;
  requiredPermission?: { module: string; resource: string; action: string };
  compensation?: IWorkflowStepDefinition;
}

export interface IWorkflowStageDefinition {
  id: string;
  name: string;
  parallel?: boolean;
  steps: IWorkflowStepDefinition[];
}

// ── Core entities ─────────────────────────────────────────────

export interface IWorkflowDefinition {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  businessId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  version: number;
  status: WorkflowDefinitionStatus;
  workflowKind: WorkflowKind;
  triggerType: WorkflowTriggerType;
  triggerConfig: Record<string, unknown>;
  stages: IWorkflowStageDefinition[];
  variables: Record<string, unknown>;
  slaMs?: number | null;
  escalationConfig?: Record<string, unknown> | null;
  maxRetries: number;
  timeoutMs?: number | null;
  isTemplate: boolean;
  templateKey?: string | null;
  supersedesId?: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IWorkflowDefinitionHistory {
  id: string;
  definitionId: string;
  version: number;
  status: WorkflowDefinitionStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IWorkflowExecution {
  id: string;
  workspaceId: string;
  organizationId?: string | null;
  businessId?: string | null;
  definitionId: string;
  definitionVersion: number;
  status: WorkflowExecutionStatus;
  triggerType: WorkflowTriggerType;
  triggeredBy?: string | null;
  idempotencyKey?: string | null;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  variables: Record<string, unknown>;
  context: Record<string, unknown>;
  currentStageIndex?: number | null;
  currentStepId?: string | null;
  startTime: Date;
  endTime?: Date | null;
  attemptNumber: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  compensationExecuted: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkflowStepExecution {
  id: string;
  executionId: string;
  workspaceId: string;
  stageId: string;
  stepId: string;
  stepIndex: number;
  stepType: string;
  status: WorkflowStepStatus;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  startTime: Date;
  endTime?: Date | null;
  attemptNumber: number;
  dueAt?: Date | null;
  escalatedAt?: Date | null;
  assignedTo?: string | null;
  externalRef?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkflowCheckpoint {
  id: string;
  executionId: string;
  workspaceId: string;
  stepId: string;
  sequence: number;
  variables: Record<string, unknown>;
  context: Record<string, unknown>;
  createdAt: Date;
}

// ── Step executor contract ───────────────────────────────────

export interface IStepExecutionContext {
  definition: IWorkflowDefinition;
  execution: IWorkflowExecution;
  step: IWorkflowStepDefinition;
  stageId: string;
  stepIndex: number;
  workspaceId: string;
  businessId?: string | null;
  userId?: string | null;
}

export interface IStepExecutionResult {
  status: WorkflowStepStatus;
  output?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  /** Set by human-in-the-loop / async steps (TASK, APPROVAL) — the id of the entity the step is waiting on. */
  externalRef?: string;
}

export interface IWorkflowStepExecutor {
  readonly stepType: string;
  execute(ctx: IStepExecutionContext): Promise<IStepExecutionResult>;
}

// ── Filters ───────────────────────────────────────────────────

export interface IWorkflowDefinitionFilterOptions {
  key?: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  businessId?: string | null;
  status?: WorkflowDefinitionStatus;
  workflowKind?: WorkflowKind;
  isTemplate?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IWorkflowExecutionFilterOptions {
  workspaceId: string;
  definitionId?: string;
  status?: WorkflowExecutionStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Event payload ─────────────────────────────────────────────

export interface IWorkflowEventPayload {
  event: WorkflowEngineEvent;
  workspaceId: string;
  definitionId?: string;
  executionId?: string;
  stepExecutionId?: string;
  stepId?: string;
  status?: string;
  performedBy?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
