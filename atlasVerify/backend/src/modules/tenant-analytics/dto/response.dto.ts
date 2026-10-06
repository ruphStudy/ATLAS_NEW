import { TenantRiskLevel } from '../interfaces';

export class TenantGrowthMetricsResponseDto {
  totalTenants: number;
  activeTenants: number;
  newTenants: number;
  churnedTenants: number;
  totalUsers: number;
}

export class TenantRevenueMetricsResponseDto {
  mrr: number;
  arr: number;
  arpu: number;
  currency: string;
  tenantCount: number;
}

export class TenantChurnMetricsResponseDto {
  upgrades: number;
  downgrades: number;
  cancellations: number;
  renewals: number;
  trialConversions: number;
  trialExpirations: number;
}

export class TenantPaymentHealthResponseDto {
  succeededCount: number;
  failedCount: number;
  overdueInvoiceCount: number;
  outstandingRevenue: number;
}

export class TenantHealthSnapshotResponseDto {
  workspaceId: string;
  healthScore: number;
  riskLevel: TenantRiskLevel;
  segments: string[];
  usageScore: number;
  billingScore: number;
  activityScore: number;
  supportScore: number;
  computedAt: Date;
}

export class PaginatedTenantSegmentResponseDto {
  data: { workspaceId: string; healthScore: number; riskLevel: TenantRiskLevel; segments: string[] }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CohortRetentionResponseDto {
  cohortMonth: string;
  tenantsInCohort: number;
  retentionByMonth: Record<string, number>;
}

export class PlanComparisonResponseDto {
  planKey: string;
  tenantCount: number;
  averageRevenue: number;
}
