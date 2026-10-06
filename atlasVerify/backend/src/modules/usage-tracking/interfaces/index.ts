export enum UsageRecordSource {
  API = 'API',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  EVENT_DRIVEN = 'EVENT_DRIVEN',
  BATCH_IMPORT = 'BATCH_IMPORT',
  SYSTEM = 'SYSTEM',
}

export enum UsageThresholdLevel {
  NONE = 'NONE',
  SOFT = 'SOFT',
  HARD = 'HARD',
}

export enum UsageCorrectionType {
  REVERSAL = 'REVERSAL',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum UsageBucketGranularity {
  HOUR = 'HOUR',
  DAY = 'DAY',
  MONTH = 'MONTH',
  BILLING_CYCLE = 'BILLING_CYCLE',
}

export enum UsageTrackingEvent {
  USAGE_RECORDED = 'usage-tracking.usage_recorded',
  USAGE_REVERSED = 'usage-tracking.usage_reversed',
  USAGE_ADJUSTED = 'usage-tracking.usage_adjusted',
  THRESHOLD_WARNING = 'usage-tracking.threshold_warning',
  LIMIT_EXCEEDED = 'usage-tracking.limit_exceeded',
}

export interface IUsageRecord {
  id: string;
  workspaceId: string;
  organizationId: string | null;
  userId: string | null;
  module: string;
  feature: string | null;
  resourceKey: string;
  quantity: number;
  unit: string;
  source: UsageRecordSource;
  correlationId: string | null;
  billingPeriodId: string | null;
  subscriptionId: string | null;
  idempotencyKey: string | null;
  occurredAt: Date;
  recordedAt: Date;
  isReversed: boolean;
  reversalOfId: string | null;
  metadata: Record<string, unknown>;
}

export interface IUsageCorrection {
  id: string;
  workspaceId: string;
  originalRecordId: string;
  correctionType: UsageCorrectionType;
  quantityDelta: number;
  reason: string;
  changedBy: string | null;
  createdAt: Date;
}

export interface IUsageThresholdEvent {
  id: string;
  workspaceId: string;
  resourceKey: string;
  level: UsageThresholdLevel;
  currentQuantity: number;
  limitQuantity: number;
  billingPeriodId: string | null;
  notifiedAt: Date;
}

export interface IUsageBucket {
  bucketStart: Date;
  totalQuantity: number;
  recordCount: number;
}

/** Only the fields Usage Tracking needs from a plan's declared limit — sourced from Plan Management's `IPlanLimit`, never redefined independently. */
export interface IUsageLimitReference {
  resourceKey: string;
  unit?: string;
  soft?: number;
  hard?: number;
  graceThreshold?: number;
  overageRule?: string;
}

export interface IUsageEntitlementComparison {
  workspaceId: string;
  resourceKey: string;
  unit: string;
  currentUsage: number;
  limit: IUsageLimitReference | null;
  remaining: number | null;
  overageAmount: number;
  thresholdLevel: UsageThresholdLevel;
  forecastedUsage: number | null;
  periodStart: Date | null;
  periodEnd: Date | null;
}

export interface IUsageSummary {
  workspaceId: string;
  resourceKey: string;
  unit: string;
  currentPeriodUsage: number;
  allTimeUsage: number;
  comparison: IUsageEntitlementComparison | null;
}

export interface IUsageTrackingEventPayload {
  event: UsageTrackingEvent;
  workspaceId: string;
  resourceKey: string;
  recordId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
