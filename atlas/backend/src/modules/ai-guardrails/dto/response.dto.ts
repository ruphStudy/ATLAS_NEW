import {
  GuardrailStage,
  GuardrailCheckType,
  GuardrailViolationCategory,
  GuardrailSeverity,
  GuardrailDecision,
  GuardrailOverrideScope,
  GuardrailIncidentStatus,
  GuardrailApprovalStatus,
  GuardrailEvaluationStatus,
} from '../interfaces';

export class GuardrailRuleResponseDto {
  id: string;
  workspaceId?: string | null;
  name: string;
  description?: string | null;
  stage: GuardrailStage;
  category: GuardrailViolationCategory;
  checkType: GuardrailCheckType;
  capability?: string | null;
  useCase?: string | null;
  modelProvider?: string | null;
  enabled: boolean;
  config: unknown;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  riskWeight: number;
  requiresApproval: boolean;
  priority: number;
  stopOnMatch: boolean;
  version: number;
  tags: string[];
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedGuardrailRuleResponseDto {
  data: GuardrailRuleResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GuardrailRuleVersionResponseDto {
  id: string;
  ruleId: string;
  version: number;
  snapshot: unknown;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export class GuardrailOverrideResponseDto {
  id: string;
  scope: GuardrailOverrideScope;
  ruleId?: string | null;
  workspaceId?: string | null;
  providerKey?: string | null;
  modelId?: string | null;
  enabledOverride?: boolean | null;
  decisionOverride?: GuardrailDecision | null;
  severityOverride?: GuardrailSeverity | null;
  priority: number;
  reason?: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedGuardrailOverrideResponseDto {
  data: GuardrailOverrideResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GuardrailEvaluationResultResponseDto {
  id: string;
  evaluationId: string;
  ruleId?: string | null;
  ruleName: string;
  category: GuardrailViolationCategory;
  matched: boolean;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  reason: string;
  matchCount: number;
  createdAt: Date;
}

export class GuardrailEvaluationResponseDto {
  id: string;
  workspaceId: string;
  stage: GuardrailStage;
  status: GuardrailEvaluationStatus;
  capability?: string | null;
  useCase?: string | null;
  modelProvider?: string | null;
  orchestratorRequestId?: string | null;
  agentExecutionId?: string | null;
  workflowExecutionId?: string | null;
  toolName?: string | null;
  actionName?: string | null;
  riskScore: number;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  reasons: string[];
  matchedRuleCount: number;
  requiresApproval: boolean;
  createdAt: Date;
}

export class PaginatedGuardrailEvaluationResponseDto {
  data: GuardrailEvaluationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GuardrailEvaluationOutcomeResponseDto {
  evaluationId: string;
  stage: GuardrailStage;
  riskScore: number;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  reasons: string[];
  matchedRuleCount: number;
  requiresApproval: boolean;
  approvalId?: string;
  incidentId?: string;
  redactedContent?: string;
}

export class GuardrailIncidentResponseDto {
  id: string;
  workspaceId: string;
  evaluationId?: string | null;
  category: GuardrailViolationCategory;
  severity: GuardrailSeverity;
  decision: GuardrailDecision;
  status: GuardrailIncidentStatus;
  description: string;
  reportedBy?: string | null;
  assignedTo?: string | null;
  resolution?: string | null;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedGuardrailIncidentResponseDto {
  data: GuardrailIncidentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GuardrailApprovalResponseDto {
  id: string;
  workspaceId: string;
  evaluationId: string;
  status: GuardrailApprovalStatus;
  stage: GuardrailStage;
  category: GuardrailViolationCategory;
  severity: GuardrailSeverity;
  requestedBy?: string | null;
  decidedBy?: string | null;
  decidedAt?: Date | null;
  reason?: string | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedGuardrailApprovalResponseDto {
  data: GuardrailApprovalResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
