export enum AiCostRecordStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum AiCostBudgetScope {
  WORKSPACE = 'WORKSPACE',
  FEATURE = 'FEATURE',
  PROJECT = 'PROJECT',
}

export enum AiCostBudgetPeriod {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
}

export enum AiCostBudgetAlertType {
  WARNING = 'WARNING',
  EXCEEDED = 'EXCEEDED',
}

export enum AiCostEvent {
  PRICING_CONFIG_CREATED = 'ai-cost.pricing_config_created',
  PRICING_CONFIG_UPDATED = 'ai-cost.pricing_config_updated',
  PRICING_CONFIG_DELETED = 'ai-cost.pricing_config_deleted',
  BUDGET_CREATED = 'ai-cost.budget_created',
  BUDGET_UPDATED = 'ai-cost.budget_updated',
  BUDGET_DELETED = 'ai-cost.budget_deleted',
  COST_RECORDED = 'ai-cost.cost_recorded',
  BUDGET_WARNING = 'ai-cost.budget_warning',
  BUDGET_EXCEEDED = 'ai-cost.budget_exceeded',
}

// ── Entity interfaces (mirror the Prisma models) ────────────────────

export interface IAiCostPricingConfig {
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
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiCostPricingConfigHistory {
  id: string;
  configId: string;
  workspaceId?: string | null;
  providerKey: string;
  version: number;
  snapshot: unknown;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IAiCostRecord {
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
  errorCode?: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiCostBudget {
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
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiCostBudgetAlert {
  id: string;
  budgetId: string;
  workspaceId: string;
  periodKey: string;
  type: AiCostBudgetAlertType;
  spendAmount: number;
  limitAmount: number;
  currency: string;
  metadata: unknown;
  createdAt: Date;
}

// ── Usage units + pricing resolution contracts ──────────────────────

export interface IAiCostUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
  imageUnits?: number;
  embeddingUnits?: number;
}

export interface IAiCostCalculation {
  cost: number;
  currency: string;
  pricingConfigId: string;
  pricingVersion: number;
}

export interface IAiCostBudgetCheckResult {
  budget: IAiCostBudget;
  periodKey: string;
  spendAmount: number;
  limitAmount: number;
  percentUsed: number;
  warningTriggered: boolean;
  exceededTriggered: boolean;
}

export interface IAiCostEventPayload {
  event: AiCostEvent;
  workspaceId: string;
  configId?: string;
  budgetId?: string;
  costRecordId?: string;
  alertId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}
