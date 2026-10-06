import {
  AiRecommendationStatus,
  AiRecommendationType,
  AiRecommendationStrategy,
  AiRecommendationFeedbackType,
} from '../interfaces';

export class RecommendationResponseDto {
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

export class PaginatedRecommendationResponseDto {
  data: RecommendationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class RecommendationResultDto {
  recommendationId: string;
  status: AiRecommendationStatus;
  items: RecommendationItemDto[];
  overallScore?: number;
  confidenceScore?: number;
  rationale?: string;
  risks: RiskDto[];
  alternatives: AlternativeDto[];
  supportingEvidence?: unknown;
}

export class RecommendationItemDto {
  id: string;
  itemData: unknown;
  itemLabel?: string;
  itemType?: string;
  rank: number;
  score: number;
  scores: unknown;
  selected: boolean;
  rationale?: string;
  pros: unknown;
  cons: unknown;
}

export class RiskDto {
  type: string;
  severity: string;
  description: string;
  mitigation?: string;
}

export class AlternativeDto {
  itemId: string;
  rank: number;
  score: number;
  reason: string;
}

export class StrategyResponseDto {
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
}

export class FeedbackResponseDto {
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

export class OutcomeResponseDto {
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
