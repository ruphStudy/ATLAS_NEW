import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { AppStoreService } from '@modules/app-store/app-store.service';
import { AppPublisherType } from '@modules/app-store/interfaces';
import { WebhookFrameworkService } from '@modules/webhook-framework/webhook-framework.service';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory, AuditRiskLevel } from '@modules/audit-logs/interfaces';
import { PluginFrameworkRepository } from './plugin-framework.repository';
import { PluginFrameworkEventQueue } from './jobs';
import {
  RegisterPluginManifestDto,
  UpdatePluginManifestDto,
  ActivatePluginDto,
  RegisterExtensionPointDto,
  CreateEventSubscriptionDto,
  PluginActivationFilterDto,
  PluginRequiredReasonDto,
  PaginatedPluginActivationResponseDto,
  PluginActivationHealthResponseDto,
} from './dto';
import {
  IPluginActivation,
  IPluginEventSubscription,
  IPluginExtensionPoint,
  IPluginHistory,
  IPluginManifest,
  PluginActivationStatus,
  PluginChangeType,
  PluginExtensionPointStatus,
  PluginFrameworkEvent,
  PluginHistoryEntityType,
  PluginManifestStatus,
  PluginSubscriptionStatus,
} from './interfaces';
import { ATLAS_PLATFORM_VERSION, PLUGIN_FRAMEWORK_MODULE, PLUGIN_MANAGE_ROLES, PLUGIN_QUARANTINE_FAILURE_THRESHOLD } from './constants';
import {
  PluginAccessDeniedException,
  PluginActivationNotFoundException,
  PluginAlreadyActivatedException,
  PluginExtensionPointAlreadyRegisteredException,
  PluginExtensionPointNotFoundException,
  PluginHookNotDeclaredException,
  PluginIncompatibleException,
  PluginManifestAlreadyRegisteredException,
  PluginManifestInvalidException,
  PluginManifestNotFoundException,
  PluginNotActivatedException,
  PluginPermissionNotGrantedException,
  PluginQuarantinedException,
  PluginSubscriptionNotFoundException,
} from './exceptions/plugin-framework.exceptions';

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

@Injectable()
export class PluginFrameworkService {
  private readonly logger = new Logger(PluginFrameworkService.name);

