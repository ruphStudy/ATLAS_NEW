import {
  AiAuditActorType,
  AiAuditAction,
  AiAuditOutcome,
  IAiAuditLog,
  IAiAuditSummary,
} from '../interfaces';

export class AuditLogResponseDto implements IAiAuditLog {
  id!: string;
  workspaceId!: string;
  actorType!: AiAuditActorType;
  actorId?: string;
  actorName?: string;
  action!: AiAuditAction;
  outcome!: AiAuditOutcome;
  capability?: string;
  useCase?: string;
  provider?: string;
  model?: string;
  agentId?: string;
  agentExecutionId?: string;
  workflowId?: string;
  workflowExecutionId?: string;
  jobId?: string;
  jobExecutionId?: string;
  queueJobId?: string;
  orchestratorRequestId?: string;
  correlationId?: string;
  externalReferenceId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  latencyMs?: number;
  validationResult?: string;
  guardrailDecision?: string;
  guardrailReasons!: string[];
  inputReference?: string;
  outputReference?: string;
  errorCode?: string;
  errorMessage?: string;
  suspicious!: boolean;
  suspicionReasons!: string[];
  ipAddress?: string;
  userAgent?: string;
  tags!: string[];
  metadata!: Record<string, unknown>;
  timestamp!: Date;
  retentionDate?: Date;
  archivedAt?: Date;
}

export class PaginatedAuditLogResponseDto {
  data!: AuditLogResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class AuditSummaryResponseDto implements IAiAuditSummary {
  id!: string;
  workspaceId!: string;
  entityType!: string;
  entityId!: string;
  totalActivities!: number;
  successCount!: number;
  failureCount!: number;
  blockedCount!: number;
  totalTokens!: number;
  totalCost!: number;
  suspiciousCount!: number;
  firstActivityAt?: Date;
  lastActivityAt!: Date;
  periodStart!: Date;
  periodEnd!: Date;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;
}
