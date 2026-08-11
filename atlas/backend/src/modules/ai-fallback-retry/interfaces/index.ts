export enum AiRetryStatus {
  PENDING = 'PENDING',
  RETRYING = 'RETRYING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  EXHAUSTED = 'EXHAUSTED',
  CANCELLED = 'CANCELLED',
}

export enum AiFailureType {
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  MODEL_ERROR = 'MODEL_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SAFETY_ERROR = 'SAFETY_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export enum AiBackoffStrategy {
  FIXED = 'FIXED',
  LINEAR = 'LINEAR',
  EXPONENTIAL = 'EXPONENTIAL',
  EXPONENTIAL_JITTER = 'EXPONENTIAL_JITTER',
}

export enum AiRetryEvent {
  RETRY_STARTED = 'ai-retry.started',
  RETRY_ATTEMPT = 'ai-retry.attempt',
  RETRY_SUCCEEDED = 'ai-retry.succeeded',
  RETRY_FAILED = 'ai-retry.failed',
  RETRY_EXHAUSTED = 'ai-retry.exhausted',
  FALLBACK_TRIGGERED = 'ai-retry.fallback_triggered',
  FALLBACK_SUCCEEDED = 'ai-retry.fallback_succeeded',
  FALLBACK_FAILED = 'ai-retry.fallback_failed',
  RECOVERY_COMPLETED = 'ai-retry.recovery_completed',
}

export interface IAiRetryPolicy {
  id: string;
  workspaceId?: string | null;
  name: string;
  capability?: string | null;
  useCase?: string | null;
  modelProvider?: string | null;
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  backoffStrategy: AiBackoffStrategy;
  jitterFactor: number;
  timeoutMs?: number | null;
  retryableFailures: string[];
  nonRetryableFailures: string[];
  enableFallback: boolean;
  fallbackPriority: number;
  respectBudget: boolean;
  respectQuota: boolean;
  respectCircuitBreaker: boolean;
  enabled: boolean;
  priority: number;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiRetryExecution {
  id: string;
  workspaceId: string;
  status: AiRetryStatus;
  orchestratorRequestId?: string | null;
  agentExecutionId?: string | null;
  workflowExecutionId?: string | null;
  capability: string;
  useCase?: string | null;
  originalProvider: string;
  originalModel: string;
  policyId?: string | null;
  policySnapshot?: unknown | null;
  requestPayload: unknown;
  requestContext: unknown;
  currentAttempt: number;
  maxAttempts: number;
  lastFailureType?: AiFailureType | null;
  lastFailureMessage?: string | null;
  lastFailureCode?: string | null;
  finalProvider?: string | null;
  finalModel?: string | null;
  finalResponse?: unknown | null;
  totalTokensUsed: number;
  totalCost: number;
  idempotencyKey?: string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  totalDuration?: number | null;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiRetryAttempt {
  id: string;
  retryExecutionId: string;
  workspaceId: string;
  attemptNumber: number;
  provider: string;
  model: string;
  succeeded: boolean;
  failureType?: AiFailureType | null;
  failureMessage?: string | null;
  failureCode?: string | null;
  failureDetails?: unknown | null;
  requestPayload: unknown;
  response?: unknown | null;
  tokensUsed?: number | null;
  cost?: number | null;
  delayBeforeRetryMs?: number | null;
  startTime: Date;
  endTime?: Date | null;
  duration?: number | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiFallbackConfig {
  id: string;
  workspaceId?: string | null;
  name: string;
  capability: string;
  useCase?: string | null;
  sourceProvider?: string | null;
  sourceModel?: string | null;
  fallbackProvider: string;
  fallbackModel: string;
  priority: number;
  enabled: boolean;
  triggerFailureTypes: string[];
  costThreshold?: number | null;
  latencyThreshold?: number | null;
  requireHealthCheck: boolean;
  requireBudget: boolean;
  region?: string | null;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiFallbackExecution {
  id: string;
  retryExecutionId: string;
  workspaceId: string;
  configId?: string | null;
  sourceProvider: string;
  sourceModel: string;
  fallbackProvider: string;
  fallbackModel: string;
  reason: string;
  triggerFailureType: AiFailureType;
  succeeded: boolean;
  response?: unknown | null;
  tokensUsed?: number | null;
  cost?: number | null;
  startTime: Date;
  endTime?: Date | null;
  duration?: number | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IRetryEventPayload {
  event: AiRetryEvent;
  workspaceId: string;
  retryExecutionId: string;
  status?: string;
  attemptNumber?: number;
  metadata?: unknown;
}

export interface IExecuteWithRetryParams {
  workspaceId: string;
  capability: string;
  useCase?: string;
  provider: string;
  model: string;
  requestPayload: unknown;
  requestContext?: unknown;
  orchestratorRequestId?: string;
  agentExecutionId?: string;
  workflowExecutionId?: string;
  idempotencyKey?: string;
  policyId?: string;
  tags?: string[];
  metadata?: unknown;
}

export interface IRetryResult {
  executionId: string;
  status: AiRetryStatus;
  succeeded: boolean;
  attempts: number;
  finalProvider?: string;
  finalModel?: string;
  response?: unknown;
  totalTokensUsed: number;
  totalCost: number;
  totalDuration?: number;
  errors: IRetryError[];
}

export interface IRetryError {
  attemptNumber: number;
  provider: string;
  model: string;
  failureType: AiFailureType;
  failureMessage: string;
  failureCode?: string;
}

export interface IFallbackCandidate {
  provider: string;
  model: string;
  priority: number;
  costThreshold?: number;
  latencyThreshold?: number;
  healthScore?: number;
}
