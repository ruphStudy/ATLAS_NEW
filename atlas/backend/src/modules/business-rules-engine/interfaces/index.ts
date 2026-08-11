export enum RuleScope {
  GLOBAL = 'GLOBAL',
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
}

export enum RuleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum RuleTriggerType {
  API = 'API',
  EVENT = 'EVENT',
  SCHEDULE = 'SCHEDULE',
  WORKFLOW = 'WORKFLOW',
}

export enum RuleLogicOperator {
  AND = 'AND',
  OR = 'OR',
}

export enum RuleConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  BETWEEN = 'BETWEEN',
  EXISTS = 'EXISTS',
  NOT_EXISTS = 'NOT_EXISTS',
}

export enum RuleActionType {
  NOTIFY = 'NOTIFY',
  CREATE_TASK = 'CREATE_TASK',
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
  UPDATE_STATUS = 'UPDATE_STATUS',
  BLOCK_ACTION = 'BLOCK_ACTION',
  ROUTE_WORKFLOW = 'ROUTE_WORKFLOW',
  EMIT_EVENT = 'EMIT_EVENT',
}

export enum RuleExecutionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  BLOCKED = 'BLOCKED',
}

export enum RuleManagementEvent {
  RULE_CREATED = 'business-rules-engine.rule_created',
  RULE_UPDATED = 'business-rules-engine.rule_updated',
  RULE_PUBLISHED = 'business-rules-engine.rule_published',
  RULE_ENABLED = 'business-rules-engine.rule_enabled',
  RULE_DISABLED = 'business-rules-engine.rule_disabled',
  RULE_ARCHIVED = 'business-rules-engine.rule_archived',
  RULE_RESTORED = 'business-rules-engine.rule_restored',
  RULE_ROLLED_BACK = 'business-rules-engine.rule_rolled_back',
  RULE_EXECUTED = 'business-rules-engine.rule_executed',
  RULE_EXECUTION_FAILED = 'business-rules-engine.rule_execution_failed',
}

/** A single leaf condition — `field` is a dot-path into the evaluation input (e.g. "order.total"). */
export interface IRuleCondition {
  field: string;
  operator: RuleConditionOperator;
  value?: unknown;
}

/** A group of conditions/nested groups combined with AND/OR logic — the tree stored in `RuleDefinition.conditions`. */
export interface IRuleConditionGroup {
  logic: RuleLogicOperator;
  conditions?: IRuleCondition[];
  groups?: IRuleConditionGroup[];
}

export interface IRuleAction {
  type: RuleActionType | string;
  config: Record<string, unknown>;
}

export interface IRule {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scopeKey: string;
  scope: RuleScope;
  module: string;
  key: string;
  name: string;
  description?: string | null;
  triggerType: RuleTriggerType;
  triggerRef?: string | null;
  conditions: IRuleConditionGroup;
  actions: IRuleAction[];
  priority: number;
  executionOrder: number;
  stopOnMatch: boolean;
  isSystem: boolean;
  scheduleIntervalMinutes?: number | null;
  nextRunAt?: Date | null;
  version: number;
  status: RuleStatus;
  publishedAt?: Date | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
  deletedAt?: Date | null;
}

export interface IRuleHistory {
  id: string;
  ruleId: string;
  workspaceId?: string | null;
  fromStatus?: RuleStatus | null;
  toStatus: RuleStatus;
  version: number;
  changeReason?: string | null;
  changedBy?: string | null;
  snapshot: unknown;
  createdAt: Date;
}

export interface IRuleExecution {
  id: string;
  ruleId: string;
  ruleVersion: number;
  workspaceId?: string | null;
  module: string;
  triggerType: RuleTriggerType;
  triggerRef?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  status: RuleExecutionStatus;
  matched: boolean;
  input: unknown;
  actionsExecuted?: unknown;
  errorMessage?: string | null;
  idempotencyKey?: string | null;
  durationMs?: number | null;
  executedBy?: string | null;
  createdAt: Date;
}

export interface IRuleValidationIssue {
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
}

/** The context a caller (controller for API, an event worker for events, a workflow step, a scheduled job) provides to `evaluate()`. */
export interface IRuleEvaluationContext {
  workspaceId: string;
  organizationId?: string;
  module: string;
  triggerType: RuleTriggerType;
  triggerRef?: string;
  entityType?: string;
  entityId?: string;
  input: Record<string, unknown>;
  idempotencyKey?: string;
  userId?: string;
}

export interface IRuleActionExecutionResult {
  type: RuleActionType | string;
  status: 'EXECUTED' | 'SKIPPED' | 'FAILED';
  result?: unknown;
  error?: string;
}

export interface IRuleMatchResult {
  ruleId: string;
  ruleKey: string;
  ruleVersion: number;
  matched: boolean;
  blocked: boolean;
  blockReason?: string;
  actionsExecuted: IRuleActionExecutionResult[];
  executionId?: string;
  idempotentReplay?: boolean;
}

export interface IRuleEvaluationResult {
  matched: boolean;
  blocked: boolean;
  blockReason?: string;
  results: IRuleMatchResult[];
}

export interface IRuleSimulationResult {
  matched: boolean;
  matchedConditions: unknown;
  wouldExecuteActions: IRuleAction[];
  validation: IRuleValidationIssue[];
}

/** The context passed to a registered `IRuleActionHandler` at execution time. */
export interface IRuleActionHandlerContext {
  rule: IRule;
  evaluation: IRuleEvaluationContext;
  action: IRuleAction;
}

/**
 * Contract for a pluggable rule action handler. The core engine ships
 * built-in handlers only for actions that are themselves thin wrappers over
 * already-generic modules (notify, create task, require approval, emit
 * event) — anything module-specific (e.g. `UPDATE_STATUS`, `ROUTE_WORKFLOW`,
 * or a custom action type) must be registered by the owning module via
 * `RuleActionRegistryService.register()`, so the core engine never embeds
 * module-specific business logic.
 */
export interface IRuleActionHandler {
  readonly actionType: RuleActionType | string;
  execute(context: IRuleActionHandlerContext): Promise<unknown>;
}

export interface IRuleManagementEventPayload {
  event: RuleManagementEvent;
  workspaceId?: string;
  ruleId?: string;
  executionId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
