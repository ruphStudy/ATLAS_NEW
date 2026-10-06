export enum AiMetricType {
  REQUEST_COUNT = 'request_count',
  SUCCESS_RATE = 'success_rate',
  FAILURE_RATE = 'failure_rate',
  RETRY_RATE = 'retry_rate',
  FALLBACK_RATE = 'fallback_rate',
  AVERAGE_LATENCY = 'average_latency',
  THROUGHPUT = 'throughput',
  TOTAL_COST = 'total_cost',
  TOTAL_TOKENS = 'total_tokens',
  CACHE_HIT_RATE = 'cache_hit_rate',
  TOKEN_SAVINGS = 'token_savings',
  COST_SAVINGS = 'cost_savings',
  VALIDATION_FAILURE_RATE = 'validation_failure_rate',
  GUARDRAIL_BLOCK_RATE = 'guardrail_block_rate',
  LOW_CONFIDENCE_RATE = 'low_confidence_rate',
  HUMAN_REVIEW_RATE = 'human_review_rate',
}

export enum AiDimension {
  PROVIDER = 'provider',
  MODEL = 'model',
  CAPABILITY = 'capability',
  USE_CASE = 'use_case',
  AGENT = 'agent',
  WORKFLOW = 'workflow',
  FEATURE = 'feature',
  USER = 'user',
  WORKSPACE = 'workspace',
  STATUS = 'status',
}

export enum AiPeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum AiPerformanceCategory {
  EFFICIENT = 'efficient',
  NORMAL = 'normal',
  EXPENSIVE = 'expensive',
  SLOW = 'slow',
  UNRELIABLE = 'unreliable',
  UNDERUSED = 'underused',
  HIGH_QUALITY = 'high_quality',
  LOW_QUALITY = 'low_quality',
}

export enum AiComparisonType {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  CROSS_PROVIDER = 'cross_provider',
  CROSS_MODEL = 'cross_model',
  TARGET = 'target',
}

export enum AiAnalyticsEventType {
  PERFORMANCE_CALCULATED = 'performance_calculated',
  TREND_UPDATED = 'trend_updated',
  COMPARISON_GENERATED = 'comparison_generated',
  EXPENSIVE_OPERATION_DETECTED = 'expensive_operation_detected',
  SLOW_OPERATION_DETECTED = 'slow_operation_detected',
  UNRELIABLE_OPERATION_DETECTED = 'unreliable_operation_detected',
  UNDERUSED_OPERATION_DETECTED = 'underused_operation_detected',
  BUDGET_WARNING = 'budget_warning',
  QUOTA_WARNING = 'quota_warning',
}

export interface IRequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  retriedRequests: number;
  fallbackRequests: number;
  successRate: number;
  failureRate: number;
  retryRate: number;
  fallbackRate: number;
  averageLatency: number;
  medianLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
}

export interface IUsageCostMetrics {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  totalTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  cachedCost: number;
  averageCostPerRequest: number;
  averageTokensPerRequest: number;
}

export interface ICacheMetrics {
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  tokensSaved: number;
  costSaved: number;
  averageHitLatency: number;
  averageMissLatency: number;
}

export interface IQualityMetrics {
  validationFailures: number;
  validationFailureRate: number;
  guardrailBlocks: number;
  guardrailBlockRate: number;
  lowConfidenceOutputs: number;
  lowConfidenceRate: number;
  humanReviewRequired: number;
  humanReviewRate: number;
  averageConfidenceScore: number;
}

export interface IAgentWorkflowMetrics {
  agentExecutions: number;
  agentCompletions: number;
  agentFailures: number;
  agentCompletionRate: number;
  averageAgentDuration: number;
  workflowExecutions: number;
  workflowCompletions: number;
  workflowFailures: number;
  workflowCompletionRate: number;
  averageWorkflowDuration: number;
}

export interface IDecisionMetrics {
  decisionsGenerated: number;
  decisionsAccepted: number;
  decisionsRejected: number;
  decisionsOverridden: number;
  acceptanceRate: number;
  rejectionRate: number;
  overrideRate: number;
  recommendationsGenerated: number;
  recommendationsFollowed: number;
  recommendationFollowRate: number;
}

