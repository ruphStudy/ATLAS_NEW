import {
  BillingPeriodStatus,
  BillingCycle,
  BillingTriggerType,
  BillingItemType,
  BillingHistoryChangeType,
  BillingRuleScope,
  ProrationStrategy,
  IOverageRate,
} from '../interfaces';

export class BillingItemResponseDto {
  id!: string;
  billingPeriodId!: string;
  type!: BillingItemType;
  description!: string;
  quantity!: number | null;
  unitAmount!: number | null;
  amount!: number;
  currency!: string;
  planKey!: string | null;
  resourceKey!: string | null;
  calculationInput!: Record<string, unknown> | null;
  createdAt!: Date;
}

export class BillingPeriodResponseDto {
  id!: string;
  workspaceId!: string;
  organizationId!: string | null;
  subscriptionId!: string | null;
  triggerType!: BillingTriggerType;
  billingCycle!: BillingCycle;
  periodStart!: Date;
  periodEnd!: Date;
  dueDate!: Date;
  currency!: string;
  status!: BillingPeriodStatus;
  subtotal!: number;
  discountTotal!: number;
  creditTotal!: number;
  taxTotal!: number;
  overageTotal!: number;
  adjustmentTotal!: number;
  total!: number;
  amountPaid!: number;
  balanceDue!: number;
  externalReference!: Record<string, unknown> | null;
  version!: number;
  generatedAt!: Date;
  billedAt!: Date | null;
  paidAt!: Date | null;
  voidedAt!: Date | null;
  refundedAt!: Date | null;
  items?: BillingItemResponseDto[];
}

export class PaginatedBillingPeriodResponseDto {
  data!: BillingPeriodResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class BillingHistoryResponseDto {
  id!: string;
  billingPeriodId!: string;
  changeType!: BillingHistoryChangeType;
  fromStatus!: BillingPeriodStatus | null;
  toStatus!: BillingPeriodStatus;
  reason!: string | null;
  changedBy!: string | null;
  createdAt!: Date;
}

export class BillingRuleResponseDto {
  id!: string;
  scope!: BillingRuleScope;
  workspaceId!: string | null;
  organizationId!: string | null;
  planKey!: string | null;
  country!: string | null;
  region!: string | null;
  priority!: number;
  taxRatePercent!: number | null;
  prorationStrategy!: ProrationStrategy;
  gracePeriodDays!: number | null;
  overageRates!: IOverageRate[] | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ReconciliationReportResponseDto {
  billingPeriodId!: string;
  isConsistent!: boolean;
  discrepancies!: string[];
  checkedAt!: Date;
}
