// =============================================================
// Listing Approval – Interfaces & Types
// =============================================================

export enum ApprovalStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVISION_REQUIRED = 'REVISION_REQUIRED',
  READY_TO_PUBLISH = 'READY_TO_PUBLISH',
}

export enum ApprovalCheckArea {
  PRODUCT_INFORMATION = 'PRODUCT_INFORMATION',
  IMAGES = 'IMAGES',
  AI_DESCRIPTION = 'AI_DESCRIPTION',
  SEO = 'SEO',
  PRICING = 'PRICING',
  CATEGORY = 'CATEGORY',
  ATTRIBUTES = 'ATTRIBUTES',
  VARIANTS = 'VARIANTS',
  MARKETPLACE_REQUIREMENTS = 'MARKETPLACE_REQUIREMENTS',
}

export enum ApprovalEvent {
  APPROVED = 'listing-approval.approved',
  REJECTED = 'listing-approval.rejected',
  REVISION_REQUESTED = 'listing-approval.revision-requested',
  READY_TO_PUBLISH = 'listing-approval.ready-to-publish',
}

// ── Rule / Check Types ────────────────────────────────────────

export interface ApprovalRule {
  area: ApprovalCheckArea;
  required: boolean;
  description: string;
}

export interface ApprovalCheckResult {
  area: ApprovalCheckArea;
  passed: boolean;
  notes?: string | null;
}

export interface ApprovalValidationSummary {
  allPassed: boolean;
  passedAreas: ApprovalCheckArea[];
  failedAreas: ApprovalCheckArea[];
  checkResults: ApprovalCheckResult[];
}

// ── Main Interfaces ───────────────────────────────────────────

export interface IListingApproval {
  id: string;
  workspaceId: string;
  listingId: string;
  catalogProductId: string;
  status: ApprovalStatus;
  version: number;

  // Review
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  approvalComment?: string | null;
  rejectionReason?: string | null;
  revisionNotes?: string | null;

  // Validation
  checkResults?: ApprovalCheckResult[] | null;
  validationSummary?: ApprovalValidationSummary | null;
  approvalRules?: ApprovalRule[] | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IListingApprovalHistory {
  id: string;
  approvalId: string;
  workspaceId: string;
  fromStatus: ApprovalStatus;
  toStatus: ApprovalStatus;
  version: number;
  reason?: string | null;
  changedBy?: string | null;
  checkResults?: ApprovalCheckResult[] | null;
  createdAt: Date;
}

// ── Job Payloads ─────────────────────────────────────────────

export interface ApprovalEventPayload {
  approvalId: string;
  listingId: string;
  catalogProductId: string;
  workspaceId: string;
  event: ApprovalEvent;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalNotificationJobPayload {
  approvalId: string;
  listingId: string;
  catalogProductId: string;
  workspaceId: string;
  event: ApprovalEvent;
  triggeredBy?: string;
  comment?: string;
}