export interface IAiPerformance {
  workspaceId: string;
  period: AiPeriod;
  startDate: Date;
  endDate: Date;
  performanceCategory: AiPerformanceCategory;
  providerKey?: string;
  modelKey?: string;
  capability?: string;
  useCase?: string;
  agentId?: string;
  workflowId?: string;
  feature?: string;
  requestMetrics: IRequestMetrics;
  usageCostMetrics: IUsageCostMetrics;
  cacheMetrics: ICacheMetrics;
  qualityMetrics: IQualityMetrics;
  agentWorkflowMetrics: IAgentWorkflowMetrics;
  decisionMetrics: IDecisionMetrics;
  overallScore: number;
  metadata?: Record<string, any>;
}

export interface IAiTrend {
  workspaceId: string;
  period: AiPeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: AiMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  dimension?: AiDimension;
  dimensionValue?: string;
  metadata?: Record<string, any>;
}

export interface IAiBreakdown {
  workspaceId: string;
  dimension: AiDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: AiPeriod;
  startDate: Date;
  endDate: Date;
  requestMetrics: IRequestMetrics;
  usageCostMetrics: IUsageCostMetrics;
  cacheMetrics: ICacheMetrics;
  qualityMetrics: IQualityMetrics;
  agentWorkflowMetrics: IAgentWorkflowMetrics;
  decisionMetrics: IDecisionMetrics;
  overallScore: number;
  rank?: number;
  metadata?: Record<string, any>;
}

export interface IAiComparison {
  workspaceId: string;
  comparisonType: AiComparisonType;
  period: AiPeriod;
  startDate: Date;
  endDate: Date;
  actualMetrics: {
    requestMetrics: IRequestMetrics;
    usageCostMetrics: IUsageCostMetrics;
    cacheMetrics: ICacheMetrics;
    qualityMetrics: IQualityMetrics;
    agentWorkflowMetrics: IAgentWorkflowMetrics;
    decisionMetrics: IDecisionMetrics;
    overallScore: number;
  };
  comparisonMetrics: {
    requestMetrics: IRequestMetrics;
    usageCostMetrics: IUsageCostMetrics;
    cacheMetrics: ICacheMetrics;
    qualityMetrics: IQualityMetrics;
    agentWorkflowMetrics: IAgentWorkflowMetrics;
    decisionMetrics: IDecisionMetrics;
    overallScore: number;
  };
  variance: {
    costVariance: number;
    costVariancePercent: number;
    latencyVariance: number;
    latencyVariancePercent: number;
    successRatePoints: number;
    cacheHitRatePoints: number;
    qualityScorePoints: number;
    overallScorePoints: number;
  };
  providerKey?: string;
  modelKey?: string;
  metadata?: Record<string, any>;
}

export interface IAiIssueAlert {
  workspaceId: string;
  alertType: AiPerformanceCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  providerKey?: string;
  modelKey?: string;
  capability?: string;
  agentId?: string;
  workflowId?: string;
  feature?: string;
  reason: string;
  details: Record<string, any>;
  detectedAt: Date;
  metadata?: Record<string, any>;
}

export interface IAiAnalyticsFilters {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  period?: AiPeriod;
  providerKeys?: string[];
  modelKeys?: string[];
  capabilities?: string[];
  useCases?: string[];
  agentIds?: string[];
  workflowIds?: string[];
  features?: string[];
  userIds?: string[];
  performanceCategories?: AiPerformanceCategory[];
  minCost?: number;
  maxCost?: number;
  minLatency?: number;
  maxLatency?: number;
  minSuccessRate?: number;
  minOverallScore?: number;
}

export interface IAiAnalyticsEvent {
  event: AiAnalyticsEventType;
  workspaceId: string;
  providerKey?: string;
  modelKey?: string;
  capability?: string;
  agentId?: string;
  workflowId?: string;
  feature?: string;
  performanceCategory?: AiPerformanceCategory;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}
