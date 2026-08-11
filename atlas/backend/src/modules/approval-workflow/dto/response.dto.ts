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
  id: string;
  workspaceId: string;
  key: string;
  name: string;
  description?: string | null;
  module: string;
  entityType?: string | null;
  mode: ApprovalWorkflowMode;
  steps: unknown;
  matchCriteria?: unknown;
  slaHours?: number | null;
  escalation?: unknown;
  version: number;
  status: ApprovalWorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
}

export class PaginatedWorkflowDefinitionResponseDto {
  data: WorkflowDefinitionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class WorkflowDefinitionHistoryResponseDto {
  id: string;
  definitionId: string;
  fromStatus?: ApprovalWorkflowStatus | null;
  toStatus: ApprovalWorkflowStatus;
  version: number;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export class ApprovalAssignmentResponseDto {
  id: string;
  stepInstanceId: string;
  approverType: ApproverType;
  approverRef: string;
  status: ApprovalAssignmentStatus;
  delegatedToUserId?: string | null;
}

export class ApprovalStepInstanceResponseDto {
  id: string;
  requestId: string;
  stepIndex: number;
  name: string;
  status: ApprovalStepStatus;
  requiredApprovals: number;
  receivedApprovals: number;
  dueAt?: Date | null;
  assignments?: ApprovalAssignmentResponseDto[];
}

export class ApprovalRequestResponseDto {
  id: string;
  workspaceId: string;
  definitionId: string;
  definitionVersion: number;
  module: string;
  entityType: string;
  entityId: string;
  requestedBy?: string | null;
  title: string;
  amount?: number | null;
  riskLevel?: string | null;
  currentStepIndex: number;
  status: ApprovalRequestStatus;
  metadata: unknown;
  slaDueAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

export class PaginatedApprovalRequestResponseDto {
  data: ApprovalRequestResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ApprovalDecisionResponseDto {
  id: string;
  requestId: string;
  stepInstanceId?: string | null;
  decidedBy: string;
  action: ApprovalDecisionAction;
  comment?: string | null;
  delegatedToUserId?: string | null;
  reassignedToUserId?: string | null;
  createdAt: Date;
}
