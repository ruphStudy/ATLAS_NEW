import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IPluginActivation, IPluginEventSubscription, IPluginExtensionPoint, IPluginHistory, IPluginManifest, PluginActivationStatus, PluginSubscriptionStatus } from './interfaces';
import { PluginActivationFilterDto } from './dto';

@Injectable()
export class PluginFrameworkRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Manifests ────────────────────────────────────────────────────

  async createManifest(data: Partial<IPluginManifest>): Promise<IPluginManifest> {
    return this.prisma.pluginManifest.create({ data: data as any }) as Promise<IPluginManifest>;
  }

  async findManifestById(id: string): Promise<IPluginManifest | null> {
    return this.prisma.pluginManifest.findFirst({ where: { id } }) as Promise<IPluginManifest | null>;
  }

  async findManifest(appKey: string, versionId: string): Promise<IPluginManifest | null> {
    return this.prisma.pluginManifest.findFirst({ where: { appKey, versionId } }) as Promise<IPluginManifest | null>;
  }

  async findManifestsForApp(appKey: string): Promise<IPluginManifest[]> {
    return this.prisma.pluginManifest.findMany({ where: { appKey }, orderBy: { createdAt: 'desc' } }) as Promise<IPluginManifest[]>;
  }

  async updateManifest(id: string, data: Partial<IPluginManifest>): Promise<IPluginManifest> {
    return this.prisma.pluginManifest.update({ where: { id }, data: data as any }) as Promise<IPluginManifest>;
  }

  // ── Activations ──────────────────────────────────────────────────

  async createActivation(data: Partial<IPluginActivation>): Promise<IPluginActivation> {
    return this.prisma.pluginActivation.create({ data: data as any }) as Promise<IPluginActivation>;
  }

  async findActivationById(id: string): Promise<IPluginActivation | null> {
    return this.prisma.pluginActivation.findFirst({ where: { id } }) as Promise<IPluginActivation | null>;
  }

  async findActivation(appKey: string, workspaceId: string): Promise<IPluginActivation | null> {
    return this.prisma.pluginActivation.findFirst({ where: { appKey, workspaceId } }) as Promise<IPluginActivation | null>;
  }

  async findAllActivations(workspaceId: string, filter: PluginActivationFilterDto): Promise<[IPluginActivation[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.status) where.status = filter.status;
    if (filter.appKey) where.appKey = filter.appKey;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.pluginActivation.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.pluginActivation.count({ where: where as any }),
    ]);

    return [data as IPluginActivation[], total];
  }

  /** Every non-DISABLED activation of `appKey` — used to block removing an extension point/manifest a live tenant still depends on. */
  async findActiveActivationsForApp(appKey: string): Promise<IPluginActivation[]> {
    return this.prisma.pluginActivation.findMany({
      where: { appKey, status: { not: PluginActivationStatus.DISABLED as any } },
    }) as Promise<IPluginActivation[]>;
  }

  async updateActivation(id: string, data: Partial<IPluginActivation>): Promise<IPluginActivation> {
    return this.prisma.pluginActivation.update({ where: { id }, data: data as any }) as Promise<IPluginActivation>;
  }

  // ── Extension Points ─────────────────────────────────────────────

  async createExtensionPoint(data: Partial<IPluginExtensionPoint>): Promise<IPluginExtensionPoint> {
    return this.prisma.pluginExtensionPoint.create({ data: data as any }) as Promise<IPluginExtensionPoint>;
  }

  async findExtensionPoint(appKey: string, extensionPointKey: string): Promise<IPluginExtensionPoint | null> {
    return this.prisma.pluginExtensionPoint.findFirst({ where: { appKey, extensionPointKey } }) as Promise<IPluginExtensionPoint | null>;
  }

  async findExtensionPointsForApp(appKey: string): Promise<IPluginExtensionPoint[]> {
    return this.prisma.pluginExtensionPoint.findMany({ where: { appKey }, orderBy: { createdAt: 'desc' } }) as Promise<IPluginExtensionPoint[]>;
  }

  async updateExtensionPoint(id: string, data: Partial<IPluginExtensionPoint>): Promise<IPluginExtensionPoint> {
    return this.prisma.pluginExtensionPoint.update({ where: { id }, data: data as any }) as Promise<IPluginExtensionPoint>;
  }

  // ── Event Subscriptions ──────────────────────────────────────────

  async createSubscription(data: Partial<IPluginEventSubscription>): Promise<IPluginEventSubscription> {
    return this.prisma.pluginEventSubscription.create({ data: data as any }) as Promise<IPluginEventSubscription>;
  }

  async findSubscriptionById(id: string): Promise<IPluginEventSubscription | null> {
    return this.prisma.pluginEventSubscription.findFirst({ where: { id } }) as Promise<IPluginEventSubscription | null>;
  }

  async findSubscription(appKey: string, workspaceId: string, eventName: string): Promise<IPluginEventSubscription | null> {
    return this.prisma.pluginEventSubscription.findFirst({ where: { appKey, workspaceId, eventName } }) as Promise<IPluginEventSubscription | null>;
  }

  async findSubscriptionsForActivation(appKey: string, workspaceId: string): Promise<IPluginEventSubscription[]> {
    return this.prisma.pluginEventSubscription.findMany({ where: { appKey, workspaceId }, orderBy: { createdAt: 'desc' } }) as Promise<IPluginEventSubscription[]>;
  }

  /** Every ACTIVE subscription across all plugins, for this workspace, matching an internal ATLAS event name — the fan-out list for `publishInternalEvent`. */
  async findActiveSubscriptionsForEvent(workspaceId: string, eventName: string): Promise<IPluginEventSubscription[]> {
    return this.prisma.pluginEventSubscription.findMany({
      where: { workspaceId, eventName, status: PluginSubscriptionStatus.ACTIVE as any },
    }) as Promise<IPluginEventSubscription[]>;
  }

  async updateSubscription(id: string, data: Partial<IPluginEventSubscription>): Promise<IPluginEventSubscription> {
    return this.prisma.pluginEventSubscription.update({ where: { id }, data: data as any }) as Promise<IPluginEventSubscription>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<IPluginHistory>): Promise<IPluginHistory> {
    return this.prisma.pluginHistory.create({ data: data as any }) as Promise<IPluginHistory>;
  }

  async findHistory(entityId: string): Promise<IPluginHistory[]> {
    return this.prisma.pluginHistory.findMany({ where: { entityId }, orderBy: { createdAt: 'asc' } }) as Promise<IPluginHistory[]>;
  }
}
