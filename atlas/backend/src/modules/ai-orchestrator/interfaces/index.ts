export enum AiExecutionMode {
  SYNC = 'SYNC',
  ASYNC = 'ASYNC',
  STREAMING = 'STREAMING',
}

export enum AiRequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
}

export enum AiRoutingStrategy {
  COST_OPTIMIZED = 'COST_OPTIMIZED',
  LATENCY_OPTIMIZED = 'LATENCY_OPTIMIZED',
  QUALITY_OPTIMIZED = 'QUALITY_OPTIMIZED',
  BALANCED = 'BALANCED',
  CUSTOM = 'CUSTOM',
}

export enum AiOrchestratorEvent {
  REQUEST_RECEIVED = 'ai-orchestrator.request_received',
  EXECUTION_STARTED = 'ai-orchestrator.execution_started',
  EXECUTION_COMPLETED = 'ai-orchestrator.execution_completed',
  EXECUTION_FAILED = 'ai-orchestrator.execution_failed',
  FALLBACK_TRIGGERED = 'ai-orchestrator.fallback_triggered',
  RETRY_ATTEMPTED = 'ai-orchestrator.retry_attempted',
  CACHE_HIT = 'ai-orchestrator.cache_hit',
  CACHE_MISS = 'ai-orchestrator.cache_miss',
  RESPONSE_NORMALIZED = 'ai-orchestrator.response_normalized',
  REQUEST_CANCELLED = 'ai-orchestrator.request_cancelled',
}

export interface IAiRequest {
  id: string;
  workspaceId: string;
  useCase: string;
  capability: string;
  provider?: string | null;
  modelId?: string | null;
  prompt: string;
  context?: Record<string, unknown> | null;
  parameters: Record<string, unknown>;
  status: AiRequestStatus;
  executionMode: AiExecutionMode;
  priority: number;
  routingStrategy: AiRoutingStrategy;
  routingCriteria?: Record<string, unknown> | null;
  maxRetries: number;
  timeout?: number | null;
  userId?: string | null;
  requestMetadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiResponse {
  id: string;
  requestId: string;
  provider: string;
  modelKey: string;
  content: string;
  status: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  cost?: number | null;
  latency?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface IAiExecutionLog {
  id: string;
  requestId: string;
  workspaceId: string;
  provider: string;
  modelKey: string;
  capability: string;
  useCase: string;
  status: string;
  startTime: Date;
  endTime?: Date | null;
  latency?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  cost?: number | null;
  attemptNumber: number;
  fallbackUsed: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  routingStrategy?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface IRoutingCriteria {
  maxCost?: number;
  maxLatency?: number;
  minQuality?: number;
  preferredProvider?: string;
  preferredModel?: string;
  region?: string;
  excludeProviders?: string[];
  excludeModels?: string[];
}

export interface IExecutionResult {
  requestId: string;
  content: string;
  provider: string;
  modelKey: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latency: number;
  metadata: Record<string, unknown>;
}

export interface INormalizedResponse {
  success: boolean;
  content?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: number;
  latency: number;
  provider: string;
  model: string;
  metadata: Record<string, unknown>;
}

export interface IOrchestratorEventPayload {
  event: AiOrchestratorEvent;
  workspaceId: string;
  requestId: string;
  provider?: string;
  modelKey?: string;
  capability?: string;
  useCase?: string;
  status?: string;
  latency?: number;
  cost?: number;
  attemptNumber?: number;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}
