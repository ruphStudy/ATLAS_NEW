import {
  PlanType,
  PlanStatus,
  PlanBillingCycle,
  PlanChangeType,
  IPlanPrice,
  IPlanEntitlement,
  IPlanLimit,
  IPlanDependencies,
  IPlanMigrationRules,
} from '../interfaces';

export class PlanResponseDto {
  id: string;
  code: string;
  version: number;
  name: string;
  description: string | null;
  tier: string;
  tierRank: number;
  type: PlanType;
  status: PlanStatus;
  supportedBillingCycles: PlanBillingCycle[];
  customBillingCycleDays: number | null;
  prices: IPlanPrice[];
  availableCountries: string[];
  availableRegions: string[];
  entitlements: IPlanEntitlement[];
  limits: IPlanLimit[];
  dependencies: IPlanDependencies | null;
  migrationRules: IPlanMigrationRules | null;
  effectiveAt: Date;
  publishedAt: Date | null;
  deprecatedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedPlanResponseDto {
  data: PlanResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PlanHistoryResponseDto {
  id: string;
  planId: string;
  code: string;
  version: number;
  changeType: PlanChangeType;
  fromStatus: PlanStatus | null;
  toStatus: PlanStatus;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
}

export class PlanEntitlementSnapshotResponseDto {
  code: string;
  version: number;
  status: PlanStatus;
  type: PlanType;
  tier: string;
  tierRank: number;
  effectiveAt: Date;
  prices: IPlanPrice[];
  availableCountries: string[];
  availableRegions: string[];
  entitlements: IPlanEntitlement[];
  limits: IPlanLimit[];
  entitlementsByKey: Record<string, IPlanEntitlement>;
  limitsByKey: Record<string, IPlanLimit>;
}

export class PlanCompatibilityResponseDto {
  compatible: boolean;
  direction: string;
  reason?: string;
}

export class PlanValidationIssueResponseDto {
  severity: 'ERROR' | 'WARNING';
  message: string;
}
