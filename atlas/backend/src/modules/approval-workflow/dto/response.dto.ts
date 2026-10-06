import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApprovalWorkflowMode,
  ApprovalWorkflowStatus,
  ApprovalRequestStatus,
  ApprovalStepStatus,
  ApprovalAssignmentStatus,
  ApproverType,
  ApprovalDecisionAction,
} from '../interfaces';

export class WorkflowDefinitionResponseDto {
  id!: string;
  workspaceId!: string;
  organizationId?: string | null;
  businessId?: string | null;
  key!: string;
  name!: string;
  description?: string | null;
  module!: string;
  entityType?: string | null;
  mode!: ApprovalWorkflowMode;
  steps: unknown;
  matchCriteria?: unknown;
  slaHours?: number | null;
  escalation?: unknown;
  isTemplate!: boolean;
  templateKey?: string | null;
  version!: number;
  status!: ApprovalWorkflowStatus;
  createdAt!: Date;
  updatedAt!: Date;
  publishedAt?: Date | null;
}

export class PaginatedWorkflowDefinitionResponseDto {
  data!: WorkflowDefinitionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class WorkflowDefinitionHistoryResponseDto {
  id!: string;
  definitionId!: string;
  @ApiPropertyOptional({ enum: ApprovalWorkflowStatus, nullable: true })
  fromStatus?: ApprovalWorkflowStatus | null;
  toStatus!: ApprovalWorkflowStatus;
  version!: number;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt!: Date;
}

export class ApprovalAssignmentResponseDto {
  id!: string;
  stepInstanceId!: string;
  approverType!: ApproverType;
  approverRef!: string;
  status!: ApprovalAssignmentStatus;
  delegatedToUserId?: string | null;
}

export class ApprovalStepInstanceResponseDto {
  id!: string;
  requestId!: string;
  stepIndex!: number;
  name!: string;
  status!: ApprovalStepStatus;
  strategy!: string;
  requiredApprovals!: number;
  receivedApprovals!: number;
  dueAt?: Date | null;
  escalatedAt?: Date | null;
  assignments?: ApprovalAssignmentResponseDto[];
}

export class ApprovalRequestResponseDto {
  id!: string;
  workspaceId!: string;
  organizationId?: string | null;
  businessId?: string | null;
  definitionId!: string;
  definitionVersion!: number;
  module!: string;
  entityType!: string;
  entityId!: string;
  requestedBy?: string | null;
  title!: string;
  amount?: number | null;
  riskLevel?: string | null;
  countryCode?: string | null;
  marketplaceKey?: string | null;
  currentStepIndex!: number;
  status!: ApprovalRequestStatus;
  sourceWorkflowExecutionId?: string | null;
  sourceWorkflowStepExecutionId?: string | null;
  metadata: unknown;
  slaDueAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  completedAt?: Date | null;
}

export class PaginatedApprovalRequestResponseDto {
  data!: ApprovalRequestResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class ApprovalDecisionResponseDto {
  id!: string;
  requestId!: string;
  stepInstanceId?: string | null;
  decidedBy!: string;
  action!: ApprovalDecisionAction;
  comment?: string | null;
  delegatedToUserId?: string | null;
  reassignedToUserId?: string | null;
  evidence?: unknown;
  sourceReference?: unknown;
  createdAt!: Date;
}