  constructor(
    private readonly repository: PluginFrameworkRepository,
    private readonly appStoreService: AppStoreService,
    private readonly webhookFrameworkService: WebhookFrameworkService,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: PluginFrameworkEventQueue,
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // Manifests — the structured technical contract per app version
  // ══════════════════════════════════════════════════════════════════

  async registerManifest(appKey: string, workspaceId: string, userId: string, userRole: string, dto: RegisterPluginManifestDto): Promise<IPluginManifest> {
    const listing = await this.appStoreService.getListing(appKey, workspaceId);
    if (listing.publisherType === AppPublisherType.PRIVATE) {
      await this.assertCanManage(workspaceId, userId, userRole);
    }

    const existing = await this.repository.findManifest(appKey, dto.versionId);
    if (existing) {
      throw new PluginManifestAlreadyRegisteredException(appKey, dto.versionId);
    }

    this.assertValidVersionBounds(dto.minAtlasVersion, dto.maxAtlasVersion);

    const manifest = await this.repository.createManifest({
      appKey,
      versionId: dto.versionId,
      capabilities: dto.capabilities ?? [],
      requiredPermissions: dto.requiredPermissions ?? [],
      requiredScopes: dto.requiredScopes ?? [],
      hooks: dto.hooks ?? [],
      configSchema: (dto.configSchema ?? null) as any,
      minAtlasVersion: dto.minAtlasVersion ?? null,
      maxAtlasVersion: dto.maxAtlasVersion ?? null,
      status: PluginManifestStatus.ACTIVE,
      createdBy: userId,
    });

    await this.recordHistory(PluginHistoryEntityType.MANIFEST, manifest.id, appKey, null, PluginChangeType.MANIFEST_REGISTERED, null, this.sanitizeManifest(manifest), userId);
    await this.recordAudit(workspaceId, userId, 'plugin-framework.manifest.registered', AuditActionCategory.CREATE, manifest.id);
    await this.publishEvent(PluginFrameworkEvent.MANIFEST_REGISTERED, appKey, manifest.id, null, userId, { versionId: dto.versionId });

    return manifest;
  }

  async updateManifest(appKey: string, versionId: string, workspaceId: string, userId: string, userRole: string, dto: UpdatePluginManifestDto): Promise<IPluginManifest> {
    const manifest = await this.getManifestOrThrow(appKey, versionId);
    const listing = await this.appStoreService.getListing(appKey, workspaceId);
    if (listing.publisherType === AppPublisherType.PRIVATE) {
      await this.assertCanManage(workspaceId, userId, userRole);
    }

    this.assertValidVersionBounds(dto.minAtlasVersion ?? manifest.minAtlasVersion ?? undefined, dto.maxAtlasVersion ?? manifest.maxAtlasVersion ?? undefined);

    const updated = await this.repository.updateManifest(manifest.id, {
      capabilities: dto.capabilities ?? manifest.capabilities,
      requiredPermissions: dto.requiredPermissions ?? manifest.requiredPermissions,
      requiredScopes: dto.requiredScopes ?? manifest.requiredScopes,
      hooks: dto.hooks ?? manifest.hooks,
      configSchema: (dto.configSchema ?? manifest.configSchema) as any,
      minAtlasVersion: dto.minAtlasVersion ?? manifest.minAtlasVersion,
      maxAtlasVersion: dto.maxAtlasVersion ?? manifest.maxAtlasVersion,
    });

    await this.recordHistory(PluginHistoryEntityType.MANIFEST, manifest.id, appKey, null, PluginChangeType.MANIFEST_UPDATED, null, this.sanitizeManifest(updated), userId);
    await this.publishEvent(PluginFrameworkEvent.MANIFEST_UPDATED, appKey, manifest.id, null, userId);
    return updated;
  }

  async deprecateManifest(appKey: string, versionId: string, workspaceId: string, userId: string, userRole: string): Promise<IPluginManifest> {
    const manifest = await this.getManifestOrThrow(appKey, versionId);
    const listing = await this.appStoreService.getListing(appKey, workspaceId);
    if (listing.publisherType === AppPublisherType.PRIVATE) {
      await this.assertCanManage(workspaceId, userId, userRole);
    }

    const updated = await this.repository.updateManifest(manifest.id, { status: PluginManifestStatus.DEPRECATED });
    await this.recordHistory(PluginHistoryEntityType.MANIFEST, manifest.id, appKey, null, PluginChangeType.MANIFEST_DEPRECATED, manifest.status, PluginManifestStatus.DEPRECATED, userId);
    await this.publishEvent(PluginFrameworkEvent.MANIFEST_DEPRECATED, appKey, manifest.id, null, userId);
    return updated;
  }

  async getManifest(appKey: string, versionId: string, workspaceId: string): Promise<IPluginManifest> {
    await this.appStoreService.getListing(appKey, workspaceId);
    return this.getManifestOrThrow(appKey, versionId);
  }

  async listManifests(appKey: string, workspaceId: string): Promise<IPluginManifest[]> {
    await this.appStoreService.getListing(appKey, workspaceId);
    return this.repository.findManifestsForApp(appKey);
  }

  // ══════════════════════════════════════════════════════════════════
  // Activation lifecycle
  // ══════════════════════════════════════════════════════════════════

  async activatePlugin(installationId: string, workspaceId: string, userId: string, userRole: string, dto: ActivatePluginDto): Promise<IPluginActivation> {
    await this.assertCanManage(workspaceId, userId, userRole);

    const installation = await this.appStoreService.getInstallation(installationId, workspaceId);
    const manifest = await this.repository.findManifest(installation.appKey, installation.versionId);
    if (!manifest) {
      throw new PluginManifestNotFoundException(installation.appKey, installation.versionId);
    }
    if (manifest.status === PluginManifestStatus.DEPRECATED) {
      throw new PluginIncompatibleException(`Manifest for app '${installation.appKey}' version '${installation.versionId}' is deprecated`);
    }
    this.assertAtlasVersionCompatible(manifest);

    const requestedPermissions = dto.grantedPermissions ?? manifest.requiredPermissions;
    const undeclared = requestedPermissions.filter((permission) => !manifest.requiredPermissions.includes(permission));
    if (undeclared.length > 0) {
      throw new PluginPermissionNotGrantedException(undeclared);
    }

    const existing = await this.repository.findActivation(installation.appKey, workspaceId);
    if (existing && existing.status !== PluginActivationStatus.DISABLED) {
      throw new PluginAlreadyActivatedException(installation.appKey);
    }

    const activation = existing
      ? await this.repository.updateActivation(existing.id, {
          manifestId: manifest.id,
          installationId: installation.id,
          status: PluginActivationStatus.ACTIVE,
          grantedPermissions: requestedPermissions,
          consecutiveFailures: 0,
          lastErrorAt: null,
          lastErrorMessage: null,
          quarantinedAt: null,
          quarantinedReason: null,
        })
      : await this.repository.createActivation({
          manifestId: manifest.id,
          appKey: installation.appKey,
          installationId: installation.id,
          workspaceId,
          status: PluginActivationStatus.ACTIVE,
          grantedPermissions: requestedPermissions,
          consecutiveFailures: 0,
          createdBy: userId,
        });

    await this.recordHistory(PluginHistoryEntityType.ACTIVATION, activation.id, installation.appKey, workspaceId, PluginChangeType.ACTIVATED, null, this.sanitizeActivation(activation), userId);
    await this.recordAudit(workspaceId, userId, 'plugin-framework.activated', AuditActionCategory.CREATE, activation.id);
    await this.publishEvent(PluginFrameworkEvent.ACTIVATED, installation.appKey, activation.id, workspaceId, userId);
    return activation;
  }

  async deactivatePlugin(activationId: string, workspaceId: string, userId: string, userRole: string): Promise<IPluginActivation> {
    const activation = await this.getVisibleActivationOrThrow(activationId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const updated = await this.repository.updateActivation(activation.id, { status: PluginActivationStatus.DISABLED });
    await this.recordHistory(PluginHistoryEntityType.ACTIVATION, activation.id, activation.appKey, workspaceId, PluginChangeType.DEACTIVATED, activation.status, PluginActivationStatus.DISABLED, userId);
    await this.publishEvent(PluginFrameworkEvent.DEACTIVATED, activation.appKey, activation.id, workspaceId, userId);
    return updated;
  }

  /** Manual isolation — a tenant/platform admin quarantining a plugin outright, independent of the automatic consecutive-failure threshold in `triggerHook`. */
  async quarantinePlugin(activationId: string, workspaceId: string, userId: string, userRole: string, dto: PluginRequiredReasonDto): Promise<IPluginActivation> {
    const activation = await this.getVisibleActivationOrThrow(activationId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const updated = await this.repository.updateActivation(activation.id, {
      status: PluginActivationStatus.QUARANTINED,
      quarantinedAt: new Date(),
      quarantinedReason: dto.reason,
    });
    await this.recordHistory(PluginHistoryEntityType.ACTIVATION, activation.id, activation.appKey, workspaceId, PluginChangeType.QUARANTINED, activation.status, PluginActivationStatus.QUARANTINED, userId, dto.reason);
    await this.recordAudit(workspaceId, userId, 'plugin-framework.quarantined', AuditActionCategory.UPDATE, activation.id, AuditRiskLevel.HIGH_RISK);
    await this.publishEvent(PluginFrameworkEvent.QUARANTINED, activation.appKey, activation.id, workspaceId, userId, { reason: dto.reason });
    return updated;
  }

  async reactivatePlugin(activationId: string, workspaceId: string, userId: string, userRole: string): Promise<IPluginActivation> {
    const activation = await this.getVisibleActivationOrThrow(activationId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    if (activation.status === PluginActivationStatus.ACTIVE) {
      return activation;
    }

    const updated = await this.repository.updateActivation(activation.id, {
      status: PluginActivationStatus.ACTIVE,
      consecutiveFailures: 0,
      lastErrorAt: null,
      lastErrorMessage: null,
      quarantinedAt: null,
      quarantinedReason: null,
    });
    await this.recordHistory(PluginHistoryEntityType.ACTIVATION, activation.id, activation.appKey, workspaceId, PluginChangeType.REACTIVATED, activation.status, PluginActivationStatus.ACTIVE, userId);
    await this.publishEvent(PluginFrameworkEvent.REACTIVATED, activation.appKey, activation.id, workspaceId, userId);
    return updated;
  }

  async getActivation(activationId: string, workspaceId: string): Promise<IPluginActivation> {
    return this.getVisibleActivationOrThrow(activationId, workspaceId);
  }

  async findAllActivations(workspaceId: string, filter: PluginActivationFilterDto): Promise<PaginatedPluginActivationResponseDto> {
    const [data, total] = await this.repository.findAllActivations(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getActivationHealth(activationId: string, workspaceId: string): Promise<PluginActivationHealthResponseDto> {
    const activation = await this.getVisibleActivationOrThrow(activationId, workspaceId);
    return {
      activationId: activation.id,
      appKey: activation.appKey,
      status: activation.status,
      consecutiveFailures: activation.consecutiveFailures,
      lastInvokedAt: activation.lastInvokedAt,
      lastErrorAt: activation.lastErrorAt,
      lastErrorMessage: activation.lastErrorMessage,
      quarantinedAt: activation.quarantinedAt,
      quarantinedReason: activation.quarantinedReason,
    };
  }

  async getActivationHistory(activationId: string, workspaceId: string): Promise<IPluginHistory[]> {
    const activation = await this.getVisibleActivationOrThrow(activationId, workspaceId);
    return this.repository.findHistory(activation.id);
  }

  // ══════════════════════════════════════════════════════════════════
  // Extension points — where a plugin extends ATLAS
  // ══════════════════════════════════════════════════════════════════

  async registerExtensionPoint(appKey: string, workspaceId: string, userId: string, userRole: string, dto: RegisterExtensionPointDto): Promise<IPluginExtensionPoint> {
    const listing = await this.appStoreService.getListing(appKey, workspaceId);
    if (listing.publisherType === AppPublisherType.PRIVATE) {
      await this.assertCanManage(workspaceId, userId, userRole);
    }

    const existing = await this.repository.findExtensionPoint(appKey, dto.extensionPointKey);
    if (existing) {
      throw new PluginExtensionPointAlreadyRegisteredException(appKey, dto.extensionPointKey);
    }

    const extensionPoint = await this.repository.createExtensionPoint({
      appKey,
      extensionPointKey: dto.extensionPointKey,
      hookName: dto.hookName,
      config: (dto.config ?? null) as any,
      status: PluginExtensionPointStatus.ACTIVE,
      createdBy: userId,
    });

    await this.recordHistory(PluginHistoryEntityType.EXTENSION_POINT, extensionPoint.id, appKey, null, PluginChangeType.EXTENSION_POINT_REGISTERED, null, this.sanitizeExtensionPoint(extensionPoint), userId);
    await this.publishEvent(PluginFrameworkEvent.EXTENSION_POINT_REGISTERED, appKey, extensionPoint.id, null, userId);
    return extensionPoint;
  }

  async listExtensionPoints(appKey: string, workspaceId: string): Promise<IPluginExtensionPoint[]> {
    await this.appStoreService.getListing(appKey, workspaceId);
    return this.repository.findExtensionPointsForApp(appKey);
  }

  async removeExtensionPoint(appKey: string, extensionPointKey: string, workspaceId: string, userId: string, userRole: string): Promise<IPluginExtensionPoint> {
    const listing = await this.appStoreService.getListing(appKey, workspaceId);
    if (listing.publisherType === AppPublisherType.PRIVATE) {
      await this.assertCanManage(workspaceId, userId, userRole);
    }

    const extensionPoint = await this.getExtensionPointOrThrow(appKey, extensionPointKey);
    const updated = await this.repository.updateExtensionPoint(extensionPoint.id, { status: PluginExtensionPointStatus.DISABLED });
    await this.recordHistory(PluginHistoryEntityType.EXTENSION_POINT, extensionPoint.id, appKey, null, PluginChangeType.EXTENSION_POINT_REMOVED, extensionPoint.status, PluginExtensionPointStatus.DISABLED, userId);
    await this.publishEvent(PluginFrameworkEvent.EXTENSION_POINT_REMOVED, appKey, extensionPoint.id, null, userId);
    return updated;
  }

  // ══════════════════════════════════════════════════════════════════
  // Event subscriptions — a plugin's declared reaction to an internal ATLAS event
  // ══════════════════════════════════════════════════════════════════

  async subscribeToEvent(appKey: string, workspaceId: string, userId: string, userRole: string, dto: CreateEventSubscriptionDto): Promise<IPluginEventSubscription> {
    await this.assertCanManage(workspaceId, userId, userRole);

    const activation = await this.repository.findActivation(appKey, workspaceId);
    if (!activation || activation.status !== PluginActivationStatus.ACTIVE) {
      throw new PluginNotActivatedException(appKey);
    }

    const manifest = await this.repository.findManifestById(activation.manifestId);
    if (!manifest || !manifest.hooks.includes(dto.targetHook)) {
      throw new PluginHookNotDeclaredException(appKey, dto.targetHook);
    }

    const existing = await this.repository.findSubscription(appKey, workspaceId, dto.eventName);
    const subscription = existing
      ? await this.repository.updateSubscription(existing.id, { targetHook: dto.targetHook, status: PluginSubscriptionStatus.ACTIVE })
      : await this.repository.createSubscription({
          appKey,
          workspaceId,
          eventName: dto.eventName,
          targetHook: dto.targetHook,
          status: PluginSubscriptionStatus.ACTIVE,
          createdBy: userId,
        });

    await this.recordHistory(PluginHistoryEntityType.SUBSCRIPTION, subscription.id, appKey, workspaceId, PluginChangeType.SUBSCRIBED, null, this.sanitizeSubscription(subscription), userId);
    await this.publishEvent(PluginFrameworkEvent.SUBSCRIBED, appKey, subscription.id, workspaceId, userId, { eventName: dto.eventName });
    return subscription;
  }

  async unsubscribe(subscriptionId: string, workspaceId: string, userId: string, userRole: string): Promise<IPluginEventSubscription> {
    const subscription = await this.getVisibleSubscriptionOrThrow(subscriptionId, workspaceId);
    await this.assertCanManage(workspaceId, userId, userRole);

    const updated = await this.repository.updateSubscription(subscription.id, { status: PluginSubscriptionStatus.DISABLED });
    await this.recordHistory(PluginHistoryEntityType.SUBSCRIPTION, subscription.id, subscription.appKey, workspaceId, PluginChangeType.UNSUBSCRIBED, subscription.status, PluginSubscriptionStatus.DISABLED, userId);
    await this.publishEvent(PluginFrameworkEvent.UNSUBSCRIBED, subscription.appKey, subscription.id, workspaceId, userId);
    return updated;
  }

  async listSubscriptions(appKey: string, workspaceId: string): Promise<IPluginEventSubscription[]> {
    return this.repository.findSubscriptionsForActivation(appKey, workspaceId);
  }

  /** The approved-contract entry point for OTHER ATLAS modules to notify subscribed plugins of an internal event — fans out to every ACTIVE subscription for `eventName` in this workspace, isolating each plugin's failure from the others and from the calling module. */
  async publishInternalEvent(workspaceId: string, eventName: string, payload: Record<string, unknown>): Promise<{ notified: number; failed: number }> {
    const subscriptions = await this.repository.findActiveSubscriptionsForEvent(workspaceId, eventName);
    let notified = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        await this.triggerHook(subscription.appKey, workspaceId, subscription.targetHook, payload);
        notified++;
      } catch (error) {
        failed++;
        this.logger.warn(`publishInternalEvent: hook dispatch failed for app '${subscription.appKey}' hook '${subscription.targetHook}': ${(error as Error).message}`);
      }
    }

    return { notified, failed };
  }

  // ══════════════════════════════════════════════════════════════════
  // Hook dispatch — reuses Webhook Framework's delivery/retry machinery entirely
  // ══════════════════════════════════════════════════════════════════

  async triggerHook(appKey: string, workspaceId: string, hookName: string, payload: Record<string, unknown>): Promise<{ queued: number; skipped: number }> {
    const activation = await this.repository.findActivation(appKey, workspaceId);
    if (!activation || activation.status === PluginActivationStatus.DISABLED) {
      throw new PluginNotActivatedException(appKey);
    }
    if (activation.status === PluginActivationStatus.QUARANTINED) {
      throw new PluginQuarantinedException(appKey, activation.quarantinedReason);
    }

    const manifest = await this.repository.findManifestById(activation.manifestId);
    if (!manifest || !manifest.hooks.includes(hookName)) {
      throw new PluginHookNotDeclaredException(appKey, hookName);
    }

    try {
      const result = await this.webhookFrameworkService.dispatchEvent({
        workspaceId,
        eventType: `plugin.${appKey}.${hookName}`,
        eventId: randomUUID(),
        payload,
      });
      await this.repository.updateActivation(activation.id, { consecutiveFailures: 0, lastInvokedAt: new Date() });
      return result;
    } catch (error) {
      await this.recordHookFailure(activation, error as Error);
      throw error;
    }
  }

  private async recordHookFailure(activation: IPluginActivation, error: Error): Promise<void> {
    const consecutiveFailures = activation.consecutiveFailures + 1;
    const shouldQuarantine = consecutiveFailures >= PLUGIN_QUARANTINE_FAILURE_THRESHOLD;

    await this.repository.updateActivation(activation.id, {
      consecutiveFailures,
      lastErrorAt: new Date(),
      lastErrorMessage: error.message,
      ...(shouldQuarantine
        ? { status: PluginActivationStatus.QUARANTINED, quarantinedAt: new Date(), quarantinedReason: `Auto-quarantined after ${consecutiveFailures} consecutive hook failures` }
        : {}),
    });

    if (shouldQuarantine) {
      await this.recordHistory(
        PluginHistoryEntityType.ACTIVATION,
        activation.id,
        activation.appKey,
        activation.workspaceId,
        PluginChangeType.QUARANTINED,
        activation.status,
        PluginActivationStatus.QUARANTINED,
        null,
        `Auto-quarantined after ${consecutiveFailures} consecutive hook failures`,
      );
      await this.publishEvent(PluginFrameworkEvent.QUARANTINED, activation.appKey, activation.id, activation.workspaceId, undefined, { consecutiveFailures });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — shared helpers
  // ══════════════════════════════════════════════════════════════════

  private assertAtlasVersionCompatible(manifest: IPluginManifest): void {
    if (manifest.minAtlasVersion && this.semverLt(ATLAS_PLATFORM_VERSION, manifest.minAtlasVersion)) {
      throw new PluginIncompatibleException(`App '${manifest.appKey}' requires ATLAS version >= ${manifest.minAtlasVersion}, current is ${ATLAS_PLATFORM_VERSION}`);
    }
    if (manifest.maxAtlasVersion && this.semverLt(manifest.maxAtlasVersion, ATLAS_PLATFORM_VERSION)) {
      throw new PluginIncompatibleException(`App '${manifest.appKey}' requires ATLAS version <= ${manifest.maxAtlasVersion}, current is ${ATLAS_PLATFORM_VERSION}`);
    }
  }

  private assertValidVersionBounds(minVersion?: string, maxVersion?: string): void {
    if (minVersion && !SEMVER_PATTERN.test(minVersion)) {
      throw new PluginManifestInvalidException(`minAtlasVersion '${minVersion}' must be in major.minor.patch format`);
    }
    if (maxVersion && !SEMVER_PATTERN.test(maxVersion)) {
      throw new PluginManifestInvalidException(`maxAtlasVersion '${maxVersion}' must be in major.minor.patch format`);
    }
    if (minVersion && maxVersion && this.semverLt(maxVersion, minVersion)) {
      throw new PluginManifestInvalidException(`maxAtlasVersion '${maxVersion}' cannot be lower than minAtlasVersion '${minVersion}'`);
    }
  }

  /** Minimal major.minor.patch comparison — same hand-rolled approach as `marketplace-capability-compatibility.manager.ts`, no external semver dependency. */
  private semverLt(a: string, b: string): boolean {
    const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
    const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
    if (aMajor !== bMajor) return aMajor < bMajor;
    if (aMinor !== bMinor) return aMinor < bMinor;
    return aPatch < bPatch;
  }

  private async assertCanManage(workspaceId: string, userId: string, userRole: string): Promise<void> {
    if (PLUGIN_MANAGE_ROLES.includes(userRole)) {
      return;
    }
    const hasGranularRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'ADMIN');
    if (!hasGranularRole) {
      throw new PluginAccessDeniedException();
    }
  }

  private async getManifestOrThrow(appKey: string, versionId: string): Promise<IPluginManifest> {
    const manifest = await this.repository.findManifest(appKey, versionId);
    if (!manifest) {
      throw new PluginManifestNotFoundException(appKey, versionId);
    }
    return manifest;
  }

  private async getVisibleActivationOrThrow(id: string, workspaceId: string): Promise<IPluginActivation> {
    const activation = await this.repository.findActivationById(id);
    if (!activation || activation.workspaceId !== workspaceId) {
      throw new PluginActivationNotFoundException(id);
    }
    return activation;
  }

  private async getExtensionPointOrThrow(appKey: string, extensionPointKey: string): Promise<IPluginExtensionPoint> {
    const extensionPoint = await this.repository.findExtensionPoint(appKey, extensionPointKey);
    if (!extensionPoint) {
      throw new PluginExtensionPointNotFoundException(appKey, extensionPointKey);
    }
    return extensionPoint;
  }

  private async getVisibleSubscriptionOrThrow(id: string, workspaceId: string): Promise<IPluginEventSubscription> {
    const subscription = await this.repository.findSubscriptionById(id);
    if (!subscription || subscription.workspaceId !== workspaceId) {
      throw new PluginSubscriptionNotFoundException(id);
    }
    return subscription;
  }

  private sanitizeManifest(manifest: IPluginManifest): Record<string, unknown> {
    return { ...manifest };
  }

  private sanitizeActivation(activation: IPluginActivation): Record<string, unknown> {
    return { ...activation };
  }

  private sanitizeExtensionPoint(extensionPoint: IPluginExtensionPoint): Record<string, unknown> {
    return { ...extensionPoint };
  }

  private sanitizeSubscription(subscription: IPluginEventSubscription): Record<string, unknown> {
    return { ...subscription };
  }

  private async recordHistory(
    entityType: PluginHistoryEntityType,
    entityId: string,
    appKey: string,
    workspaceId: string | null,
    changeType: PluginChangeType,
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

  private async recordAudit(workspaceId: string, actorId: string, action: string, actionCategory: AuditActionCategory, entityId: string, riskLevel?: AuditRiskLevel): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory,
      module: PLUGIN_FRAMEWORK_MODULE,
      entityType: 'Plugin',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
      riskLevel,
    });
  }

  private async publishEvent(
    event: PluginFrameworkEvent,
    appKey: string,
    entityId?: string,
    workspaceId?: string | null,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({ event, appKey, entityId, workspaceId, actorId, metadata });
  }
}
