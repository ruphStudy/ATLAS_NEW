import { ApprovalWorkflowStatus, ApprovalRequestStatus } from '../interfaces';

export const APPROVAL_WORKFLOW_MODULE = 'approval-workflow';

export const APPROVAL_WORKFLOW_ALLOWED_TRANSITIONS: Record<ApprovalWorkflowStatus, ApprovalWorkflowStatus[]> = {
  [ApprovalWorkflowStatus.DRAFT]: [ApprovalWorkflowStatus.PUBLISHED, ApprovalWorkflowStatus.ARCHIVED],
  [ApprovalWorkflowStatus.PUBLISHED]: [ApprovalWorkflowStatus.PAUSED, ApprovalWorkflowStatus.ARCHIVED],
  [ApprovalWorkflowStatus.PAUSED]: [ApprovalWorkflowStatus.PUBLISHED, ApprovalWorkflowStatus.ARCHIVED],
  [ApprovalWorkflowStatus.ARCHIVED]: [ApprovalWorkflowStatus.DRAFT],
};

/** Terminal request statuses — no further decisions can be recorded once reached. */
export const APPROVAL_REQUEST_TERMINAL_STATUSES: ApprovalRequestStatus[] = [
  ApprovalRequestStatus.APPROVED,
  ApprovalRequestStatus.REJECTED,
  ApprovalRequestStatus.CANCELLED,
  ApprovalRequestStatus.RECALLED,
  ApprovalRequestStatus.EXPIRED,
];

/** Roles permitted to cancel/reassign any request in the workspace (beyond the requester's own recall right). */
export const APPROVAL_ADMIN_ROLES: string[] = ['OWNER', 'ADMIN'];

export const APPROVAL_DEFINITION_SORT_FIELDS = ['createdAt', 'updatedAt', 'key', 'name'] as const;
export const APPROVAL_REQUEST_SORT_FIELDS = ['createdAt', 'updatedAt', 'slaDueAt', 'status'] as const;

/** Cap on rows scanned per tick when lazily flipping past-due requests/steps — mirrors File/Document Management's bounded scans. */
export const APPROVAL_SLA_SCAN_LIMIT = 500;
