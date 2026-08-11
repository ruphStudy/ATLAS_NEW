export enum AiDecisionStatus {
  PENDING = 'PENDING',
  EVALUATING = 'EVALUATING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  DEFERRED = 'DEFERRED',
  OVERRIDDEN = 'OVERRIDDEN',
  EXPIRED = 'EXPIRED',
}

export enum AiDecisionType {
  PRODUCT_SELECTION = 'PRODUCT_SELECTION',
  SUPPLIER_SELECTION = 'SUPPLIER_SELECTION',
  PRICING = 'PRICING',
  REORDER = 'REORDER',
  MARKETPLACE = 'MARKETPLACE',
  INVENTORY = 'INVENTORY',
  OPERATIONAL = 'OPERATIONAL',
  CUSTOM = 'CUSTOM',
}

export enum AiDecisionMethod {
  RULE_BASED = 'RULE_BASED',
  AI_ASSISTED = 'AI_ASSISTED',
  WEIGHTED_SCORING = 'WEIGHTED_SCORING',
  HYBRID = 'HYBRID',
}

export enum AiDecisionOutcome {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  DEFERRED = 'DEFERRED',
}

export enum AiDecisionOverrideReason {
  BUSINESS_JUDGMENT = 'BUSINESS_JUDGMENT',
  INCORRECT_DATA = 'INCORRECT_DATA',
  CHANGED_REQUIREMENTS = 'CHANGED_REQUIREMENTS',
  EMERGENCY = 'EMERGENCY',
  POLICY_EXCEPTION = 'POLICY_EXCEPTION',
  OTHER = 'OTHER',
}

export enum AiDecisionEvent {
  DECISION_STARTED = 'ai-decision.started',
  DECISION_EVALUATED = 'ai-decision.evaluated',
  DECISION_APPROVED = 'ai-decision.approved',
  DECISION_REJECTED = 'ai-decision.rejected',
  DECISION_REVIEW_REQUIRED = 'ai-decision.review_required',
  DECISION_DEFERRED = 'ai-decision.deferred',
  DECISION_OVERRIDDEN = 'ai-decision.overridden',
  DECISION_EXPIRED = 'ai-decision.expired',
}

export interface IAiDecision {
  id: string;
  workspaceId: string;
  status: AiDecisionStatus;
  decisionType: AiDecisionType;
  decisionMethod: AiDecisionMethod;
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
  requiresHumanApproval: boolean;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  idempotencyKey?: string | null;
  expiresAt?: Date | null;
  evaluationStartTime?: Date | null;
  evaluationEndTime?: Date | null;
  evaluationDuration?: number | null;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiDecisionCandidate {
  id: string;
  decisionId: string;
  workspaceId: string;
  candidateData: unknown;
  candidateLabel?: string | null;
  score?: number | null;
  scores: unknown;
  selected: boolean;
  rank?: number | null;
  pros: unknown;
  cons: unknown;
  metadata: unknown;
  createdAt: Date;
}

export interface IAiDecisionRule {
  id: string;
  workspaceId?: string | null;
  name: string;
  decisionType: string;
  method: string;
  capability?: string | null;
  useCase?: string | null;
  ruleConfig: unknown;
  weights: unknown;
  thresholds: unknown;
  priority: number;
  enabled: boolean;
  requiresApproval: boolean;
  approvalThreshold?: number | null;
  version: string;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiDecisionHistory {
  id: string;
  decisionId: string;
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

export interface IAiDecisionOverride {
  id: string;
  decisionId: string;
  workspaceId: string;
  overrideReason: AiDecisionOverrideReason;
  reasonText?: string | null;
  originalOutcome: AiDecisionOutcome;
  newOutcome: AiDecisionOutcome;
  originalCandidateId?: string | null;
  newCandidateId?: string | null;
  overriddenBy: string;
  approvedBy?: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface IDecisionEventPayload {
  event: AiDecisionEvent;
  workspaceId: string;
  decisionId: string;
  status?: string;
  outcome?: AiDecisionOutcome;
  metadata?: unknown;
}

export interface IEvaluateDecisionParams {
  workspaceId: string;
  decisionType: AiDecisionType;
  decisionMethod: AiDecisionMethod;
  inputSnapshot: unknown;
  candidates: unknown[];
  constraints?: unknown;
  objectives?: unknown;
  capability?: string;
  useCase?: string;
  context?: string;
  orchestratorRequestId?: string;
  agentExecutionId?: string;
  workflowExecutionId?: string;
  validationId?: string;
  idempotencyKey?: string;
  expiresAt?: Date;
  tags?: string[];
  metadata?: unknown;
}

export interface IDecisionResult {
  decisionId: string;
  status: AiDecisionStatus;
  outcome?: AiDecisionOutcome;
  selectedCandidate?: IAiDecisionCandidate;
  finalScore?: number;
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
  candidateId: string;
  score: number;
  reason: string;
}

export interface IDecisionEvaluator {
  name: string;
  method: AiDecisionMethod;
  evaluate(
    decision: IAiDecision,
    candidates: IAiDecisionCandidate[],
    rules: IAiDecisionRule[],
  ): Promise<IEvaluationResult>;
}

export interface IEvaluationResult {
  outcome: AiDecisionOutcome;
  selectedCandidateId?: string;
  finalScore: number;
  confidenceScore: number;
  rationale: string;
  risks: IRisk[];
  alternatives: IAlternative[];
  supportingEvidence?: unknown;
  candidateScores: Record<string, number>;
}
