import { UsageRecordSource, UsageThresholdLevel } from '../interfaces';

export class UsageRecordResponseDto {
  id!: string;
  workspaceId!: string;
  module!: string;
  feature!: string | null;
  resourceKey!: string;
  quantity!: number;
  unit!: string;
  source!: UsageRecordSource;
  correlationId!: string | null;
  billingPeriodId!: string | null;
  subscriptionId!: string | null;
  occurredAt!: Date;
  recordedAt!: Date;
  isReversed!: boolean;
}

export class PaginatedUsageRecordResponseDto {
  data!: UsageRecordResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class UsageCorrectionResponseDto {
  id!: string;
  workspaceId!: string;
  originalRecordId!: string;
  correctionType!: string;
  quantityDelta!: number;
  reason!: string;
  changedBy!: string | null;
  createdAt!: Date;
}

export class UsageBucketResponseDto {
  bucketStart!: Date;
  totalQuantity!: number;
  recordCount!: number;
}

export class UsageLimitReferenceResponseDto {
  resourceKey!: string;
  unit?: string;
  soft?: number;
  hard?: number;
  graceThreshold?: number;
  overageRule?: string;
}

export class UsageEntitlementComparisonResponseDto {
  workspaceId!: string;
  resourceKey!: string;
  unit!: string;
  currentUsage!: number;
  limit!: UsageLimitReferenceResponseDto | null;
  remaining!: number | null;
  overageAmount!: number;
  thresholdLevel!: UsageThresholdLevel;
  forecastedUsage!: number | null;
  periodStart!: Date | null;
  periodEnd!: Date | null;
}

export class UsageSummaryResponseDto {
  workspaceId!: string;
  resourceKey!: string;
  unit!: string;
  currentPeriodUsage!: number;
  allTimeUsage!: number;
  comparison!: UsageEntitlementComparisonResponseDto | null;
}
