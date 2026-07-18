import {
  ApprovalCheckResult,
  ApprovalRule,
  ApprovalStatus,
  ApprovalValidationSummary,
} from '../interfaces';

export class ListingApprovalHistoryResponseDto {
  id!: string;
  approvalId!: string;
  workspaceId!: string;
  fromStatus!: ApprovalStatus;
  toStatus!: ApprovalStatus;
  version!: number;
  reason?: string | null;
  changedBy?: string | null;
  checkResults?: ApprovalCheckResult[] | null;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): ListingApprovalHistoryResponseDto {
    const dto = new ListingApprovalHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.approvalId = raw['approvalId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = raw['fromStatus'] as ApprovalStatus;
    dto.toStatus = raw['toStatus'] as ApprovalStatus;
    dto.version = raw['version'] as number;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.checkResults = (raw['checkResults'] as ApprovalCheckResult[] | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}

export class ListingApprovalResponseDto {
  id!: string;
  workspaceId!: string;
  listingId!: string;
  catalogProductId!: string;
  status!: ApprovalStatus;
  version!: number;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  approvalComment?: string | null;
  rejectionReason?: string | null;
  revisionNotes?: string | null;
  checkResults?: ApprovalCheckResult[] | null;
  validationSummary?: ApprovalValidationSummary | null;
  approvalRules?: ApprovalRule[] | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): ListingApprovalResponseDto {
    const dto = new ListingApprovalResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.listingId = raw['listingId'] as string;
    dto.catalogProductId = raw['catalogProductId'] as string;
    dto.status = raw['status'] as ApprovalStatus;
    dto.version = raw['version'] as number;
    dto.reviewedBy = (raw['reviewedBy'] as string | null) ?? null;
    dto.reviewedAt = (raw['reviewedAt'] as Date | null) ?? null;
    dto.approvalComment = (raw['approvalComment'] as string | null) ?? null;
    dto.rejectionReason = (raw['rejectionReason'] as string | null) ?? null;
    dto.revisionNotes = (raw['revisionNotes'] as string | null) ?? null;
    dto.checkResults = (raw['checkResults'] as ApprovalCheckResult[] | null) ?? null;
    dto.validationSummary = (raw['validationSummary'] as ApprovalValidationSummary | null) ?? null;
    dto.approvalRules = (raw['approvalRules'] as ApprovalRule[] | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class ListingApprovalListResponseDto {
  data!: ListingApprovalResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): ListingApprovalListResponseDto {
    const dto = new ListingApprovalListResponseDto();
    dto.data = items.map(ListingApprovalResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class ListingApprovalStatsDto {
  total!: number;
  byStatus!: Record<string, number>;
  pendingCount!: number;
  approvedCount!: number;
  rejectedCount!: number;
  revisionRequiredCount!: number;
  readyToPublishCount!: number;
}
