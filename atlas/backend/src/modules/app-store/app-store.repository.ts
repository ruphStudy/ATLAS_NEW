import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { AppInstallationStatus, IAppHistory, IAppInstallation, IAppListing, IAppReview, IAppVersion } from './interfaces';
import { AppListingFilterDto, AppInstallationFilterDto, AppReviewFilterDto } from './dto';

@Injectable()
export class AppStoreRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Listings ─────────────────────────────────────────────────────

  async createListing(data: Partial<IAppListing>): Promise<IAppListing> {
    return this.prisma.appListing.create({ data: data as any }) as Promise<IAppListing>;
  }

  async findListingByKey(key: string): Promise<IAppListing | null> {
    return this.prisma.appListing.findFirst({ where: { key } }) as Promise<IAppListing | null>;
  }

  /** `visibility` narrows to what the caller is allowed to see (public PUBLISHED catalog vs. their own org's PRIVATE listings) — built entirely by the service, this just executes the query. */
  async findAllListings(visibility: Record<string, unknown>, filter: AppListingFilterDto): Promise<[IAppListing[], number]> {
    const where: Record<string, unknown> = { ...visibility };
    if (filter.publisherType) where.publisherType = filter.publisherType;
    if (filter.pricingModel) where.pricingModel = filter.pricingModel;
    if (filter.status) where.status = filter.status;
    if (filter.category) where.category = filter.category;
    if (filter.search) {
      where.OR = [{ key: { contains: filter.search, mode: 'insensitive' } }, { name: { contains: filter.search, mode: 'insensitive' } }];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.appListing.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.appListing.count({ where: where as any }),
    ]);

    return [data as IAppListing[], total];
  }

  async updateListing(key: string, data: Partial<IAppListing>): Promise<IAppListing> {
    return this.prisma.appListing.update({ where: { key }, data: data as any }) as Promise<IAppListing>;
  }

  // ── Versions ─────────────────────────────────────────────────────

  async createVersion(data: Partial<IAppVersion>): Promise<IAppVersion> {
    return this.prisma.appVersion.create({ data: data as any }) as Promise<IAppVersion>;
  }

  async findVersionById(id: string): Promise<IAppVersion | null> {
    return this.prisma.appVersion.findFirst({ where: { id } }) as Promise<IAppVersion | null>;
  }

  async findVersionByAppAndString(appKey: string, versionString: string): Promise<IAppVersion | null> {
    return this.prisma.appVersion.findFirst({ where: { appKey, versionString } }) as Promise<IAppVersion | null>;
  }

  async findVersionsForApp(appKey: string): Promise<IAppVersion[]> {
    return this.prisma.appVersion.findMany({ where: { appKey }, orderBy: { createdAt: 'desc' } }) as Promise<IAppVersion[]>;
  }

  async updateVersion(id: string, data: Partial<IAppVersion>): Promise<IAppVersion> {
    return this.prisma.appVersion.update({ where: { id }, data: data as any }) as Promise<IAppVersion>;
  }

  // ── Installations ────────────────────────────────────────────────

  async createInstallation(data: Partial<IAppInstallation>): Promise<IAppInstallation> {
    return this.prisma.appInstallation.create({ data: data as any }) as Promise<IAppInstallation>;
  }

  async findInstallationById(id: string): Promise<IAppInstallation | null> {
    return this.prisma.appInstallation.findFirst({ where: { id } }) as Promise<IAppInstallation | null>;
  }

  async findInstallationByAppAndWorkspace(appKey: string, workspaceId: string): Promise<IAppInstallation | null> {
    return this.prisma.appInstallation.findFirst({ where: { appKey, workspaceId } }) as Promise<IAppInstallation | null>;
  }

  async findAllInstallations(workspaceId: string, filter: AppInstallationFilterDto): Promise<[IAppInstallation[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.status) where.status = filter.status;
    if (filter.appKey) where.appKey = filter.appKey;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.appInstallation.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.appInstallation.count({ where: where as any }),
    ]);

    return [data as IAppInstallation[], total];
  }

  /** Every non-uninstalled installation of `appKey` for this workspace's tenant set — used for dependency/compatibility checks and active-tenant counting. */
  async findActiveInstallationsForApp(appKey: string): Promise<IAppInstallation[]> {
    return this.prisma.appInstallation.findMany({
      where: { appKey, status: { not: AppInstallationStatus.UNINSTALLED as any } },
    }) as Promise<IAppInstallation[]>;
  }

  /** Every active installation, in this workspace, of an app that lists `dependencyKey` as a dependency — used to block uninstalling something else still depends on. */
  async findActiveDependentsInWorkspace(workspaceId: string, dependencyKey: string): Promise<IAppInstallation[]> {
    return this.prisma.appInstallation.findMany({
      where: {
        workspaceId,
        status: { not: AppInstallationStatus.UNINSTALLED as any },
        listing: { dependencies: { has: dependencyKey } },
      },
    }) as unknown as Promise<IAppInstallation[]>;
  }

  async updateInstallation(id: string, data: Partial<IAppInstallation>): Promise<IAppInstallation> {
    return this.prisma.appInstallation.update({ where: { id }, data: data as any }) as Promise<IAppInstallation>;
  }

  // ── Reviews ──────────────────────────────────────────────────────

  async findReview(appKey: string, workspaceId: string): Promise<IAppReview | null> {
    return this.prisma.appReview.findFirst({ where: { appKey, workspaceId } }) as Promise<IAppReview | null>;
  }

  async createReview(data: Partial<IAppReview>): Promise<IAppReview> {
    return this.prisma.appReview.create({ data: data as any }) as Promise<IAppReview>;
  }

  async updateReview(id: string, data: Partial<IAppReview>): Promise<IAppReview> {
    return this.prisma.appReview.update({ where: { id }, data: data as any }) as Promise<IAppReview>;
  }

  async findAllReviews(appKey: string, filter: AppReviewFilterDto): Promise<[IAppReview[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.appReview.findMany({ where: { appKey }, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.appReview.count({ where: { appKey } }),
    ]);

    return [data as IAppReview[], total];
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<IAppHistory>): Promise<IAppHistory> {
    return this.prisma.appHistory.create({ data: data as any }) as Promise<IAppHistory>;
  }

  async findHistory(entityId: string): Promise<IAppHistory[]> {
    return this.prisma.appHistory.findMany({ where: { entityId }, orderBy: { createdAt: 'asc' } }) as Promise<IAppHistory[]>;
  }
}
