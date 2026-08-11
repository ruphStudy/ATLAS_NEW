export enum AiRecommendationStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  READY = 'READY',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  DISMISSED = 'DISMISSED',
  DEFERRED = 'DEFERRED',
  EXPIRED = 'EXPIRED',
}

export enum AiRecommendationType {
  PRODUCT = 'PRODUCT',
  SUPPLIER = 'SUPPLIER',
  PRICING = 'PRICING',
  REORDER = 'REORDER',
  MARKETPLACE = 'MARKETPLACE',
  INVENTORY = 'INVENTORY',
  OPERATIONAL = 'OPERATIONAL',
  CUSTOM = 'CUSTOM',
}

export enum AiRecommendationStrategy {
  WEIGHTED = 'WEIGHTED',
  RULE_BASED = 'RULE_BASED',
  AI_ASSISTED = 'AI_ASSISTED',
  HYBRID = 'HYBRID',
}

export enum AiRecommendationFeedbackType {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
  DISMISS = 'DISMISS',
  DEFER = 'DEFER',
  HELPFUL = 'HELPFUL',
  NOT_HELPFUL = 'NOT_HELPFUL',
}

export enum AiRecommendationEvent {
  RECOMMENDATION_STARTED = 'ai-recommendation.started',
  RECOMMENDATION_GENERATED = 'ai-recommendation.generated',
  RECOMMENDATION_ACCEPTED = 'ai-recommendation.accepted',
  RECOMMENDATION_REJECTED = 'ai-recommendation.rejected',
  RECOMMENDATION_DISMISSED = 'ai-recommendation.dismissed',
  RECOMMENDATION_DEFERRED = 'ai-recommendation.deferred',
  RECOMMENDATION_FEEDBACK = 'ai-recommendation.feedback',
  RECOMMENDATION_OUTCOME_TRACKED = 'ai-recommendation.outcome_tracked',
  RECOMMENDATION_EXPIRED = 'ai-recommendation.expired',
}

export interface IAiRecommendation {
  id: string;
  workspaceId: string;
  status: AiRecommendationStatus;
  recommendationType: AiRecommendationType;
  strategy: AiRecommendationStrategy;
  orchestratorRequestId?: string | null;
  agentExecutionId?: string | null;
  workflowExecutionId?: string | null;
  decisionId?: string | null;
  validationId?: string | null;
  capability?: string | null;
  useCase?: string | null;
  context?: string | null;
  userId?: string | null;
  personalized: boolean;
  inputSnapshot: unknown;
  objectives: unknown;
  constraints: unknown;
  userPreferences: unknown;
  overallScore?: number | null;
  confidenceScore?: number | null;
  rationale?: string | null;
  risks: unknown;
  alternatives: unknown;
  supportingEvidence: unknown;
  modelProvider?: string | null;
  modelName?: string | null;
  strategyVersion?: string | null;
  acceptedAt?: Date | null;
  acceptedBy?: string | null;
  rejectedAt?: Date | null;
  rejectedBy?: string | null;
  idempotencyKey?: string | null;
  expiresAt?: Date | null;
  generationStartTime?: Date | null;
  generationEndTime?: Date | null;
  generationDuration?: number | null;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiRecommendationItem {
  id: string;
  recommendationId: string;
  workspaceId: string;
  itemData: unknown;
  itemLabel?: string | null;
  itemType?: string | null;
  rank: number;
  score: number;
  scores: unknown;
  selected: boolean;
  rationale?: string | null;
  pros: unknown;
  cons: unknown;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiRecommendationStrategy {
  id: string;
  workspaceId?: string | null;
  name: string;
  recommendationType: string;
  strategy: string;
  capability?: string | null;
  useCase?: string | null;
  strategyConfig: unknown;
  weights: unknown;
  thresholds: unknown;
  priority: number;
  enabled: boolean;
  personalizationEnabled: boolean;
  version: string;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiRecommendationFeedback {
  id: string;
  recommendationId: string;
  workspaceId: string;
  feedbackType: AiRecommendationFeedbackType;
  itemId?: string | null;
  userId: string;
  rating?: number | null;
  comment?: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiRecommendationOutcome {
  id: string;
  recommendationId: string;
  workspaceId: string;
  itemId?: string | null;
  outcomeType: string;
  success: boolean;
  actualResult?: unknown | null;
  expectedResult?: unknown | null;
  effectivenessScore?: number | null;
  notes?: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiRecommendationHistory {
  id: string;
  recommendationId: string;
  workspaceId: string;
  action: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  changedBy?: string | null;
  reason?: string | null;
  details?: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IRecommendationEventPayload {
  event: AiRecommendationEvent;
  workspaceId: string;
  recommendationId: string;
  status?: string;
  metadata?: unknown;
}

export interface IGenerateRecommendationParams {
  workspaceId: string;
  recommendationType: AiRecommendationType;
  strategy: AiRecommendationStrategy;
  inputSnapshot: unknown;
  candidates: unknown[];
  objectives?: unknown;
  constraints?: unknown;
  userPreferences?: unknown;
  userId?: string;
  personalized?: boolean;
  capability?: string;
  useCase?: string;
  context?: string;
  orchestratorRequestId?: string;
  agentExecutionId?: string;
  workflowExecutionId?: string;
  decisionId?: string;
  validationId?: string;
  idempotencyKey?: string;
  expiresAt?: Date;
  tags?: string[];
  metadata?: unknown;
}

export interface IRecommendationResult {
  recommendationId: string;
  status: AiRecommendationStatus;
  items: IAiRecommendationItem[];
  overallScore?: number;
  confidenceScore?: number;
  rationale?: string;
  risks: IRisk[];
  alternatives: IAlternative[];
  supportingEvidence?: unknown;
}

export interface IRisk {
  type: string;
  severity: string;
  description: string;
  mitigation?: string;
}

export interface IAlternative {
  itemId: string;
  rank: number;
  score: number;
  reason: string;
}

export interface IRecommendationGenerator {
  name: string;
  strategy: AiRecommendationStrategy;
  generate(
    recommendation: IAiRecommendation,
    candidates: unknown[],
    strategies: IAiRecommendationStrategy[],
    userPreferences?: unknown,
  ): Promise<IGenerationResult>;
}

export interface IGenerationResult {
  items: Array<{
    itemData: unknown;
    itemLabel?: string;
    itemType?: string;
    rank: number;
    score: number;
    scores: Record<string, number>;
    rationale?: string;
    pros: string[];
    cons: string[];
  }>;
  overallScore: number;
  confidenceScore: number;
  rationale: string;
  risks: IRisk[];
  alternatives: IAlternative[];
  supportingEvidence?: unknown;
}
