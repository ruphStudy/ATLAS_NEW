import {
  AiCostRecordStatus,
  AiCostBudgetScope,
  AiCostBudgetPeriod,
  AiCostBudgetAlertType,
} from '../interfaces';

export class PricingConfigResponseDto {
  id: string;
  workspaceId?: string | null;
  providerKey: string;
  modelKey?: string | null;
  capability?: string | null;
  currency: string;
  inputPricePer1k?: number | null;
  outputPricePer1k?: number | null;
  cachedInputPricePer1k?: number | null;
  imagePriceUnit?: number | null;
  embeddingPricePer1k?: number | null;
  enabled: boolean;
  priority: number;
  version: number;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedPricingConfigResponseDto {
  data: PricingConfigResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PricingConfigHistoryResponseDto {
  id: string;
  configId: string;
  version: number;
  snapshot: unknown;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export class CostRecordResponseDto {
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
  cachedTokens: number;
  imageUnits: number;
  embeddingUnits: number;
  requestCount: number;
  latencyMs?: number | null;
  currency: string;
  estimatedCost?: number | null;
  finalCost?: number | null;
  pricingConfigId?: string | null;
  pricingVersion?: number | null;
  status: AiCostRecordStatus;
  attemptNumber: number;
  isRetry: boolean;
  isFallback: boolean;
  isDuplicate: boolean;
  providerUsageRef?: string | null;
  providerBillingRef?: string | null;
  createdAt: Date;
}

export class PaginatedCostRecordResponseDto {
  data: CostRecordResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class EstimateCostResponseDto {
  cost: number;
  currency: string;
  pricingConfigId: string;
  pricingVersion: number;
}

export class BudgetResponseDto {
  id: string;
  workspaceId: string;
  scope: AiCostBudgetScope;
  period: AiCostBudgetPeriod;
  name: string;
  feature?: string | null;
  projectId?: string | null;
  limitAmount: number;
  currency: string;
  warningThresholdPercent: number;
  enabled: boolean;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedBudgetResponseDto {
  data: BudgetResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class BudgetAlertResponseDto {
  id: string;
  budgetId: string;
  periodKey: string;
  type: AiCostBudgetAlertType;
  spendAmount: number;
  limitAmount: number;
  currency: string;
  createdAt: Date;
}

export class CostSummaryGroupResponseDto {
  key: string | null;
  totalCost: number;
  totalTokens: number;
  requestCount: number;
}

export class CostSummaryResponseDto {
  workspaceId: string;
  totalCost: number;
  totalEstimatedCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedTokens: number;
  totalImageUnits: number;
  totalEmbeddingUnits: number;
  totalRequests: number;
  failedRequests: number;
  retriedRequests: number;
  fallbackRequests: number;
  duplicateSpend: number;
  averageLatencyMs: number;
  groups?: CostSummaryGroupResponseDto[];
}
