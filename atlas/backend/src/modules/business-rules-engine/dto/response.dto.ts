import { RuleScope, RuleStatus, RuleTriggerType, RuleExecutionStatus } from '../interfaces';

export class RuleResponseDto {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  scope: RuleScope;
  module: string;
  key: string;
  name: string;
  description?: string | null;
  triggerType: RuleTriggerType;
  triggerRef?: string | null;
  conditions: unknown;
  actions: unknown;
  priority: number;
  executionOrder: number;
  stopOnMatch: boolean;
  isSystem: boolean;
  scheduleIntervalMinutes?: number | null;
  nextRunAt?: Date | null;
  version: number;
  status: RuleStatus;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedRuleResponseDto {
  data: RuleResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class RuleHistoryResponseDto {
  id: string;
  ruleId: string;
  fromStatus?: RuleStatus | null;
  toStatus: RuleStatus;
  version: number;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export class RuleExecutionResponseDto {
  id: string;
  ruleId: string;
  ruleVersion: number;
  module: string;
  triggerType: RuleTriggerType;
  triggerRef?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  status: RuleExecutionStatus;
  matched: boolean;
  input: unknown;
  actionsExecuted?: unknown;
  errorMessage?: string | null;
  idempotencyKey?: string | null;
  durationMs?: number | null;
  createdAt: Date;
}

export class PaginatedRuleExecutionResponseDto {
  data: RuleExecutionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class RuleValidationIssueResponseDto {
  severity: 'ERROR' | 'WARNING';
  code: string;
  message: string;
}

export class RuleEvaluationResponseDto {
  matched: boolean;
  blocked: boolean;
  blockReason?: string;
  results: unknown[];
}

export class RuleSimulationResponseDto {
  matched: boolean;
  matchedConditions: unknown;
  wouldExecuteActions: unknown[];
  validation: RuleValidationIssueResponseDto[];
}
