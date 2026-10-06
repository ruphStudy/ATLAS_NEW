import { AppInstallationStatus, AppListingStatus, AppPricingModel, AppPublisherType, AppVersionStatus } from '../interfaces';

export class AppListingResponseDto {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  publisherType: AppPublisherType;
  publisherName: string | null;
  publisherId: string | null;
  organizationId: string | null;
  pricingModel: AppPricingModel;
  planKey: string | null;
  regions: string[];
  permissions: string[];
  scopes: string[];
  dependencies: string[];
  featureFlagKey: string | null;
  currentVersion: string | null;
  status: AppListingStatus;
  installCount: number;
  activeTenantCount: number;
  averageRating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedAppListingResponseDto {
  data: AppListingResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AppVersionResponseDto {
  id: string;
  appKey: string;
  versionString: string;
  manifest: unknown;
  status: AppVersionStatus;
  publishedAt: Date | null;
  deprecatedAt: Date | null;
  createdAt: Date;
}

/** Never includes `encryptedCredentials` — safe metadata only. */
export class AppInstallationResponseDto {
  id: string;
  appKey: string;
  versionId: string;
  workspaceId: string;
  organizationId: string | null;
  status: AppInstallationStatus;
  config: unknown;
  licenseId: string | null;
  subscriptionId: string | null;
  installedAt: Date;
  enabledAt: Date | null;
  disabledAt: Date | null;
  uninstalledAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedAppInstallationResponseDto {
  data: AppInstallationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AppReviewResponseDto {
  id: string;
  appKey: string;
  workspaceId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export class PaginatedAppReviewResponseDto {
  data: AppReviewResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AppHistoryResponseDto {
  id: string;
  entityType: string;
  entityId: string;
  changeType: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  createdAt: Date;
}

export class AppHealthResponseDto {
  appKey: string;
  installCount: number;
  activeTenantCount: number;
  averageRating: number;
  ratingCount: number;
}
