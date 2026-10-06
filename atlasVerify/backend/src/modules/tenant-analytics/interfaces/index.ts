export enum TenantRiskLevel {
  HEALTHY = 'HEALTHY',
  AT_RISK = 'AT_RISK',
  CRITICAL = 'CRITICAL',
}

/** Open, configuration-driven vocabulary — a tenant can carry multiple tags simultaneously (e.g. HIGH_VALUE and AT_RISK at once). Not a closed enum by design; these are just the well-known starter tags this module's own segmentation logic emits. */
export const TENANT_SEGMENT_TAGS = {
  INACTIVE: 'INACTIVE',
  HIGH_GROWTH: 'HIGH_GROWTH',
  AT_RISK: 'AT_RISK',
  HIGH_VALUE: 'HIGH_VALUE',
  OVER_LIMIT: 'OVER_LIMIT',
} as const;

export enum TenantAnalyticsEvent {
  HEALTH_SCORE_COMPUTED = 'tenant-analytics.health_score_computed',
  TENANT_RISK_INCREASED = 'tenant-analytics.tenant_risk_increased',
  TENANT_RISK_DECREASED = 'tenant-analytics.tenant_risk_decreased',
  TENANT_SEGMENT_CHANGED = 'tenant-analytics.tenant_segment_changed',
}

export interface ITenantHealthSnapshot {
  id: string;
  workspaceId: string;
  healthScore: number;
  riskLevel: TenantRiskLevel;
  segments: string[];
  usageScore: number;
  billingScore: number;
  activityScore: number;
  supportScore: number;
  previousRiskLevel: TenantRiskLevel | null;
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDateRange {
  start: Date;
  end: Date;
}

export interface ITenantGrowthMetrics {
  totalTenants: number;
  activeTenants: number;
  newTenants: number;
  churnedTenants: number;
  totalUsers: number;
}

export interface ITenantRevenueMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  currency: string;
  tenantCount: number;
}

export interface ITenantChurnMetrics {
  upgrades: number;
  downgrades: number;
  cancellations: number;
  renewals: number;
  trialConversions: number;
  trialExpirations: number;
}

export interface ITenantPaymentHealth {
  succeededCount: number;
  failedCount: number;
  overdueInvoiceCount: number;
  outstandingRevenue: number;
}

export interface ITenantUsageBreakdownEntry {
  workspaceId: string;
  resourceKey: string;
  currentPeriodUsage: number;
}

export interface ITenantQuotaLicenseAdoption {
  workspaceId: string;
  activeLicenses: number;
  quotaOverages: number;
}

export interface ITenantSegmentEntry {
  workspaceId: string;
  healthScore: number;
  riskLevel: TenantRiskLevel;
  segments: string[];
}

export interface ICohortRetentionRow {
  cohortMonth: string;
  tenantsInCohort: number;
  retentionByMonth: Record<string, number>;
}

export interface IPlanComparisonEntry {
  planKey: string;
  tenantCount: number;
  averageRevenue: number;
}

export interface ITenantAnalyticsEventPayload {
  event: TenantAnalyticsEvent;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
}
