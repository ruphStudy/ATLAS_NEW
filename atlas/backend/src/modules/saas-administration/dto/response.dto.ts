import { SupportStatus } from '../interfaces';

export class TenantSummaryResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  status!: string;
  plan!: string | null;
  createdAt!: Date;
}

export class PaginatedTenantResponseDto {
  data!: TenantSummaryResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class TenantOverviewResponseDto {
  workspace!: { id: string; name: string; status: string; plan: string | null };
  subscription!: { id: string; status: string; planKey: string; isTrial: boolean } | null;
  billing!: { outstandingBalance: number; latestPeriodStatus: string | null } | null;
  recentPaymentFailures!: number;
  quotaViolations!: number;
  adminProfile!: TenantAdminProfileResponseDto | null;
}

export class TenantAdminProfileResponseDto {
  id!: string;
  workspaceId!: string;
  internalFlags!: string[];
  supportStatus!: SupportStatus;
  updatedBy!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class AdminNoteResponseDto {
  id!: string;
  workspaceId!: string;
  note!: string;
  createdBy!: string | null;
  createdAt!: Date;
}

export class AdminActionLogResponseDto {
  id!: string;
  actionType!: string;
  targetWorkspaceId!: string | null;
  targetUserId!: string | null;
  performedBy!: string;
  reason!: string | null;
  createdAt!: Date;
}

export class PaginatedAdminActionLogResponseDto {
  data!: AdminActionLogResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

/** The only response shape carrying impersonation session tokens. */
export class ImpersonationResponseDto {
  accessToken!: string;
  refreshToken!: string;
  sessionId!: string;
  targetUserId!: string;
  targetWorkspaceId!: string;
}

/** Listing/history shape — deliberately omits tokens (those only ever appear once, in `ImpersonationResponseDto`, at session start). */
export class ImpersonationSessionSummaryResponseDto {
  id!: string;
  adminUserId!: string;
  targetUserId!: string;
  targetWorkspaceId!: string;
  reason!: string;
  ipAddress!: string | null;
  status!: string;
  startedAt!: Date;
  endedAt!: Date | null;
}

export class PaginatedImpersonationSessionResponseDto {
  data!: ImpersonationSessionSummaryResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
