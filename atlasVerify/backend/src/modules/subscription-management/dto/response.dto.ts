import {
  SubscriptionScope,
  SubscriptionType,
  SubscriptionBillingCycle,
  SubscriptionStatus,
  SubscriptionChangeType,
  IProrationReference,
  IScheduledChange,
} from '../interfaces';

export class SubscriptionResponseDto {
  id: string;
  scope: SubscriptionScope;
  organizationId: string | null;
  workspaceId: string | null;
  type: SubscriptionType;
  planKey: string;
  billingCycle: SubscriptionBillingCycle;
  customBillingCycleDays: number | null;
  status: SubscriptionStatus;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
  startAt: Date;
  endAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  renewalDate: Date | null;
  gracePeriodDays: number;
  gracePeriodEndsAt: Date | null;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  pausedAt: Date | null;
  suspendedAt: Date | null;
  scheduledChange: IScheduledChange | null;
  prorationReference: IProrationReference | null;
  isAdminOverride: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedSubscriptionResponseDto {
  data: SubscriptionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SubscriptionHistoryResponseDto {
  id: string;
  subscriptionId: string;
  changeType: SubscriptionChangeType;
  fromStatus: SubscriptionStatus | null;
  toStatus: SubscriptionStatus;
  fromPlanKey: string | null;
  toPlanKey: string | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
}

export class SubscriptionEntitlementResponseDto {
  subscriptionId: string;
  scope: SubscriptionScope;
  status: SubscriptionStatus;
  type: SubscriptionType;
  planKey: string;
  isTrial: boolean;
  isActive: boolean;
}
