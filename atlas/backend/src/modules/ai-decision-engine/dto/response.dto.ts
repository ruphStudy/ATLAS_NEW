import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AiDecisionStatus,
  AiDecisionType,
  AiDecisionMethod,
  AiDecisionOutcome,
  AiDecisionOverrideReason,
} from '../interfaces';

export class DecisionResponseDto {
  id!: string;
  workspaceId!: string;
  status!: AiDecisionStatus;
  decisionType!: AiDecisionType;
  decisionMethod!: AiDecisionMethod;
  orchestratorRequestId?: string | null;
  agentExecutionId?: string | null;
  workflowExecutionId?: string | null;
  validationId?: string | null;
  capability?: string | null;
  useCase?: string | null;
  context?: string | null;
  inputSnapshot: unknown;
  constraints: unknown;
  objectives: unknown;
  @ApiPropertyOptional({ enum: AiDecisionOutcome, nullable: true })
  outcome?: AiDecisionOutcome | null;
  selectedCandidateId?: string | null;
  finalScore?: number | null;
  confidenceScore?: number | null;
  rationale?: string | null;
  risks: unknown;
  alternatives: unknown;
  supportingEvidence: unknown;
  modelProvider?: string | null;
  modelName?: string | null;
  ruleVersion?: string | null;
  requiresHumanApproval!: boolean;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  idempotencyKey?: string | null;
  expiresAt?: Date | null;
  evaluationStartTime?: Date | null;
  evaluationEndTime?: Date | null;
  evaluationDuration?: number | null;
  tags!: string[];
  metadata: unknown;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedDecisionResponseDto {
  data!: DecisionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class DecisionResultDto {
  decisionId!: string;
  status!: AiDecisionStatus;
  outcome?: AiDecisionOutcome;
  selectedCandidate?: CandidateDto;
  finalScore?: number;
  confidenceScore?: number;
  rationale?: string;
  risks!: RiskDto[];
  alternatives!: AlternativeDto[];
  supportingEvidence?: unknown;
}

export class CandidateDto {
  id!: string;
  candidateData: unknown;
  candidateLabel?: string;
  score?: number;
  selected!: boolean;
  rank?: number;
  pros: unknown;
  cons: unknown;
}

export class RiskDto {
  type!: string;
  severity!: string;
  description!: string;
  mitigation?: string;
}

export class AlternativeDto {
  candidateId!: string;
  score!: number;
  reason!: string;
}

export class DecisionRuleResponseDto {
  id!: string;
  workspaceId?: string | null;
  name!: string;
  decisionType!: string;
  method!: string;
  capability?: string | null;
  useCase?: string | null;
  ruleConfig: unknown;
  weights: unknown;
  thresholds: unknown;
  priority!: number;
  enabled!: boolean;
  requiresApproval!: boolean;
  approvalThreshold?: number | null;
  version!: string;
  tags!: string[];
  metadata: unknown;
  createdAt!: Date;
  updatedAt!: Date;
}
