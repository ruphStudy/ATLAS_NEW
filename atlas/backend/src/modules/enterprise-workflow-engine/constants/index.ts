import { WorkflowDefinitionStatus, WorkflowExecutionStatus, WorkflowStepStatus } from '../interfaces';

export const WORKFLOW_ENGINE_MODULE = 'enterprise-workflow-engine';

/** Fallback actor id for system/event/schedule-triggered executions where no human user initiated them. Not a real user record. */
export const SYSTEM_ACTOR_ID = 'system';

export const WORKFLOW_ENGINE_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_STEP_TIMEOUT_MS: 300_000, // 5 min
  DEFAULT_RETRY_BACKOFF_MS: 2_000,

  MAX_LOOP_ITERATIONS: 1_000,
  MAX_CHECKPOINT_HISTORY: 500,

  ALLOWED_DEFINITION_TRANSITIONS: {
    [WorkflowDefinitionStatus.DRAFT]: [WorkflowDefinitionStatus.PUBLISHED, WorkflowDefinitionStatus.ARCHIVED],
    [WorkflowDefinitionStatus.PUBLISHED]: [WorkflowDefinitionStatus.PAUSED, WorkflowDefinitionStatus.DEPRECATED, WorkflowDefinitionStatus.ARCHIVED],
    [WorkflowDefinitionStatus.PAUSED]: [WorkflowDefinitionStatus.PUBLISHED, WorkflowDefinitionStatus.ARCHIVED],
    [WorkflowDefinitionStatus.DEPRECATED]: [WorkflowDefinitionStatus.ARCHIVED],
    [WorkflowDefinitionStatus.ARCHIVED]: [WorkflowDefinitionStatus.DRAFT],
  } as Record<WorkflowDefinitionStatus, WorkflowDefinitionStatus[]>,

  /** Statuses in which a definition can still be mutated in place; anything else creates a new version instead. */
  MUTABLE_DEFINITION_STATUSES: new Set<WorkflowDefinitionStatus>([WorkflowDefinitionStatus.DRAFT]),

  ALLOWED_EXECUTION_TRANSITIONS: {
    [WorkflowExecutionStatus.PENDING]: [WorkflowExecutionStatus.RUNNING, WorkflowExecutionStatus.CANCELLED],
    [WorkflowExecutionStatus.RUNNING]: [
      WorkflowExecutionStatus.WAITING,
      WorkflowExecutionStatus.PAUSED,
      WorkflowExecutionStatus.COMPLETED,
      WorkflowExecutionStatus.FAILED,
      WorkflowExecutionStatus.CANCELLED,
      WorkflowExecutionStatus.TIMEOUT,
    ],
    [WorkflowExecutionStatus.WAITING]: [
      WorkflowExecutionStatus.RUNNING,
      WorkflowExecutionStatus.PAUSED,
      WorkflowExecutionStatus.FAILED,
      WorkflowExecutionStatus.CANCELLED,
      WorkflowExecutionStatus.TIMEOUT,
    ],
    [WorkflowExecutionStatus.PAUSED]: [WorkflowExecutionStatus.RUNNING, WorkflowExecutionStatus.WAITING, WorkflowExecutionStatus.CANCELLED],
    [WorkflowExecutionStatus.COMPENSATING]: [WorkflowExecutionStatus.FAILED, WorkflowExecutionStatus.CANCELLED],
    [WorkflowExecutionStatus.COMPLETED]: [],
    [WorkflowExecutionStatus.FAILED]: [WorkflowExecutionStatus.COMPENSATING],
    [WorkflowExecutionStatus.CANCELLED]: [],
    [WorkflowExecutionStatus.TIMEOUT]: [WorkflowExecutionStatus.COMPENSATING],
  } as Record<WorkflowExecutionStatus, WorkflowExecutionStatus[]>,

  ACTIVE_EXECUTION_STATUSES: new Set<WorkflowExecutionStatus>([
    WorkflowExecutionStatus.PENDING,
    WorkflowExecutionStatus.RUNNING,
    WorkflowExecutionStatus.WAITING,
    WorkflowExecutionStatus.PAUSED,
    WorkflowExecutionStatus.COMPENSATING,
  ]),

  WAITING_STEP_STATUSES: new Set<WorkflowStepStatus>([WorkflowStepStatus.WAITING]),

  DEFINITION_SORT_FIELDS: ['createdAt', 'updatedAt', 'name', 'key', 'version', 'status'] as const,
  EXECUTION_SORT_FIELDS: ['createdAt', 'startTime', 'endTime', 'status'] as const,
} as const;
