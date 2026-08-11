export enum AiUsageSource {
  PROVIDER_REPORTED = 'PROVIDER_REPORTED',
  ESTIMATED = 'ESTIMATED',
}

export enum AiUsageRecordStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum AiUsageQuotaScope {
  WORKSPACE = 'WORKSPACE',
  FEATURE = 'FEATURE',
  PROJECT = 'PROJECT',
}

export enum AiUsageQuotaPeriod {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
}

export enum AiUsageQuotaUnit {
  REQUESTS = 'REQUESTS',
  TOKENS = 'TOKENS',
  IMAGES = 'IMAGES',
  EMBEDDINGS = 'EMBEDDINGS',
  AUDIO = 'AUDIO',
  TOOL_CALLS = 'TOOL_CALLS',
}

export enum AiUsageAlertType {
  THRESHOLD = 'THRESHOLD',
  WARNING = 'WARNING',
  EXCEEDED = 'EXCEEDED',
}

export enum AiUsageEvent {
  QUOTA_CREATED = 'ai-usage.quota_created',
  QUOTA_UPDATED = 'ai-usage.quota_updated',
  QUOTA_DELETED = 'ai-usage.quota_deleted',
  USAGE_RECORDED = 'ai-usage.usage_recorded',
  QUOTA_THRESHOLD = 'ai-usage.quota_threshold',
  QUOTA_WARNING = 'ai-usage.quota_warning',
  QUOTA_EXCEEDED = 'ai-usage.quota_exceeded',
  RECONCILIATION_COMPLETED = 'ai-usage.reconciliation_completed',
}

export type UsageBucketGranularity = 'HOUR' | 'DAY' | 'MONTH';

// ── Entity interfaces (mirror the Prisma models) ────────────────────

export interface IAiUsageRecord {
  id: string;
  workspaceId: string;
  orchestratorRequestId?: string | null;
  agentId?: string | null;
  agentExecutionId?: string | null;
  workflowId?: string | null;
  workflowExecutionId?: string | null;
  jobId?: string | null;
  jobExecutionId?: string | null;
  queueJobId?: string | null;
  providerKey: string;
  modelKey?: string | null;
  capability?: string | null;
  useCase?: string | null;
  feature?: string | null;
  projectId?: string | null;
  userId?: string | null;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  imageUnits: number;
  embeddingUnits: number;
  audioUnits: number;
  toolCalls: number;
  requestCount: number;
  retryCount: number;
  fallbackCount: number;
  latencyMs?: number | null;
  status: AiUsageRecordStatus;
  attemptNumber: number;
  isRetry: boolean;
  isFallback: boolean;
  source: AiUsageSource;
  providerRequestRef?: string | null;
  providerResponseRef?: string | null;
  providerBillingRef?: string | null;
  costRecordId?: string | null;
  errorCode?: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiUsageQuota {
  id: string;
  workspaceId: string;
  scope: AiUsageQuotaScope;
  period: AiUsageQuotaPeriod;
  unit: AiUsageQuotaUnit;
  name: string;
  feature?: string | null;
  projectId?: string | null;
  limitAmount: number;
  thresholdPercent: number;
  warningThresholdPercent: number;
  enabled: boolean;
  metadata: unknown;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiUsageQuotaAlert {
  id: string;
  quotaId: string;
  workspaceId: string;
  periodKey: string;
  type: AiUsageAlertType;
  usageAmount: number;
  limitAmount: number;
  metadata: unknown;
  createdAt: Date;
}

// ── Usage unit contracts ─────────────────────────────────────────────

export interface IAiUsageUnits {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedTokens?: number;
  totalTokens?: number;
  imageUnits?: number;
  embeddingUnits?: number;
  audioUnits?: number;
  toolCalls?: number;
}

export interface IUsageBucket {
  bucketKey: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  imageUnits: number;
  embeddingUnits: number;
  audioUnits: number;
  toolCalls: number;
  requestCount: number;
}

export interface IUsageReconciliationMismatch {
  orchestratorRequestId: string;
  reason: 'MISSING_USAGE_RECORD' | 'MISSING_COST_RECORD' | 'TOKEN_MISMATCH';
  usageTotalTokens?: number;
  costTotalTokens?: number;
}

export interface IUsageReconciliationResult {
  workspaceId: string;
  usageRecordCount: number;
  costRecordCount: number;
  matchedCount: number;
  mismatches: IUsageReconciliationMismatch[];
}

export interface IAiUsageEventPayload {
  event: AiUsageEvent;
  workspaceId: string;
  usageRecordId?: string;
  quotaId?: string;
  alertId?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}
