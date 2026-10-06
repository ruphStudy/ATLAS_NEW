import {
  AiUsageRecordStatus,
  AiUsageSource,
  AiUsageQuotaScope,
  AiUsageQuotaPeriod,
  AiUsageQuotaUnit,
  AiUsageAlertType,
  IUsageReconciliationMismatch,
} from '../interfaces';

export class UsageRecordResponseDto {
  id!: string;
  workspaceId!: string;
  orchestratorRequestId?: string | null;
  agentId?: string | null;
  agentExecutionId?: string | null;
  workflowId?: string | null;
  workflowExecutionId?: string | null;
  jobId?: string | null;
  jobExecutionId?: string | null;
  queueJobId?: string | null;
  providerKey!: string;
  modelKey?: string | null;
  capability?: string | null;
  useCase?: string | null;
  feature?: string | null;
  projectId?: string | null;
  userId?: string | null;
  inputTokens!: number;
  outputTokens!: number;
  reasoningTokens!: number;
  cachedTokens!: number;
  totalTokens!: number;
  imageUnits!: number;
  embeddingUnits!: number;
  audioUnits!: number;
  toolCalls!: number;
  requestCount!: number;
  retryCount!: number;
  fallbackCount!: number;
  latencyMs?: number | null;
  status!: AiUsageRecordStatus;
  attemptNumber!: number;
  isRetry!: boolean;
  isFallback!: boolean;
  source!: AiUsageSource;
  providerRequestRef?: string | null;
  providerResponseRef?: string | null;
  providerBillingRef?: string | null;
  costRecordId?: string | null;
  createdAt!: Date;
}

export class PaginatedUsageRecordResponseDto {
  data!: UsageRecordResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class UsageQuotaResponseDto {
  id!: string;
  workspaceId!: string;
  scope!: AiUsageQuotaScope;
  period!: AiUsageQuotaPeriod;
  unit!: AiUsageQuotaUnit;
  name!: string;
  feature?: string | null;
  projectId?: string | null;
  limitAmount!: number;
  thresholdPercent!: number;
  warningThresholdPercent!: number;
  enabled!: boolean;
  metadata: unknown;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedUsageQuotaResponseDto {
  data!: UsageQuotaResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class UsageQuotaAlertResponseDto {
  id!: string;
  quotaId!: string;
  periodKey!: string;
  type!: AiUsageAlertType;
  usageAmount!: number;
  limitAmount!: number;
  createdAt!: Date;
}

export class UsageSummaryGroupResponseDto {
  key!: string | null;
  totalTokens!: number;
  requestCount!: number;
}

export class UsageSummaryResponseDto {
  workspaceId!: string;
  totalInputTokens!: number;
  totalOutputTokens!: number;
  totalReasoningTokens!: number;
  totalCachedTokens!: number;
  totalTokens!: number;
  totalImageUnits!: number;
  totalEmbeddingUnits!: number;
  totalAudioUnits!: number;
  totalToolCalls!: number;
  totalRequests!: number;
  totalRetries!: number;
  totalFallbacks!: number;
  failedRequests!: number;
  averageLatencyMs!: number;
  groups?: UsageSummaryGroupResponseDto[];
}

export class UsageBreakdownBucketResponseDto {
  bucketKey!: string;
  inputTokens!: number;
  outputTokens!: number;
  totalTokens!: number;
  imageUnits!: number;
  embeddingUnits!: number;
  audioUnits!: number;
  toolCalls!: number;
  requestCount!: number;
}

export class ReconciliationResultResponseDto {
  workspaceId!: string;
  usageRecordCount!: number;
  costRecordCount!: number;
  matchedCount!: number;
  mismatches!: IUsageReconciliationMismatch[];
}
