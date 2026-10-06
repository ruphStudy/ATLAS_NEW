import { QuotaEnforcementState, QuotaOverrideStatus, QuotaPolicyStatus, QuotaResetSchedule, QuotaScopeType } from '../interfaces';

export class QuotaPolicyResponseDto {
  id!: string;
  workspaceId!: string | null;
  organizationId!: string | null;
  scopeType!: QuotaScopeType;
  scopeKey!: string;
  resourceKey!: string;
  feature!: string;
  planKey!: string | null;
  unit!: string | null;
  softLimit!: number | null;
  hardLimit!: number | null;
  graceThreshold!: number | null;
  overageAllowed!: boolean;
  overageLimit!: number | null;
  resetSchedule!: QuotaResetSchedule;
  customResetIntervalDays!: number | null;
  status!: QuotaPolicyStatus;
  version!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedQuotaPolicyResponseDto {
  data!: QuotaPolicyResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class QuotaOverrideResponseDto {
  id!: string;
  policyId!: string;
  workspaceId!: string | null;
  organizationId!: string | null;
  scopeKey!: string;
  resourceKey!: string;
  feature!: string;
  additionalHardLimit!: number | null;
  reason!: string;
  status!: QuotaOverrideStatus;
  expiresAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedQuotaOverrideResponseDto {
  data!: QuotaOverrideResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class QuotaStateResponseDto {
  id!: string;
  workspaceId!: string | null;
  scopeKey!: string;
  resourceKey!: string;
  feature!: string;
  state!: QuotaEnforcementState;
  consumedAtLastCheck!: number;
  limitAtLastCheck!: number | null;
  lastEvaluatedAt!: Date;
  currentPeriodStart!: Date | null;
  currentPeriodEnd!: Date | null;
  lastResetAt!: Date | null;
  nextResetAt!: Date | null;
}

export class QuotaHistoryResponseDto {
  id!: string;
  entityType!: string;
  entityId!: string;
  resourceKey!: string;
  changeType!: string;
  fromValue: unknown;
  toValue: unknown;
  reason!: string | null;
  changedBy!: string | null;
  createdAt!: Date;
}

export class QuotaCheckResponseDto {
  allowed!: boolean;
  state!: QuotaEnforcementState;
  resourceKey!: string;
  feature!: string;
  consumed!: number;
  limit!: number | null;
  remaining!: number | null;
  overage!: number;
  reason?: string;
}
