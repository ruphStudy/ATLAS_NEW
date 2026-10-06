import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionManagementService } from '@modules/subscription-management/subscription-management.service';
import { SubscriptionStatus } from '@modules/subscription-management/interfaces';
import { UsageTrackingService } from '@modules/usage-tracking/usage-tracking.service';
import { UsageRecordSource } from '@modules/usage-tracking/interfaces';
import { FeatureFlagsService } from '@modules/feature-flags/feature-flags.service';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { AppStoreRepository } from './app-store.repository';
import { AppStoreCredentialEncryptor } from './app-store-credential.encryptor';
import { AppStoreCredentialDecryptor } from './app-store-credential.decryptor';
import { AppStoreEventQueue } from './jobs';
import {
  RegisterAppListingDto,
  UpdateAppListingDto,
  AppListingFilterDto,
  AppStoreRequiredReasonDto,
  PublishVersionDto,
  RollbackVersionDto,
  InstallAppDto,
  UpdateInstallationDto,
  UpgradeAppDto,
  AppInstallationFilterDto,
  SubmitReviewDto,
  AppReviewFilterDto,
  PaginatedAppListingResponseDto,
  PaginatedAppInstallationResponseDto,
  PaginatedAppReviewResponseDto,
} from './dto';
import {
  AppChangeType,
  AppHistoryEntityType,
  AppInstallationStatus,
  AppListingStatus,
  AppPricingModel,
  AppPublisherType,
  AppStoreEvent,
  AppVersionStatus,
  IAppHistory,
  IAppInstallation,
  IAppListing,
  IAppReview,
  IAppVersion,
} from './interfaces';
import { APP_STORE_MANAGE_ROLES, APP_STORE_MODULE, APP_USAGE_RESOURCE_KEY } from './constants';
import {
  AppAccessDeniedException,
  AppAlreadyInstalledException,
  AppDependencyNotSatisfiedException,
  AppDependentInstallationExistsException,
  AppIncompatibleVersionException,
  AppInstallationNotFoundException,
  AppListingAlreadyExistsException,
  AppListingInvalidDefinitionException,
  AppListingInvalidStateTransitionException,
  AppListingNotFoundException,
  AppNotEligibleException,
  AppVersionAlreadyExistsException,
  AppVersionNotFoundException,
} from './exceptions/app-store.exceptions';

const LISTING_TRANSITIONS: Record<AppListingStatus, AppListingStatus[]> = {
  [AppListingStatus.DRAFT]: [AppListingStatus.PENDING_APPROVAL, AppListingStatus.PUBLISHED, AppListingStatus.ARCHIVED],
  [AppListingStatus.PENDING_APPROVAL]: [AppListingStatus.PUBLISHED, AppListingStatus.DRAFT],
  [AppListingStatus.PUBLISHED]: [AppListingStatus.SUSPENDED, AppListingStatus.ARCHIVED],
  [AppListingStatus.SUSPENDED]: [AppListingStatus.PUBLISHED, AppListingStatus.ARCHIVED],
  [AppListingStatus.ARCHIVED]: [AppListingStatus.REMOVED],
  [AppListingStatus.REMOVED]: [],
};

@Injectable()
export class AppStoreService {
  private readonly logger = new Logger(AppStoreService.name);

