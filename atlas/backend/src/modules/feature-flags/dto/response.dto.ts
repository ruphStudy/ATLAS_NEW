import { FeatureFlagDefinitionStatus, FeatureFlagOverrideStatus, FeatureFlagScopeType, FeatureFlagType, IFeatureFlagTargetingRules } from '../interfaces';

export class FeatureFlagDefinitionResponseDto {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: FeatureFlagType;
  status: FeatureFlagDefinitionStatus;
  defaultEnabled: boolean;
  rolloutPercentage: number | null;
  startDate: Date | null;
  endDate: Date | null;
  dependencies: string[];
  mutuallyExclusiveWith: string[];
  priority: number;
  killSwitchEnabled: boolean;
  killSwitchReason: string | null;
  owner: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedFeatureFlagDefinitionResponseDto {
  data: FeatureFlagDefinitionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class FeatureFlagOverrideResponseDto {
  id: string;
  flagKey: string;
  scope: FeatureFlagScopeType;
  scopeKey: string;
  workspaceId: string | null;
  organizationId: string | null;
  status: FeatureFlagOverrideStatus;
  enabled: boolean;
  rolloutPercentage: number | null;
  rules: IFeatureFlagTargetingRules | null;
  startDate: Date | null;
  endDate: Date | null;
  version: number;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedFeatureFlagOverrideResponseDto {
  data: FeatureFlagOverrideResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class FeatureFlagHistoryResponseDto {
  id: string;
  entityType: string;
  entityId: string;
  flagKey: string;
  changeType: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
}

export class FeatureFlagEvaluationResponseDto {
  key: string;
  enabled: boolean;
  source: string;
  reason?: string;
}
