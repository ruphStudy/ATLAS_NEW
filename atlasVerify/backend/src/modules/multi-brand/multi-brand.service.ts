import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import {
  BrandEvent,
  BrandFilterOptions,
  BrandStatus,
  IBrand,
  IBrandEntityLink,
} from './interfaces';
import { MultiBrandRepository } from './repository/multi-brand.repository';
import { MultiBrandCache } from './cache/multi-brand.cache';
import { MultiBrandValidator } from './validator/multi-brand.validator';
import { MultiBrandAudit } from './audit/multi-brand.audit';
import { MultiBrandEventQueue } from './events/multi-brand-events.queue';
import { MULTI_BRAND_CONSTANTS, MULTI_BRAND_ERROR_CODES, MULTI_BRAND_MODULE } from './constants';
import {
  BrandEntityLinkResponseDto,
  BrandFilterDto,
  BrandHistoryResponseDto,
  BrandResponseDto,
  ChangeBrandOwnershipDto,
  CreateBrandDto,
  LinkBrandEntityDto,
  PaginatedBrandResponseDto,
  UpdateBrandDto,
} from './dto';

@Injectable()
export class MultiBrandService {
  private readonly logger = new Logger(MultiBrandService.name);

  constructor(
    private readonly repository: MultiBrandRepository,
    private readonly cache: MultiBrandCache,
    private readonly validator: MultiBrandValidator,
    private readonly audit: MultiBrandAudit,
    private readonly eventQueue: MultiBrandEventQueue,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Brand ───────────────────────────────────────────────────

  async createBrand(dto: CreateBrandDto, userId?: string): Promise<BrandResponseDto> {
    const existing = await this.repository.findBrandByCode(dto.workspaceId, dto.code);
    if (existing) {
      throw new ConflictException({
        message: `A brand with code '${dto.code}' already exists in this workspace`,
        code: MULTI_BRAND_ERROR_CODES.BRAND_DUPLICATE_CODE,
      });
    }

    const validation = await this.validator.validateBrand({
      workspaceId: dto.workspaceId,
      countryCodes: dto.countryCodes ?? [],
      currencyCodes: dto.currencyCodes ?? [],
      marketplaceAccountIds: dto.marketplaceAccountIds ?? [],
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid brand: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: MULTI_BRAND_ERROR_CODES.INVALID_BRAND,
      });
    }

    const currentDefault = await this.repository.findDefaultBrand(dto.workspaceId);
    const raw = await this.repository.createBrand({
      workspaceId: dto.workspaceId,
      organizationId: dto.organizationId ?? null,
      code: dto.code,
      name: dto.name,
      legalOwner: dto.legalOwner ?? null,
      logoUrl: dto.logoUrl ?? null,
      domains: dto.domains ?? [],
      description: dto.description ?? null,
      status: BrandStatus.DRAFT,
      version: 1,
      isDefault: !currentDefault,
      priority: dto.priority ?? MULTI_BRAND_CONSTANTS.DEFAULT_PRIORITY,
      countryCodes: dto.countryCodes ?? [],
      regionCodes: dto.regionCodes ?? [],
      currencyCodes: dto.currencyCodes ?? [],
      marketplaceAccountIds: dto.marketplaceAccountIds ?? [],
      localeCode: dto.localeCode ?? null,
      regionalSettingsProfileKey: dto.regionalSettingsProfileKey ?? null,
      taxJurisdictionCode: dto.taxJurisdictionCode ?? null,
      complianceProfileKey: dto.complianceProfileKey ?? null,
      fulfillmentPreferences: dto.fulfillmentPreferences ?? {},
      seoDefaults: dto.seoDefaults ?? {},
      settings: dto.settings ?? {},
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const brand = raw as unknown as IBrand;
    await this.audit.logBrandChange(brand, 'Created', userId);
    this.invalidateBrandCaches(brand);
    await this.publishEvent(BrandEvent.BRAND_CREATED, { brandId: brand.id, code: brand.code, workspaceId: brand.workspaceId, changedBy: userId });

    return BrandResponseDto.from(brand);
  }

  async findBrands(filter: BrandFilterDto): Promise<PaginatedBrandResponseDto> {
    const [raws, total] = await this.repository.findBrands(filter as BrandFilterOptions);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? MULTI_BRAND_CONSTANTS.DEFAULT_PAGE_SIZE, MULTI_BRAND_CONSTANTS.MAX_PAGE_SIZE);
    return {
      items: (raws as unknown as IBrand[]).map((b) => BrandResponseDto.from(b)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBrandById(id: string, workspaceId?: string): Promise<BrandResponseDto> {
    return BrandResponseDto.from(await this.requireBrand(id, workspaceId));
  }

  async findBrandByCode(workspaceId: string, code: string): Promise<BrandResponseDto> {
    const cached = this.cache.getBrand(workspaceId, code);
    if (cached) return BrandResponseDto.from(cached);

    const raw = await this.repository.findBrandByCode(workspaceId, code);
    if (!raw) {
      throw new NotFoundException({ message: `Brand '${code}' not found in this workspace`, code: MULTI_BRAND_ERROR_CODES.BRAND_NOT_FOUND });
    }
    const brand = raw as unknown as IBrand;
    this.cache.setBrand(brand);
    return BrandResponseDto.from(brand);
  }

  /**
   * Mutates in place while the brand is still DRAFT. Once ACTIVE/INACTIVE
   * (published), an update instead creates a new version — the live row is
   * never touched, so anything already resolved through it stays accurate.
   */
  async updateBrand(id: string, dto: UpdateBrandDto, userId?: string): Promise<BrandResponseDto> {
    const existing = await this.requireBrand(id);

    const validation = await this.validator.validateBrand({
      workspaceId: existing.workspaceId,
      countryCodes: dto.countryCodes ?? existing.countryCodes,
      currencyCodes: dto.currencyCodes ?? existing.currencyCodes,
      marketplaceAccountIds: dto.marketplaceAccountIds ?? existing.marketplaceAccountIds,
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid brand: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: MULTI_BRAND_ERROR_CODES.INVALID_BRAND,
      });
    }

    if (MULTI_BRAND_CONSTANTS.MUTABLE_BRAND_STATUSES.has(existing.status)) {
      const raw = await this.repository.updateBrand(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.legalOwner !== undefined && { legalOwner: dto.legalOwner }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.domains !== undefined && { domains: dto.domains }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.countryCodes !== undefined && { countryCodes: dto.countryCodes }),
        ...(dto.regionCodes !== undefined && { regionCodes: dto.regionCodes }),
        ...(dto.currencyCodes !== undefined && { currencyCodes: dto.currencyCodes }),
        ...(dto.marketplaceAccountIds !== undefined && { marketplaceAccountIds: dto.marketplaceAccountIds }),
        ...(dto.localeCode !== undefined && { localeCode: dto.localeCode }),
        ...(dto.regionalSettingsProfileKey !== undefined && { regionalSettingsProfileKey: dto.regionalSettingsProfileKey }),
        ...(dto.taxJurisdictionCode !== undefined && { taxJurisdictionCode: dto.taxJurisdictionCode }),
        ...(dto.complianceProfileKey !== undefined && { complianceProfileKey: dto.complianceProfileKey }),
        ...(dto.fulfillmentPreferences !== undefined && { fulfillmentPreferences: dto.fulfillmentPreferences }),
        ...(dto.seoDefaults !== undefined && { seoDefaults: dto.seoDefaults }),
        ...(dto.settings !== undefined && { settings: dto.settings }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        updatedBy: userId ?? null,
      });

      const brand = raw as unknown as IBrand;
      this.invalidateBrandCaches(brand);
      await this.audit.logBrandChange(brand, dto.changeReason ?? 'Updated', userId);
      await this.publishEvent(BrandEvent.BRAND_UPDATED, { brandId: brand.id, code: brand.code, workspaceId: brand.workspaceId, changedBy: userId });
      return BrandResponseDto.from(brand);
    }

    // Immutable (ACTIVE/INACTIVE) — create a new version instead of mutating.
    const raw = await this.repository.createBrand({
      workspaceId: existing.workspaceId,
      organizationId: existing.organizationId,
      code: existing.code,
      name: dto.name ?? existing.name,
      legalOwner: dto.legalOwner ?? existing.legalOwner,
      logoUrl: dto.logoUrl ?? existing.logoUrl,
      domains: dto.domains ?? existing.domains,
      description: dto.description ?? existing.description,
      status: BrandStatus.DRAFT,
      version: existing.version + 1,
      isDefault: existing.isDefault,
      priority: dto.priority ?? existing.priority,
      countryCodes: dto.countryCodes ?? existing.countryCodes,
      regionCodes: dto.regionCodes ?? existing.regionCodes,
      currencyCodes: dto.currencyCodes ?? existing.currencyCodes,
      marketplaceAccountIds: dto.marketplaceAccountIds ?? existing.marketplaceAccountIds,
      localeCode: dto.localeCode ?? existing.localeCode,
      regionalSettingsProfileKey: dto.regionalSettingsProfileKey ?? existing.regionalSettingsProfileKey,
      taxJurisdictionCode: dto.taxJurisdictionCode ?? existing.taxJurisdictionCode,
      complianceProfileKey: dto.complianceProfileKey ?? existing.complianceProfileKey,
      fulfillmentPreferences: dto.fulfillmentPreferences ?? existing.fulfillmentPreferences,
      seoDefaults: dto.seoDefaults ?? existing.seoDefaults,
      settings: dto.settings ?? existing.settings,
      metadata: dto.metadata ?? existing.metadata,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const versioned = raw as unknown as IBrand;
    await this.audit.logBrandChange(versioned, dto.changeReason ?? 'New version created', userId);
    await this.publishEvent(BrandEvent.BRAND_UPDATED, {
      brandId: versioned.id,
      code: versioned.code,
      workspaceId: versioned.workspaceId,
      changedBy: userId,
      metadata: { note: 'new draft version created; original stays live until this one is activated' },
    });

    return BrandResponseDto.from(versioned);
  }

  // ── Lifecycle ───────────────────────────────────────────────

  async activateBrand(id: string, userId?: string, reason?: string): Promise<BrandResponseDto> {
    return this.transitionBrand(id, BrandStatus.ACTIVE, BrandEvent.BRAND_ACTIVATED, userId, reason ?? 'Activated');
  }

  async deactivateBrand(id: string, userId?: string, reason?: string): Promise<BrandResponseDto> {
    const existing = await this.requireBrand(id);
    this.assertNotDefault(existing);
    return this.transitionBrand(id, BrandStatus.INACTIVE, BrandEvent.BRAND_DEACTIVATED, userId, reason ?? 'Deactivated');
  }

  async archiveBrand(id: string, userId?: string, reason?: string): Promise<BrandResponseDto> {
    const existing = await this.requireBrand(id);
    this.assertNotDefault(existing);
    return this.transitionBrand(id, BrandStatus.ARCHIVED, BrandEvent.BRAND_ARCHIVED, userId, reason ?? 'Archived');
  }

  async restoreBrand(id: string, userId?: string, reason?: string): Promise<BrandResponseDto> {
    return this.transitionBrand(id, BrandStatus.ACTIVE, BrandEvent.BRAND_RESTORED, userId, reason ?? 'Restored');
  }

  private async transitionBrand(
    id: string,
    to: BrandStatus,
    event: BrandEvent,
    userId?: string,
    reason?: string,
  ): Promise<BrandResponseDto> {
    const existing = await this.requireBrand(id);
    const allowed = MULTI_BRAND_CONSTANTS.ALLOWED_BRAND_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        message: `Cannot transition brand from '${existing.status}' to '${to}'`,
        code: MULTI_BRAND_ERROR_CODES.INVALID_TRANSITION,
      });
    }

    const raw = await this.repository.updateBrand(id, { status: to, updatedBy: userId ?? null });
    const brand = raw as unknown as IBrand;
    this.invalidateBrandCaches(brand);

    await this.audit.logBrandChange(brand, reason ?? `Transitioned to ${to}`, userId);
    await this.publishEvent(event, { brandId: brand.id, code: brand.code, workspaceId: brand.workspaceId, changedBy: userId });
    await this.recordCentralAudit(`multi_brand.brand_${to.toLowerCase()}`, brand.workspaceId, userId, { code: brand.code });

    return BrandResponseDto.from(brand);
  }

  async setDefaultBrand(id: string, userId?: string): Promise<BrandResponseDto> {
    const existing = await this.requireBrand(id);

    await this.repository.clearDefaultBrand(existing.workspaceId);
    const raw = await this.repository.updateBrand(id, {
      isDefault: true,
      status: existing.status === BrandStatus.DRAFT ? BrandStatus.ACTIVE : existing.status,
      updatedBy: userId ?? null,
    });

    const brand = raw as unknown as IBrand;
    this.invalidateBrandCaches(brand);
    await this.audit.logBrandChange(brand, 'Set as default brand', userId);
    await this.publishEvent(BrandEvent.DEFAULT_BRAND_CHANGED, { brandId: brand.id, code: brand.code, workspaceId: brand.workspaceId, changedBy: userId });

    return BrandResponseDto.from(brand);
  }

  async changeOwnership(id: string, dto: ChangeBrandOwnershipDto, userId?: string): Promise<BrandResponseDto> {
    const existing = await this.requireBrand(id);
    const raw = await this.repository.updateBrand(id, { legalOwner: dto.legalOwner, updatedBy: userId ?? null });
    const brand = raw as unknown as IBrand;

    await this.audit.logBrandChange(brand, dto.reason ?? `Ownership changed from '${existing.legalOwner ?? 'unset'}' to '${dto.legalOwner}'`, userId);
    await this.publishEvent(BrandEvent.OWNERSHIP_CHANGED, {
      brandId: brand.id,
      code: brand.code,
      workspaceId: brand.workspaceId,
      changedBy: userId,
      metadata: { previousOwner: existing.legalOwner, newOwner: dto.legalOwner, reason: dto.reason },
    });
    await this.recordCentralAudit('multi_brand.ownership_changed', brand.workspaceId, userId, { code: brand.code, newOwner: dto.legalOwner });

    return BrandResponseDto.from(brand);
  }

  async getBrandHistory(id: string): Promise<BrandHistoryResponseDto[]> {
    await this.requireBrand(id);
    const raws = await this.repository.findBrandHistory(id);
    return raws.map((r) => BrandHistoryResponseDto.from(r as any));
  }

  // ── Entity Links (products, categories, listings, media, ...) ────

  /** Links an entity to this brand. Rejects an exclusive (non-shared) link if the entity already belongs exclusively to a different brand. */
  async linkEntity(brandId: string, dto: LinkBrandEntityDto, userId?: string): Promise<BrandEntityLinkResponseDto> {
    const brand = await this.requireBrand(brandId);

    const existing = await this.repository.findLink(brandId, dto.entityType, dto.entityId);
    if (existing) {
      throw new ConflictException({
        message: `This ${dto.entityType} is already linked to brand '${brand.code}'`,
        code: MULTI_BRAND_ERROR_CODES.LINK_ALREADY_EXISTS,
      });
    }

    const isShared = dto.isShared ?? false;
    if (!isShared) {
      const otherLinks = await this.repository.findLinksForEntity(brand.workspaceId, dto.entityType, dto.entityId);
      const exclusiveElsewhere = (otherLinks as unknown as IBrandEntityLink[]).some((link) => !link.isShared);
      if (exclusiveElsewhere) {
        throw new ConflictException({
          message: `This ${dto.entityType} is already exclusively assigned to another brand — link it as shared, or unlink it first`,
          code: MULTI_BRAND_ERROR_CODES.INVALID_CROSS_BRAND_ASSIGNMENT,
        });
      }
    }

    const raw = await this.repository.createLink({
      brandId,
      workspaceId: brand.workspaceId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      isShared,
      isPrimary: dto.isPrimary ?? true,
      linkedBy: userId ?? null,
    });

    const link = raw as unknown as IBrandEntityLink;
    await this.publishEvent(BrandEvent.ENTITY_LINKED, {
      brandId,
      code: brand.code,
      workspaceId: brand.workspaceId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      changedBy: userId,
    });

    return BrandEntityLinkResponseDto.from(link);
  }

  async listLinks(brandId: string): Promise<BrandEntityLinkResponseDto[]> {
    const raws = await this.repository.findLinks({ brandId });
    return (raws as unknown as IBrandEntityLink[]).map((l) => BrandEntityLinkResponseDto.from(l));
  }

  async unlinkEntity(brandId: string, entityType: string, entityId: string, userId?: string): Promise<void> {
    const brand = await this.requireBrand(brandId);
    const existing = await this.repository.findLink(brandId, entityType, entityId);
    if (!existing) {
      throw new NotFoundException({ message: 'Brand entity link not found', code: MULTI_BRAND_ERROR_CODES.LINK_NOT_FOUND });
    }

    await this.repository.deleteLink((existing as unknown as IBrandEntityLink).id);
    await this.publishEvent(BrandEvent.ENTITY_UNLINKED, {
      brandId,
      code: brand.code,
      workspaceId: brand.workspaceId,
      entityType,
      entityId,
      changedBy: userId,
    });
  }

  // ── Cache ───────────────────────────────────────────────────

  async invalidateCache(workspaceId?: string): Promise<void> {
    if (workspaceId) {
      this.cache.invalidateBrandSet(workspaceId);
      this.cache.invalidateBrandsByWorkspace(workspaceId);
    } else {
      this.cache.flush();
    }
    await this.publishEvent(BrandEvent.CACHE_INVALIDATED, { workspaceId: workspaceId ?? null });
  }

  // ── Helpers ─────────────────────────────────────────────────

  private invalidateBrandCaches(brand: IBrand): void {
    this.cache.invalidateBrandSet(brand.workspaceId);
    this.cache.invalidateBrand(brand.workspaceId, brand.code);
  }

  private assertNotDefault(brand: IBrand): void {
    if (brand.isDefault) {
      throw new BadRequestException({
        message: `Brand '${brand.code}' is the default brand for this workspace and cannot be deactivated or archived — set another brand as default first`,
        code: MULTI_BRAND_ERROR_CODES.DEFAULT_BRAND_PROTECTED,
      });
    }
  }

  private async requireBrand(id: string, workspaceId?: string): Promise<IBrand> {
    const raw = await this.repository.findBrandById(id, workspaceId);
    if (!raw) {
      throw new NotFoundException({ message: `Brand '${id}' not found`, code: MULTI_BRAND_ERROR_CODES.BRAND_NOT_FOUND });
    }
    return raw as unknown as IBrand;
  }

  private async publishEvent(
    event: BrandEvent,
    fields: {
      brandId?: string | null;
      code?: string | null;
      workspaceId?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      changedBy?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      brandId: fields.brandId ?? null,
      code: fields.code ?? null,
      workspaceId: fields.workspaceId ?? null,
      entityType: fields.entityType ?? null,
      entityId: fields.entityId ?? null,
      changedBy: fields.changedBy ?? null,
      metadata: fields.metadata,
      timestamp: new Date(),
    });
  }

  private async recordCentralAudit(action: string, workspaceId: string, performedBy?: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: MULTI_BRAND_MODULE,
        entityType: 'Brand',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
