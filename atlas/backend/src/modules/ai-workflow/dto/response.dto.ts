import {
  IAiWorkflow,
  IAiWorkflowExecution,
  IAiWorkflowStepExecution,
  IAiWorkflowSchedule,
  AiWorkflowStatus,
  AiWorkflowExecutionStatus,
  AiWorkflowTriggerType,
  AiWorkflowStepType,
} from '../interfaces';

export class AiWorkflowResponseDto implements IAiWorkflow {
  id!: string;
  workspaceId!: string;
  key!: string;
  name!: string;
  description?: string | null;
  version!: number;
  status!: AiWorkflowStatus;
  triggerType!: AiWorkflowTriggerType;
  triggerConfig?: unknown | null;
  steps: unknown;
  inputSchema?: unknown | null;
  outputSchema?: unknown | null;
  variables?: unknown | null;
  timeout?: number | null;
  maxRetries!: number;
  retryStrategy?: unknown | null;
  fallbackWorkflowId?: string | null;
  tags!: string[];
  metadata!: Record<string, unknown>;
  publishedAt?: Date | null;
  publishedBy?: string | null;
  createdBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;
}

export class PaginatedAiWorkflowResponseDto {
  data!: AiWorkflowResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class WorkflowExecutionResponseDto implements IAiWorkflowExecution {
  id!: string;
  workspaceId!: string;
  workflowId!: string;
  version!: number;
  triggerType!: AiWorkflowTriggerType;
  triggeredBy?: string | null;
  input?: unknown | null;
  output?: unknown | null;
  status!: AiWorkflowExecutionStatus;
  currentStepIndex?: number | null;
  currentStepId?: string | null;
  variables?: unknown | null;
  context?: unknown | null;
  startTime!: Date;
  endTime?: Date | null;
  attemptNumber!: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  compensationExecuted!: boolean;
  totalCost?: number | null;
  totalTokens?: number | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedExecutionResponseDto {
  data!: WorkflowExecutionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class WorkflowStepExecutionResponseDto implements IAiWorkflowStepExecution {
  id!: string;
  executionId!: string;
  workspaceId!: string;
  stepId!: string;
  stepIndex!: number;
  stepType!: AiWorkflowStepType;
  input?: unknown | null;
  output?: unknown | null;
  status!: string;
  startTime!: Date;
  endTime?: Date | null;
  attemptNumber!: number;
  agentExecutionId?: string | null;
  orchestratorRequestId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  cost?: number | null;
  tokens?: number | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
}

export class WorkflowScheduleResponseDto implements IAiWorkflowSchedule {
  id!: string;
  workspaceId!: string;
  workflowId!: string;
  cronExpression!: string;
  timezone!: string;
  enabled!: boolean;
  lastExecutionAt?: Date | null;
  nextExecutionAt?: Date | null;
  input?: unknown | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;
}

export class ExecutionResultDto {
  executionId!: string;
  status!: AiWorkflowExecutionStatus;
  output?: unknown;
  totalCost!: number;
  totalTokens!: number;
  duration!: number;
  stepsCompleted!: number;
  metadata!: Record<string, unknown>;
}