  constructor(
    private readonly repository: AppStoreRepository,
    private readonly encryptor: AppStoreCredentialEncryptor,
    private readonly decryptor: AppStoreCredentialDecryptor,
    private readonly subscriptionManagementService: SubscriptionManagementService,
    private readonly usageTrackingService: UsageTrackingService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: AppStoreEventQueue,
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // Listings — registration
  // ══════════════════════════════════════════════════════════════════

  /** Org-self-service — always PRIVATE, scoped to the caller's own workspace, no platform approval needed. */
  async registerPrivateApp(workspaceId: string, userId: string, userRole: string, dto: RegisterAppListingDto): Promise<IAppListing> {
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.createListingAndInitialVersion(dto, userId, {
      publisherType: AppPublisherType.PRIVATE,
      workspaceId,
      organizationId: dto.organizationId ?? null,
    });
  }

  /** Platform-only — FIRST_PARTY/PARTNER apps entering the public catalog, gated entirely by `PlatformAdminGuard` at the controller. */
  async registerCatalogApp(userId: string, dto: RegisterAppListingDto): Promise<IAppListing> {
    if (dto.publisherType === AppPublisherType.PRIVATE) {
      throw new AppListingInvalidDefinitionException('Use the private-app registration endpoint for PRIVATE listings');
    }
    return this.createListingAndInitialVersion(dto, userId, {
      publisherType: dto.publisherType,
      workspaceId: null,
      organizationId: null,
    });
  }

  async updateListing(key: string, workspaceId: string, userId: string, userRole: string, dto: UpdateAppListingDto): Promise<IAppListing> {
    const listing = await this.getVisibleListingOrThrow(key, workspaceId);
    if (listing.publisherType === AppPublisherType.PRIVATE) {
      await this.assertCanManage(workspaceId, userId, userRole);
    }

    const updated = await this.repository.updateListing(key, {
      name: dto.name ?? listing.name,
      description: dto.description ?? listing.description,
      category: dto.category ?? listing.category,
      regions: dto.regions ?? listing.regions,
      permissions: dto.permissions ?? listing.permissions,
      scopes: dto.scopes ?? listing.scopes,
      dependencies: dto.dependencies ?? listing.dependencies,
      featureFlagKey: dto.featureFlagKey ?? listing.featureFlagKey,
      version: listing.version + 1,
    });

    await this.recordHistory(AppHistoryEntityType.LISTING, listing.id, key, listing.workspaceId, AppChangeType.LISTING_UPDATED, null, this.sanitizeListing(updated), userId);
    await this.publishEvent(AppStoreEvent.LISTING_UPDATED, key, listing.id, listing.workspaceId, userId);
    return updated;
  }

  // ══════════════════════════════════════════════════════════════════
  // Listings — approval workflow + lifecycle
  // ══════════════════════════════════════════════════════════════════

  async submitForApproval(key: string, workspaceId: string, userId: string, userRole: string): Promise<IAppListing> {
    const listing = await this.getVisibleListingOrThrow(key, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionListing(listing, AppListingStatus.PENDING_APPROVAL, userId, AppChangeType.LISTING_SUBMITTED_FOR_APPROVAL, AppStoreEvent.LISTING_SUBMITTED_FOR_APPROVAL);
  }

  /** PRIVATE apps skip the platform review queue entirely — self-publish within their own tenant. */
  async publishPrivateApp(key: string, workspaceId: string, userId: string, userRole: string): Promise<IAppListing> {
    const listing = await this.getVisibleListingOrThrow(key, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    if (listing.publisherType !== AppPublisherType.PRIVATE) {
      throw new AppListingInvalidDefinitionException('Only PRIVATE listings can self-publish without approval');
    }
    return this.publishListingInternal(listing, userId);
  }

  /** Platform-only — gated entirely by `PlatformAdminGuard` at the controller. */
  async approveListing(key: string, userId: string): Promise<IAppListing> {
    const listing = await this.getListingOrThrow(key);
    const published = await this.publishListingInternal(listing, userId);
    await this.publishEvent(AppStoreEvent.LISTING_APPROVED, key, listing.id, listing.workspaceId, userId);
    return published;
  }

  async rejectListing(key: string, userId: string, dto: AppStoreRequiredReasonDto): Promise<IAppListing> {
    const listing = await this.getListingOrThrow(key);
    const rejected = await this.transitionListing(listing, AppListingStatus.DRAFT, userId, AppChangeType.LISTING_REJECTED, AppStoreEvent.LISTING_REJECTED, dto.reason);
    return rejected;
  }

  async suspendListing(key: string, userId: string, dto: AppStoreRequiredReasonDto): Promise<IAppListing> {
    const listing = await this.getListingOrThrow(key);
    return this.transitionListing(listing, AppListingStatus.SUSPENDED, userId, AppChangeType.LISTING_SUSPENDED, AppStoreEvent.LISTING_SUSPENDED, dto.reason, AuditRiskLevel.HIGH_RISK);
  }

  async reinstateListing(key: string, userId: string): Promise<IAppListing> {
    const listing = await this.getListingOrThrow(key);
    return this.transitionListing(listing, AppListingStatus.PUBLISHED, userId, AppChangeType.LISTING_PUBLISHED, AppStoreEvent.LISTING_PUBLISHED);
  }

  async archiveListing(key: string, workspaceId: string, userId: string, userRole: string): Promise<IAppListing> {
    const listing = await this.getVisibleListingOrThrow(key, workspaceId);
    if (listing.publisherType === AppPublisherType.PRIVATE) {
      await this.assertCanManage(workspaceId, userId, userRole);
    }
    return this.transitionListing(listing, AppListingStatus.ARCHIVED, userId, AppChangeType.LISTING_ARCHIVED, AppStoreEvent.LISTING_ARCHIVED);
  }

  async removeListing(key: string, userId: string): Promise<IAppListing> {
    const listing = await this.getListingOrThrow(key);
    return this.transitionListing(listing, AppListingStatus.REMOVED, userId, AppChangeType.LISTING_REMOVED, AppStoreEvent.LISTING_REMOVED, undefined, AuditRiskLevel.HIGH_RISK);
  }

  async getListing(key: string, workspaceId: string): Promise<IAppListing> {
    return this.getVisibleListingOrThrow(key, workspaceId);
  }

  async getListingHistory(key: string, workspaceId: string): Promise<IAppHistory[]> {
    const listing = await this.getVisibleListingOrThrow(key, workspaceId);
    return this.repository.findHistory(listing.id);
  }

  /** Public catalog (PUBLISHED FIRST_PARTY/PARTNER) plus this tenant's own PRIVATE listings. */
  async findAllListings(workspaceId: string, filter: AppListingFilterDto): Promise<PaginatedAppListingResponseDto> {
    const visibility = {
      OR: [
        { publisherType: { in: [AppPublisherType.FIRST_PARTY, AppPublisherType.PARTNER] }, status: AppListingStatus.PUBLISHED },
        { publisherType: AppPublisherType.PRIVATE, workspaceId },
      ],
    };
    const [data, total] = await this.repository.findAllListings(visibility, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return {
      data: data.map((l) => this.toListingResponse(l)) as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // Versions
  // ══════════════════════════════════════════════════════════════════

  async publishVersion(key: string, workspaceId: string, userId: string, userRole: string, dto: PublishVersionDto): Promise<IAppVersion> {
    const listing = await this.getVisibleListingOrThrow(key, workspaceId);
    if (listing.publisherType === AppPublisherType.PRIVATE) {
      await this.assertCanManage(workspaceId, userId, userRole);
    }

    const existing = await this.repository.findVersionByAppAndString(key, dto.versionString);
    if (existing) {
      throw new AppVersionAlreadyExistsException(dto.versionString);
    }

    await this.assertDependenciesResolvable(listing.dependencies, key);

    const version = await this.repository.createVersion({
      appKey: key,
      versionString: dto.versionString,
      manifest: (dto.manifest ?? null) as any,
      status: AppVersionStatus.PUBLISHED,
      publishedAt: new Date(),
      createdBy: userId,
    });

    await this.repository.updateListing(key, { currentVersionId: version.id, currentVersion: version.versionString });

    await this.recordHistory(AppHistoryEntityType.VERSION, version.id, key, listing.workspaceId, AppChangeType.VERSION_PUBLISHED, null, this.sanitizeVersion(version), userId);
    await this.recordAudit(workspaceId, userId, 'app-store.version.published', AuditActionCategory.PUBLISH, version.id);
    await this.publishEvent(AppStoreEvent.VERSION_PUBLISHED, key, version.id, listing.workspaceId, userId, { versionString: dto.versionString });

    return version;
  }

  async deprecateVersion(versionId: string, workspaceId: string, userId: string, userRole: string): Promise<IAppVersion> {
    const version = await this.getVersionOrThrow(versionId);
    const listing = await this.getVisibleListingOrThrow(version.appKey, workspaceId);
    if (listing.publisherType === AppPublisherType.PRIVATE) {
      await this.assertCanManage(workspaceId, userId, userRole);
    }

    const updated = await this.repository.updateVersion(versionId, { status: AppVersionStatus.DEPRECATED, deprecatedAt: new Date() });
    await this.recordHistory(AppHistoryEntityType.VERSION, versionId, version.appKey, listing.workspaceId, AppChangeType.VERSION_DEPRECATED, AppVersionStatus.PUBLISHED, AppVersionStatus.DEPRECATED, userId);
    await this.publishEvent(AppStoreEvent.VERSION_DEPRECATED, version.appKey, versionId, listing.workspaceId, userId);
    return updated;
  }

  async listVersions(key: string, workspaceId: string): Promise<IAppVersion[]> {
    await this.getVisibleListingOrThrow(key, workspaceId);
    return this.repository.findVersionsForApp(key);
  }

  // ══════════════════════════════════════════════════════════════════
  // Installation
  // ══════════════════════════════════════════════════════════════════

  async installApp(key: string, workspaceId: string, userId: string, userRole: string, dto: InstallAppDto): Promise<IAppInstallation> {
    const listing = await this.getVisibleListingOrThrow(key, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    if (listing.status !== AppListingStatus.PUBLISHED) {
      throw new AppNotEligibleException(`App '${key}' is not currently published`);
    }

    const existing = await this.repository.findInstallationByAppAndWorkspace(key, workspaceId);
    if (existing && existing.status !== AppInstallationStatus.UNINSTALLED) {
      throw new AppAlreadyInstalledException(key);
    }

    await this.assertDependenciesInstalled(listing.dependencies, workspaceId);
    await this.assertEligible(listing, workspaceId, userId, userRole);

    if (!listing.currentVersionId) {
      throw new AppListingInvalidDefinitionException(`App '${key}' has no published version to install`);
    }

    const encryptedCredentials = dto.credentials ? this.encryptor.encryptValue(dto.credentials, `WORKSPACE:${workspaceId}`) : null;

    const installation = existing
      ? await this.repository.updateInstallation(existing.id, {
          versionId: listing.currentVersionId,
          status: AppInstallationStatus.INSTALLED,
          config: (dto.config ?? null) as any,
          encryptedCredentials,
          installedAt: new Date(),
          uninstalledAt: null,
        })
      : await this.repository.createInstallation({
          appKey: key,
          versionId: listing.currentVersionId,
          workspaceId,
          organizationId: listing.organizationId,
          status: AppInstallationStatus.INSTALLED,
          config: (dto.config ?? null) as any,
          encryptedCredentials,
          createdBy: userId,
        });

    await this.repository.updateListing(key, { installCount: listing.installCount + 1, activeTenantCount: listing.activeTenantCount + 1 });

    await this.recordHistory(AppHistoryEntityType.INSTALLATION, installation.id, key, workspaceId, AppChangeType.INSTALLED, null, this.sanitizeInstallation(installation), userId);
    await this.recordAudit(workspaceId, userId, 'app-store.app.installed', AuditActionCategory.CREATE, installation.id);
    await this.publishEvent(AppStoreEvent.APP_INSTALLED, key, installation.id, workspaceId, userId);

    this.usageTrackingService
      .recordUsage(workspaceId, userId, { module: APP_STORE_MODULE, resourceKey: APP_USAGE_RESOURCE_KEY, quantity: 1, unit: 'COUNT', source: UsageRecordSource.EVENT_DRIVEN, correlationId: installation.id, metadata: { appKey: key } })
      .catch((error) => this.logger.warn(`Usage Tracking recordUsage failed for install '${installation.id}': ${(error as Error).message}`));

    return installation;
  }

  async uninstallApp(installationId: string, workspaceId: string, userId: string, userRole: string): Promise<IAppInstallation> {
    const installation = await this.getVisibleInstallationOrThrow(installationId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const dependents = await this.repository.findActiveDependentsInWorkspace(workspaceId, installation.appKey);
    const otherDependents = dependents.filter((d) => d.id !== installation.id);
    if (otherDependents.length > 0) {
      throw new AppDependentInstallationExistsException(otherDependents[0]!.appKey);
    }

    const updated = await this.repository.updateInstallation(installation.id, { status: AppInstallationStatus.UNINSTALLED, uninstalledAt: new Date() });

    const listing = await this.repository.findListingByKey(installation.appKey);
    if (listing) {
      await this.repository.updateListing(installation.appKey, { activeTenantCount: Math.max(0, listing.activeTenantCount - 1) });
    }

    await this.recordHistory(AppHistoryEntityType.INSTALLATION, installation.id, installation.appKey, workspaceId, AppChangeType.UNINSTALLED, installation.status, AppInstallationStatus.UNINSTALLED, userId);
    await this.recordAudit(workspaceId, userId, 'app-store.app.uninstalled', AuditActionCategory.DELETE, installation.id);
    await this.publishEvent(AppStoreEvent.APP_UNINSTALLED, installation.appKey, installation.id, workspaceId, userId);
    return updated;
  }

  async enableApp(installationId: string, workspaceId: string, userId: string, userRole: string): Promise<IAppInstallation> {
    const installation = await this.getVisibleInstallationOrThrow(installationId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionInstallation(installation, AppInstallationStatus.ENABLED, userId, AppChangeType.ENABLED, AppStoreEvent.APP_ENABLED, { enabledAt: new Date(), disabledAt: null });
  }

  async disableApp(installationId: string, workspaceId: string, userId: string, userRole: string): Promise<IAppInstallation> {
    const installation = await this.getVisibleInstallationOrThrow(installationId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);
    return this.transitionInstallation(installation, AppInstallationStatus.DISABLED, userId, AppChangeType.DISABLED, AppStoreEvent.APP_DISABLED, { disabledAt: new Date() });
  }

  async upgradeApp(installationId: string, workspaceId: string, userId: string, userRole: string, dto: UpgradeAppDto): Promise<IAppInstallation> {
    const installation = await this.getVisibleInstallationOrThrow(installationId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const listing = await this.repository.findListingByKey(installation.appKey);
    const targetVersionId = dto.targetVersionId ?? listing?.currentVersionId;
    if (!targetVersionId) {
      throw new AppListingInvalidDefinitionException('No target version available to upgrade to');
    }
    const targetVersion = await this.getVersionOrThrow(targetVersionId);
    if (targetVersion.status !== AppVersionStatus.PUBLISHED) {
      throw new AppVersionNotFoundException(targetVersionId);
    }

    const updated = await this.repository.updateInstallation(installation.id, { versionId: targetVersionId });
    await this.recordHistory(AppHistoryEntityType.INSTALLATION, installation.id, installation.appKey, workspaceId, AppChangeType.UPGRADED, installation.versionId, targetVersionId, userId);
    await this.publishEvent(AppStoreEvent.APP_UPGRADED, installation.appKey, installation.id, workspaceId, userId, { fromVersionId: installation.versionId, toVersionId: targetVersionId });
    return updated;
  }

  async rollbackApp(installationId: string, workspaceId: string, userId: string, userRole: string, dto: RollbackVersionDto): Promise<IAppInstallation> {
    const installation = await this.getVisibleInstallationOrThrow(installationId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const targetVersion = await this.getVersionOrThrow(dto.targetVersionId);
    if (targetVersion.appKey !== installation.appKey) {
      throw new AppIncompatibleVersionException(`Version '${dto.targetVersionId}' does not belong to app '${installation.appKey}'`);
    }

    const updated = await this.repository.updateInstallation(installation.id, { versionId: targetVersion.id });
    await this.recordHistory(AppHistoryEntityType.INSTALLATION, installation.id, installation.appKey, workspaceId, AppChangeType.ROLLED_BACK, installation.versionId, targetVersion.id, userId, dto.reason);
    await this.recordAudit(workspaceId, userId, 'app-store.app.rolled_back', AuditActionCategory.UPDATE, installation.id, AuditRiskLevel.SUSPICIOUS);
    await this.publishEvent(AppStoreEvent.APP_ROLLED_BACK, installation.appKey, installation.id, workspaceId, userId, { toVersionId: targetVersion.id, reason: dto.reason });
    return updated;
  }

  async updateInstallationConfig(installationId: string, workspaceId: string, userId: string, userRole: string, dto: UpdateInstallationDto): Promise<IAppInstallation> {
    const installation = await this.getVisibleInstallationOrThrow(installationId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const encryptedCredentials = dto.credentials ? this.encryptor.encryptValue(dto.credentials, `WORKSPACE:${workspaceId}`) : installation.encryptedCredentials;

    return this.repository.updateInstallation(installation.id, {
      config: (dto.config ?? installation.config) as any,
      encryptedCredentials,
    });
  }

  async getInstallation(installationId: string, workspaceId: string): Promise<IAppInstallation> {
    return this.getVisibleInstallationOrThrow(installationId, workspaceId);
  }

  async findAllInstallations(workspaceId: string, filter: AppInstallationFilterDto): Promise<PaginatedAppInstallationResponseDto> {
    const [data, total] = await this.repository.findAllInstallations(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════
  // Reviews
  // ══════════════════════════════════════════════════════════════════

  async submitReview(key: string, workspaceId: string, userId: string, dto: SubmitReviewDto): Promise<IAppReview> {
    const listing = await this.getVisibleListingOrThrow(key, workspaceId);
    const installation = await this.repository.findInstallationByAppAndWorkspace(key, workspaceId);
    if (!installation || installation.status === AppInstallationStatus.UNINSTALLED) {
      throw new AppNotEligibleException(`App '${key}' must be installed for this tenant before it can be reviewed`);
    }

    const existing = await this.repository.findReview(key, workspaceId);
    const review = existing
      ? await this.repository.updateReview(existing.id, { rating: dto.rating, comment: dto.comment ?? null })
      : await this.repository.createReview({ appKey: key, workspaceId, rating: dto.rating, comment: dto.comment ?? null, createdBy: userId });

    const ratingSum = existing ? listing.ratingSum - existing.rating + dto.rating : listing.ratingSum + dto.rating;
    const ratingCount = existing ? listing.ratingCount : listing.ratingCount + 1;
    await this.repository.updateListing(key, { ratingSum, ratingCount });

    await this.publishEvent(AppStoreEvent.REVIEW_SUBMITTED, key, review.id, workspaceId, userId, { rating: dto.rating });
    return review;
  }

  async listReviews(key: string, filter: AppReviewFilterDto): Promise<PaginatedAppReviewResponseDto> {
    const [data, total] = await this.repository.findAllReviews(key, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════
  // Health
  // ══════════════════════════════════════════════════════════════════

  async getAppHealth(key: string, workspaceId: string) {
    const listing = await this.getVisibleListingOrThrow(key, workspaceId);
    return {
      appKey: key,
      installCount: listing.installCount,
      activeTenantCount: listing.activeTenantCount,
      averageRating: listing.ratingCount > 0 ? listing.ratingSum / listing.ratingCount : 0,
      ratingCount: listing.ratingCount,
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — shared helpers
  // ══════════════════════════════════════════════════════════════════

  private async createListingAndInitialVersion(
    dto: RegisterAppListingDto,
    userId: string,
    scope: { publisherType: AppPublisherType; workspaceId: string | null; organizationId: string | null },
  ): Promise<IAppListing> {
    this.assertValidListingDefinition(dto, scope);

    const existing = await this.repository.findListingByKey(dto.key);
    if (existing) {
      throw new AppListingAlreadyExistsException(dto.key);
    }

    const listing = await this.repository.createListing({
      key: dto.key,
      name: dto.name,
      description: dto.description ?? null,
      category: dto.category,
      publisherType: scope.publisherType,
      publisherName: dto.publisherName ?? null,
      publisherId: dto.publisherId ?? null,
      workspaceId: scope.workspaceId,
      organizationId: scope.organizationId,
      pricingModel: dto.pricingModel,
      planKey: dto.planKey ?? null,
      regions: dto.regions ?? [],
      permissions: dto.permissions ?? [],
      scopes: dto.scopes ?? [],
      dependencies: dto.dependencies ?? [],
      featureFlagKey: dto.featureFlagKey ?? null,
      status: AppListingStatus.DRAFT,
      installCount: 0,
      activeTenantCount: 0,
      ratingSum: 0,
      ratingCount: 0,
      version: 1,
      createdBy: userId,
    });

    const initialVersion = await this.repository.createVersion({
      appKey: dto.key,
      versionString: dto.initialVersion,
      status: AppVersionStatus.DRAFT,
      createdBy: userId,
    });

    await this.recordHistory(AppHistoryEntityType.LISTING, listing.id, listing.key, listing.workspaceId, AppChangeType.LISTING_REGISTERED, null, this.sanitizeListing(listing), userId);
    await this.recordAudit(scope.workspaceId ?? 'platform', userId, 'app-store.listing.registered', AuditActionCategory.CREATE, listing.id);
    await this.publishEvent(AppStoreEvent.LISTING_REGISTERED, listing.key, listing.id, listing.workspaceId, userId, { initialVersionId: initialVersion.id });

    return listing;
  }

  private async publishListingInternal(listing: IAppListing, userId: string): Promise<IAppListing> {
    const versions = await this.repository.findVersionsForApp(listing.key);
    const draftVersion = versions.find((v) => v.status === AppVersionStatus.DRAFT);
    if (draftVersion) {
      await this.repository.updateVersion(draftVersion.id, { status: AppVersionStatus.PUBLISHED, publishedAt: new Date() });
      await this.repository.updateListing(listing.key, { currentVersionId: draftVersion.id, currentVersion: draftVersion.versionString });
    }

    return this.transitionListing(listing, AppListingStatus.PUBLISHED, userId, AppChangeType.LISTING_PUBLISHED, AppStoreEvent.LISTING_PUBLISHED);
  }

  private async assertDependenciesResolvable(dependencies: string[], selfKey: string): Promise<void> {
    for (const depKey of dependencies) {
      if (depKey === selfKey) {
        throw new AppListingInvalidDefinitionException('An app cannot depend on itself');
      }
      const dep = await this.repository.findListingByKey(depKey);
      if (!dep) {
        throw new AppListingInvalidDefinitionException(`Dependency '${depKey}' does not exist`);
      }
    }
  }

  private async assertDependenciesInstalled(dependencies: string[], workspaceId: string): Promise<void> {
    for (const depKey of dependencies) {
      const depInstallation = await this.repository.findInstallationByAppAndWorkspace(depKey, workspaceId);
      const active = depInstallation && [AppInstallationStatus.INSTALLED, AppInstallationStatus.ENABLED].includes(depInstallation.status);
      if (!active) {
        throw new AppDependencyNotSatisfiedException(depKey);
      }
    }
  }

  private async assertEligible(listing: IAppListing, workspaceId: string, userId: string, userRole: string): Promise<void> {
    if (listing.featureFlagKey) {
      const evaluation = await this.featureFlagsService.evaluate(listing.featureFlagKey, { workspaceId, userId, userRole }).catch(() => ({ enabled: false } as any));
      if (!evaluation.enabled) {
        throw new AppNotEligibleException(`App '${listing.key}' is not yet enabled for this tenant`);
      }
    }

    if (listing.planKey) {
      const reference = await this.subscriptionManagementService.getEntitlementReference(workspaceId).catch(() => null);
      if (!reference || reference.planKey !== listing.planKey) {
        throw new AppNotEligibleException(`App '${listing.key}' requires plan '${listing.planKey}'`);
      }
    }

    if (listing.pricingModel === AppPricingModel.PAID || listing.pricingModel === AppPricingModel.SUBSCRIPTION) {
      const subscription = await this.subscriptionManagementService.getEffectiveSubscription(workspaceId).catch(() => null);
      const active = subscription && [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL].includes(subscription.status);
      if (!active) {
        throw new AppNotEligibleException(`App '${listing.key}' requires an active subscription — subscribe before installing`);
      }
    }
  }

  private async transitionListing(
    listing: IAppListing,
    to: AppListingStatus,
    userId: string,
    changeType: AppChangeType,
    event: AppStoreEvent,
    reason?: string,
    riskLevel: AuditRiskLevel = AuditRiskLevel.NORMAL,
  ): Promise<IAppListing> {
    if (!LISTING_TRANSITIONS[listing.status]?.includes(to)) {
      throw new AppListingInvalidStateTransitionException(listing.status, to);
    }

    const updated = await this.repository.updateListing(listing.key, { status: to });
    await this.recordHistory(AppHistoryEntityType.LISTING, listing.id, listing.key, listing.workspaceId, changeType, listing.status, to, userId, reason);
    await this.recordAudit(listing.workspaceId ?? 'platform', userId, `app-store.listing.${changeType.toLowerCase()}`, AuditActionCategory.UPDATE, listing.id, riskLevel);
    await this.publishEvent(event, listing.key, listing.id, listing.workspaceId, userId, reason ? { reason } : undefined);
    return updated;
  }

  private async transitionInstallation(
    installation: IAppInstallation,
    to: AppInstallationStatus,
    userId: string,
    changeType: AppChangeType,
    event: AppStoreEvent,
    extraFields: Partial<IAppInstallation>,
  ): Promise<IAppInstallation> {
    const updated = await this.repository.updateInstallation(installation.id, { status: to, ...extraFields });
    await this.recordHistory(AppHistoryEntityType.INSTALLATION, installation.id, installation.appKey, installation.workspaceId, changeType, installation.status, to, userId);
    await this.publishEvent(event, installation.appKey, installation.id, installation.workspaceId, userId);
    return updated;
  }

  private assertValidListingDefinition(dto: RegisterAppListingDto, scope: { publisherType: AppPublisherType; workspaceId: string | null }): void {
    if (scope.publisherType === AppPublisherType.PRIVATE && !scope.workspaceId) {
      throw new AppListingInvalidDefinitionException('PRIVATE listings require a workspace scope');
    }
    if ((scope.publisherType === AppPublisherType.FIRST_PARTY || scope.publisherType === AppPublisherType.PARTNER) && scope.workspaceId) {
      throw new AppListingInvalidDefinitionException('FIRST_PARTY/PARTNER listings must not be workspace-scoped');
    }
    if (dto.dependencies?.includes(dto.key)) {
      throw new AppListingInvalidDefinitionException('An app cannot depend on itself');
    }
  }

  private async assertCanManage(workspaceId: string, userId: string, userRole: string): Promise<void> {
    if (APP_STORE_MANAGE_ROLES.includes(userRole)) {
      return;
    }
    const hasGranularRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'ADMIN');
    if (!hasGranularRole) {
      throw new AppAccessDeniedException();
    }
  }

  private async getListingOrThrow(key: string): Promise<IAppListing> {
    const listing = await this.repository.findListingByKey(key);
    if (!listing) {
      throw new AppListingNotFoundException(key);
    }
    return listing;
  }

  private async getVisibleListingOrThrow(key: string, workspaceId: string): Promise<IAppListing> {
    const listing = await this.repository.findListingByKey(key);
    const visible = listing && (listing.publisherType !== AppPublisherType.PRIVATE || listing.workspaceId === workspaceId);
    if (!listing || !visible) {
      throw new AppListingNotFoundException(key);
    }
    return listing;
  }

  private async getVersionOrThrow(id: string): Promise<IAppVersion> {
    const version = await this.repository.findVersionById(id);
    if (!version) {
      throw new AppVersionNotFoundException(id);
    }
    return version;
  }

  private async getVisibleInstallationOrThrow(id: string, workspaceId: string): Promise<IAppInstallation> {
    const installation = await this.repository.findInstallationById(id);
    if (!installation || installation.workspaceId !== workspaceId) {
      throw new AppInstallationNotFoundException(id);
    }
    return installation;
  }

  private toListingResponse(listing: IAppListing): Record<string, unknown> {
    const { ratingSum, ratingCount, ...rest } = listing;
    return { ...rest, ratingCount, averageRating: ratingCount > 0 ? ratingSum / ratingCount : 0 };
  }

  /** Snapshots never include `encryptedCredentials` (installation) — history is inspectable by workspace admins and must never leak credential material either. */
  private sanitizeListing(listing: IAppListing): Record<string, unknown> {
    return { ...listing };
  }

  private sanitizeVersion(version: IAppVersion): Record<string, unknown> {
    return { ...version };
  }

  private sanitizeInstallation(installation: IAppInstallation): Record<string, unknown> {
    const { encryptedCredentials: _encryptedCredentials, ...safe } = installation;
    return safe;
  }

  private async recordHistory(
    entityType: AppHistoryEntityType,
    entityId: string,
    appKey: string,
    workspaceId: string | null,
    changeType: AppChangeType,
    fromStatus: string | null,
    toStatus: unknown,
    changedBy: string | null,
    reason?: string,
  ): Promise<void> {
    await this.repository.createHistory({
      entityType,
      entityId,
      appKey,
      workspaceId,
      changeType,
      fromStatus,
      toStatus: (typeof toStatus === 'string' ? toStatus : JSON.stringify(toStatus)) as any,
      reason: reason ?? null,
      changedBy,
      snapshot: (typeof toStatus === 'object' ? (toStatus as Record<string, unknown>) : null) as any,
    });
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string,
    action: string,
    actionCategory: AuditActionCategory,
    entityId: string,
    riskLevel?: AuditRiskLevel,
  ): Promise<void> {
    if (workspaceId === 'platform') {
      return;
    }
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory,
      module: APP_STORE_MODULE,
      entityType: 'App',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
      riskLevel,
    });
  }

  private async publishEvent(
    event: AppStoreEvent,
    appKey: string,
    entityId?: string,
    workspaceId?: string | null,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({ event, appKey, entityId, workspaceId, actorId, metadata });
  }
}
