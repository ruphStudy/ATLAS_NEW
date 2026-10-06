export enum AiWorkflowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

export enum AiWorkflowExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
  TIMEOUT = 'TIMEOUT',
  COMPENSATING = 'COMPENSATING',
}

export enum AiWorkflowTriggerType {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  EVENT = 'EVENT',
  API = 'API',
}

export enum AiWorkflowStepType {
  AGENT = 'AGENT',
  ORCHESTRATOR = 'ORCHESTRATOR',
  PROMPT = 'PROMPT',
  CONDITION = 'CONDITION',
  LOOP = 'LOOP',
  PARALLEL = 'PARALLEL',
  WAIT = 'WAIT',
  WEBHOOK = 'WEBHOOK',
  COMPENSATION = 'COMPENSATION',
}

export enum AiWorkflowEvent {
  WORKFLOW_CREATED = 'ai-workflow.created',
  WORKFLOW_UPDATED = 'ai-workflow.updated',
  WORKFLOW_PUBLISHED = 'ai-workflow.published',
  WORKFLOW_PAUSED = 'ai-workflow.paused',
  WORKFLOW_RESUMED = 'ai-workflow.resumed',
  WORKFLOW_ARCHIVED = 'ai-workflow.archived',
  EXECUTION_STARTED = 'ai-workflow.execution_started',
  EXECUTION_STEP_STARTED = 'ai-workflow.execution_step_started',
  EXECUTION_STEP_COMPLETED = 'ai-workflow.execution_step_completed',
  EXECUTION_STEP_FAILED = 'ai-workflow.execution_step_failed',
  EXECUTION_COMPLETED = 'ai-workflow.execution_completed',
  EXECUTION_FAILED = 'ai-workflow.execution_failed',
  EXECUTION_CANCELLED = 'ai-workflow.execution_cancelled',
  EXECUTION_PAUSED = 'ai-workflow.execution_paused',
  EXECUTION_RESUMED = 'ai-workflow.execution_resumed',
  COMPENSATION_EXECUTED = 'ai-workflow.compensation_executed',
}

export interface IAiWorkflow {
  id: string;
  workspaceId: string;
  key: string;
  name: string;
  description?: string | null;
  version: number;
  status: AiWorkflowStatus;
  triggerType: AiWorkflowTriggerType;
  triggerConfig?: unknown | null;
  steps: unknown;
  inputSchema?: unknown | null;
  outputSchema?: unknown | null;
  variables?: unknown | null;
  timeout?: number | null;
  maxRetries: number;
  retryStrategy?: unknown | null;
  fallbackWorkflowId?: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiWorkflowExecution {
  id: string;
  workspaceId: string;
  workflowId: string;
  version: number;
  triggerType: AiWorkflowTriggerType;
  triggeredBy?: string | null;
  input?: unknown | null;
  output?: unknown | null;
  status: AiWorkflowExecutionStatus;
  currentStepIndex?: number | null;
  currentStepId?: string | null;
  variables?: unknown | null;
  context?: unknown | null;
  startTime: Date;
  endTime?: Date | null;
  attemptNumber: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  compensationExecuted: boolean;
  totalCost?: number | null;
  totalTokens?: number | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiWorkflowStepExecution {
  id: string;
  executionId: string;
  workspaceId: string;
  stepId: string;
  stepIndex: number;
  stepType: AiWorkflowStepType;
  input?: unknown | null;
  output?: unknown | null;
  status: string;
  startTime: Date;
  endTime?: Date | null;
  attemptNumber: number;
  agentExecutionId?: string | null;
  orchestratorRequestId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  cost?: number | null;
  tokens?: number | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface IAiWorkflowSchedule {
  id: string;
  workspaceId: string;
  workflowId: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  lastExecutionAt?: Date | null;
  nextExecutionAt?: Date | null;
  input?: unknown | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IWorkflowStep {
  id: string;
  type: AiWorkflowStepType;
  name: string;
  config: Record<string, unknown>;
  condition?: string;
  onSuccess?: string[];
  onFailure?: string[];
  retries?: number;
  timeout?: number;
  compensation?: IWorkflowStep;
}

export interface IWorkflowEventPayload {
  event: AiWorkflowEvent;
  workspaceId: string;
  workflowId?: string;
  executionId?: string;
  stepId?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface IExecutionResult {
  executionId: string;
  status: AiWorkflowExecutionStatus;
  output?: unknown;
  totalCost: number;
  totalTokens: number;
  duration: number;
  stepsCompleted: number;
  metadata: Record<string, unknown>;
}
