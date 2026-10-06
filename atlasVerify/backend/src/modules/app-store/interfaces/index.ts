export enum AppPublisherType {
  FIRST_PARTY = 'FIRST_PARTY',
  PARTNER = 'PARTNER',
  PRIVATE = 'PRIVATE',
}

export enum AppPricingModel {
  FREE = 'FREE',
  PAID = 'PAID',
  TRIAL = 'TRIAL',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export enum AppListingStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PUBLISHED = 'PUBLISHED',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
  REMOVED = 'REMOVED',
}

export enum AppVersionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  DEPRECATED = 'DEPRECATED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export enum AppInstallationStatus {
  INSTALLED = 'INSTALLED',
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  UNINSTALLED = 'UNINSTALLED',
}

export enum AppHistoryEntityType {
  LISTING = 'LISTING',
  VERSION = 'VERSION',
  INSTALLATION = 'INSTALLATION',
}

export enum AppChangeType {
  LISTING_REGISTERED = 'LISTING_REGISTERED',
  LISTING_UPDATED = 'LISTING_UPDATED',
  LISTING_SUBMITTED_FOR_APPROVAL = 'LISTING_SUBMITTED_FOR_APPROVAL',
  LISTING_APPROVED = 'LISTING_APPROVED',
  LISTING_REJECTED = 'LISTING_REJECTED',
  LISTING_PUBLISHED = 'LISTING_PUBLISHED',
  LISTING_SUSPENDED = 'LISTING_SUSPENDED',
  LISTING_ARCHIVED = 'LISTING_ARCHIVED',
  LISTING_REMOVED = 'LISTING_REMOVED',
  VERSION_PUBLISHED = 'VERSION_PUBLISHED',
  VERSION_DEPRECATED = 'VERSION_DEPRECATED',
  INSTALLED = 'INSTALLED',
  UNINSTALLED = 'UNINSTALLED',
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  UPGRADED = 'UPGRADED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export enum AppStoreEvent {
  LISTING_REGISTERED = 'app-store.listing_registered',
  LISTING_UPDATED = 'app-store.listing_updated',
  LISTING_SUBMITTED_FOR_APPROVAL = 'app-store.listing_submitted_for_approval',
  LISTING_APPROVED = 'app-store.listing_approved',
  LISTING_REJECTED = 'app-store.listing_rejected',
  LISTING_PUBLISHED = 'app-store.listing_published',
  LISTING_SUSPENDED = 'app-store.listing_suspended',
  LISTING_ARCHIVED = 'app-store.listing_archived',
  LISTING_REMOVED = 'app-store.listing_removed',
  VERSION_PUBLISHED = 'app-store.version_published',
  VERSION_DEPRECATED = 'app-store.version_deprecated',
  APP_INSTALLED = 'app-store.app_installed',
  APP_UNINSTALLED = 'app-store.app_uninstalled',
  APP_ENABLED = 'app-store.app_enabled',
  APP_DISABLED = 'app-store.app_disabled',
  APP_UPGRADED = 'app-store.app_upgraded',
  APP_ROLLED_BACK = 'app-store.app_rolled_back',
  REVIEW_SUBMITTED = 'app-store.review_submitted',
}

export interface IAppListing {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  publisherType: AppPublisherType;
  publisherName: string | null;
  publisherId: string | null;
  workspaceId: string | null;
  organizationId: string | null;
  pricingModel: AppPricingModel;
  planKey: string | null;
  regions: string[];
  permissions: string[];
  scopes: string[];
  dependencies: string[];
  featureFlagKey: string | null;
  currentVersionId: string | null;
  currentVersion: string | null;
  status: AppListingStatus;
  installCount: number;
  activeTenantCount: number;
  ratingSum: number;
  ratingCount: number;
  version: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAppVersion {
  id: string;
  appKey: string;
  versionString: string;
  manifest: unknown;
  status: AppVersionStatus;
  publishedAt: Date | null;
  deprecatedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAppInstallation {
  id: string;
  appKey: string;
  versionId: string;
  workspaceId: string;
  organizationId: string | null;
  status: AppInstallationStatus;
  config: unknown;
  encryptedCredentials: string | null;
  licenseId: string | null;
  subscriptionId: string | null;
  installedAt: Date;
  enabledAt: Date | null;
  disabledAt: Date | null;
  uninstalledAt: Date | null;
  lastUsedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAppReview {
  id: string;
  appKey: string;
  workspaceId: string;
  rating: number;
  comment: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface IAppHistory {
  id: string;
  entityType: AppHistoryEntityType;
  entityId: string;
  appKey: string;
  workspaceId: string | null;
  changeType: AppChangeType;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  changedBy: string | null;
  snapshot: unknown;
  createdAt: Date;
}

export interface IAppEligibilityResult {
  eligible: boolean;
  reason?: string;
}

export interface IAppStoreEventPayload {
  event: AppStoreEvent;
  appKey: string;
  entityId?: string;
  workspaceId?: string | null;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
