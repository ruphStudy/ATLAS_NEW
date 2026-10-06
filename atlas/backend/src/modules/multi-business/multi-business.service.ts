import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { BusinessEvent, BusinessFilterOptions, BusinessStatus, IBusiness, IBusinessEntityLink } from './interfaces';
import { MultiBusinessRepository } from './repository/multi-business.repository';
import { MultiBusinessCache } from './cache/multi-business.cache';
import { MultiBusinessValidator } from './validator/multi-business.validator';
import { MultiBusinessAudit } from './audit/multi-business.audit';
import { MultiBusinessEventQueue } from './events/multi-business-events.queue';
import { MULTI_BUSINESS_CONSTANTS, MULTI_BUSINESS_ERROR_CODES, MULTI_BUSINESS_MODULE } from './constants';
import {
  BusinessEntityLinkResponseDto,
  BusinessFilterDto,
  BusinessHistoryResponseDto,
  BusinessResponseDto,
  ChangeBusinessOwnershipDto,
  CreateBusinessDto,
  LinkBusinessEntityDto,
  PaginatedBusinessResponseDto,
  SetParentBusinessDto,
  UpdateBusinessDto,
} from './dto';

@Injectable()
export class MultiBusinessService {
  private readonly logger = new Logger(MultiBusinessService.name);

  constructor(
    private readonly repository: MultiBusinessRepository,
    private readonly cache: MultiBusinessCache,
    private readonly validator: MultiBusinessValidator,
    private readonly audit: MultiBusinessAudit,
    private readonly eventQueue: MultiBusinessEventQueue,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Business ────────────────────────────────────────────────

  async createBusiness(dto: CreateBusinessDto, userId?: string): Promise<BusinessResponseDto> {
    const existingCode = await this.repository.findBusinessByCode(dto.workspaceId, dto.code);
    if (existingCode) {
      throw new ConflictException({
        message: `A business with code '${dto.code}' already exists in this workspace`,
        code: MULTI_BUSINESS_ERROR_CODES.BUSINESS_DUPLICATE_CODE,
      });
    }

    if (dto.registrationNumber || dto.taxIdentifier) {
      const duplicateIdentity = await this.repository.findBusinessByLegalIdentity(
        dto.organizationId ?? null,
        dto.workspaceId,
        dto.registrationNumber ?? null,
        dto.taxIdentifier ?? null,
      );
      if (duplicateIdentity) {
        throw new ConflictException({
          message: 'Another business already uses this registration number or tax identifier',
          code: MULTI_BUSINESS_ERROR_CODES.DUPLICATE_LEGAL_IDENTITY,
        });
      }
    }

    if (dto.parentBusinessId) {
      const parent = await this.repository.findBusinessById(dto.parentBusinessId);
      if (!parent) {
        throw new BadRequestException({
          message: `Parent business '${dto.parentBusinessId}' not found`,
          code: MULTI_BUSINESS_ERROR_CODES.BUSINESS_NOT_FOUND,
        });
      }
    }

    const validation = await this.validator.validateBusiness({
      workspaceId: dto.workspaceId,
      countryCode: dto.countryCode ?? null,
      currencyCode: dto.currencyCode ?? null,
      workspaceIds: dto.workspaceIds ?? [],
      brandIds: dto.brandIds ?? [],
      warehouseIds: dto.warehouseIds ?? [],
      supplierIds: dto.supplierIds ?? [],
      actorUserId: userId,
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid business: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: MULTI_BUSINESS_ERROR_CODES.INVALID_BUSINESS,
      });
    }

    const currentDefault = await this.repository.findDefaultBusiness(dto.workspaceId);
    const raw = await this.repository.createBusiness({
      workspaceId: dto.workspaceId,
      organizationId: dto.organizationId ?? null,
      parentBusinessId: dto.parentBusinessId ?? null,
      code: dto.code,
      name: dto.name,
      legalName: dto.legalName ?? null,
      businessType: dto.businessType ?? null,
      registrationNumber: dto.registrationNumber ?? null,
      taxIdentifier: dto.taxIdentifier ?? null,
      countryCode: dto.countryCode ?? null,
      regionCode: dto.regionCode ?? null,
      currencyCode: dto.currencyCode ?? null,
      timezone: dto.timezone ?? null,
      contacts: dto.contacts ?? [],
      status: BusinessStatus.DRAFT,
      version: 1,
      isDefault: !currentDefault,
      priority: dto.priority ?? MULTI_BUSINESS_CONSTANTS.DEFAULT_PRIORITY,
      visibilityScope: dto.visibilityScope ?? 'BUSINESS',
      workspaceIds: dto.workspaceIds ?? [],
      brandIds: dto.brandIds ?? [],
      warehouseIds: dto.warehouseIds ?? [],
      marketplaceAccountIds: dto.marketplaceAccountIds ?? [],
      supplierIds: dto.supplierIds ?? [],
      regionalSettingsProfileKey: dto.regionalSettingsProfileKey ?? null,
      taxJurisdictionCode: dto.taxJurisdictionCode ?? null,
      complianceProfileKey: dto.complianceProfileKey ?? null,
      billingAccountRef: dto.billingAccountRef ?? null,
      settings: dto.settings ?? {},
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const business = raw as unknown as IBusiness;
    await this.audit.logBusinessChange(business, 'Created', userId);
    this.invalidateBusinessCaches(business);
    await this.publishEvent(BusinessEvent.BUSINESS_CREATED, {
      businessId: business.id,
      code: business.code,
      workspaceId: business.workspaceId,
      organizationId: business.organizationId,
      changedBy: userId,
    });

    return BusinessResponseDto.from(business);
  }

  async findBusinesses(filter: BusinessFilterDto): Promise<PaginatedBusinessResponseDto> {
    const [raws, total] = await this.repository.findBusinesses(filter as BusinessFilterOptions);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? MULTI_BUSINESS_CONSTANTS.DEFAULT_PAGE_SIZE, MULTI_BUSINESS_CONSTANTS.MAX_PAGE_SIZE);
    return {
      items: (raws as unknown as IBusiness[]).map((b) => BusinessResponseDto.from(b)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBusinessById(id: string, workspaceId?: string): Promise<BusinessResponseDto> {
    return BusinessResponseDto.from(await this.requireBusiness(id, workspaceId));
  }

  async findBusinessByCode(workspaceId: string, code: string): Promise<BusinessResponseDto> {
    const cached = this.cache.getBusiness(workspaceId, code);
    if (cached) return BusinessResponseDto.from(cached);

    const raw = await this.repository.findBusinessByCode(workspaceId, code);
    if (!raw) {
      throw new NotFoundException({ message: `Business '${code}' not found in this workspace`, code: MULTI_BUSINESS_ERROR_CODES.BUSINESS_NOT_FOUND });
    }
    const business = raw as unknown as IBusiness;
    this.cache.setBusiness(business);
    return BusinessResponseDto.from(business);
  }

  async findChildren(id: string): Promise<BusinessResponseDto[]> {
    await this.requireBusiness(id);
    const raws = await this.repository.findChildren(id);
    return (raws as unknown as IBusiness[]).map((b) => BusinessResponseDto.from(b));
  }

  /**
   * Mutates in place while the business is still DRAFT. Once ACTIVE/
   * SUSPENDED (published), an update instead creates a new version — the
   * live row is never touched, so anything already resolved through it
   * stays accurate.
   */
  async updateBusiness(id: string, dto: UpdateBusinessDto, userId?: string): Promise<BusinessResponseDto> {
    const existing = await this.requireBusiness(id);

    const registrationNumber = dto.registrationNumber !== undefined ? dto.registrationNumber : existing.registrationNumber;
    const taxIdentifier = dto.taxIdentifier !== undefined ? dto.taxIdentifier : existing.taxIdentifier;
    if (
      (dto.registrationNumber !== undefined && dto.registrationNumber !== existing.registrationNumber) ||
      (dto.taxIdentifier !== undefined && dto.taxIdentifier !== existing.taxIdentifier)
    ) {
      const duplicateIdentity = await this.repository.findBusinessByLegalIdentity(
        existing.organizationId ?? null,
        existing.workspaceId,
        registrationNumber ?? null,
        taxIdentifier ?? null,
        existing.id,
      );
      if (duplicateIdentity) {
        throw new ConflictException({
          message: 'Another business already uses this registration number or tax identifier',
          code: MULTI_BUSINESS_ERROR_CODES.DUPLICATE_LEGAL_IDENTITY,
        });
      }
    }

    const validation = await this.validator.validateBusiness({
      workspaceId: existing.workspaceId,
      countryCode: dto.countryCode ?? existing.countryCode,
      currencyCode: dto.currencyCode ?? existing.currencyCode,
      workspaceIds: dto.workspaceIds ?? existing.workspaceIds,
      brandIds: dto.brandIds ?? existing.brandIds,
      warehouseIds: dto.warehouseIds ?? existing.warehouseIds,
      supplierIds: dto.supplierIds ?? existing.supplierIds,
      actorUserId: userId,
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid business: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: MULTI_BUSINESS_ERROR_CODES.INVALID_BUSINESS,
      });
    }

    if (MULTI_BUSINESS_CONSTANTS.MUTABLE_BUSINESS_STATUSES.has(existing.status)) {
      const raw = await this.repository.updateBusiness(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.legalName !== undefined && { legalName: dto.legalName }),
        ...(dto.businessType !== undefined && { businessType: dto.businessType }),
        ...(dto.registrationNumber !== undefined && { registrationNumber: dto.registrationNumber }),
        ...(dto.taxIdentifier !== undefined && { taxIdentifier: dto.taxIdentifier }),
        ...(dto.countryCode !== undefined && { countryCode: dto.countryCode }),
        ...(dto.regionCode !== undefined && { regionCode: dto.regionCode }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.contacts !== undefined && { contacts: dto.contacts }),
        ...(dto.visibilityScope !== undefined && { visibilityScope: dto.visibilityScope }),
        ...(dto.workspaceIds !== undefined && { workspaceIds: dto.workspaceIds }),
        ...(dto.brandIds !== undefined && { brandIds: dto.brandIds }),
        ...(dto.warehouseIds !== undefined && { warehouseIds: dto.warehouseIds }),
        ...(dto.marketplaceAccountIds !== undefined && { marketplaceAccountIds: dto.marketplaceAccountIds }),
        ...(dto.supplierIds !== undefined && { supplierIds: dto.supplierIds }),
        ...(dto.regionalSettingsProfileKey !== undefined && { regionalSettingsProfileKey: dto.regionalSettingsProfileKey }),
        ...(dto.taxJurisdictionCode !== undefined && { taxJurisdictionCode: dto.taxJurisdictionCode }),
        ...(dto.complianceProfileKey !== undefined && { complianceProfileKey: dto.complianceProfileKey }),
        ...(dto.billingAccountRef !== undefined && { billingAccountRef: dto.billingAccountRef }),
        ...(dto.settings !== undefined && { settings: dto.settings }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        updatedBy: userId ?? null,
      });

      const business = raw as unknown as IBusiness;
      this.invalidateBusinessCaches(business);
      await this.audit.logBusinessChange(business, dto.changeReason ?? 'Updated', userId);
      await this.publishEvent(BusinessEvent.BUSINESS_UPDATED, {
        businessId: business.id,
        code: business.code,
        workspaceId: business.workspaceId,
        organizationId: business.organizationId,
        changedBy: userId,
      });
      return BusinessResponseDto.from(business);
    }

    // Immutable (ACTIVE/SUSPENDED) — create a new version instead of mutating.
    const raw = await this.repository.createBusiness({
      workspaceId: existing.workspaceId,
      organizationId: existing.organizationId,
      parentBusinessId: existing.parentBusinessId,
      code: existing.code,
      name: dto.name ?? existing.name,
      legalName: dto.legalName ?? existing.legalName,
      businessType: dto.businessType ?? existing.businessType,
      registrationNumber,
      taxIdentifier,
      countryCode: dto.countryCode ?? existing.countryCode,
      regionCode: dto.regionCode ?? existing.regionCode,
      currencyCode: dto.currencyCode ?? existing.currencyCode,
      timezone: dto.timezone ?? existing.timezone,
      contacts: dto.contacts ?? existing.contacts,
      status: BusinessStatus.DRAFT,
      version: existing.version + 1,
      isDefault: existing.isDefault,
      priority: dto.priority ?? existing.priority,
      visibilityScope: dto.visibilityScope ?? existing.visibilityScope,
      workspaceIds: dto.workspaceIds ?? existing.workspaceIds,
      brandIds: dto.brandIds ?? existing.brandIds,
      warehouseIds: dto.warehouseIds ?? existing.warehouseIds,
      marketplaceAccountIds: dto.marketplaceAccountIds ?? existing.marketplaceAccountIds,
      supplierIds: dto.supplierIds ?? existing.supplierIds,
      regionalSettingsProfileKey: dto.regionalSettingsProfileKey ?? existing.regionalSettingsProfileKey,
      taxJurisdictionCode: dto.taxJurisdictionCode ?? existing.taxJurisdictionCode,
      complianceProfileKey: dto.complianceProfileKey ?? existing.complianceProfileKey,
      billingAccountRef: dto.billingAccountRef ?? existing.billingAccountRef,
      settings: dto.settings ?? existing.settings,
      metadata: dto.metadata ?? existing.metadata,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const versioned = raw as unknown as IBusiness;
    await this.audit.logBusinessChange(versioned, dto.changeReason ?? 'New version created', userId);
    await this.publishEvent(BusinessEvent.BUSINESS_UPDATED, {
      businessId: versioned.id,
      code: versioned.code,
      workspaceId: versioned.workspaceId,
      organizationId: versioned.organizationId,
      changedBy: userId,
      metadata: { note: 'new draft version created; original stays live until this one is activated' },
    });

    return BusinessResponseDto.from(versioned);
  }

  // ── Lifecycle ───────────────────────────────────────────────

  async activateBusiness(id: string, userId?: string, reason?: string): Promise<BusinessResponseDto> {
    return this.transitionBusiness(id, BusinessStatus.ACTIVE, BusinessEvent.BUSINESS_ACTIVATED, userId, reason ?? 'Activated');
  }

  async suspendBusiness(id: string, userId?: string, reason?: string): Promise<BusinessResponseDto> {
    const existing = await this.requireBusiness(id);
    this.assertNotDefault(existing, 'suspended');
    return this.transitionBusiness(id, BusinessStatus.SUSPENDED, BusinessEvent.BUSINESS_SUSPENDED, userId, reason ?? 'Suspended');
  }

  async archiveBusiness(id: string, userId?: string, reason?: string): Promise<BusinessResponseDto> {
    const existing = await this.requireBusiness(id);
    this.assertNotDefault(existing, 'archived');
    return this.transitionBusiness(id, BusinessStatus.ARCHIVED, BusinessEvent.BUSINESS_ARCHIVED, userId, reason ?? 'Archived');
  }

  async restoreBusiness(id: string, userId?: string, reason?: string): Promise<BusinessResponseDto> {
    return this.transitionBusiness(id, BusinessStatus.ACTIVE, BusinessEvent.BUSINESS_RESTORED, userId, reason ?? 'Restored');
  }

  private async transitionBusiness(
    id: string,
    to: BusinessStatus,
    event: BusinessEvent,
    userId?: string,
    reason?: string,
  ): Promise<BusinessResponseDto> {
    const existing = await this.requireBusiness(id);
    const allowed = MULTI_BUSINESS_CONSTANTS.ALLOWED_BUSINESS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        message: `Cannot transition business from '${existing.status}' to '${to}'`,
        code: MULTI_BUSINESS_ERROR_CODES.INVALID_TRANSITION,
      });
    }

    const raw = await this.repository.updateBusiness(id, { status: to, updatedBy: userId ?? null });
    const business = raw as unknown as IBusiness;
    this.invalidateBusinessCaches(business);

    await this.audit.logBusinessChange(business, reason ?? `Transitioned to ${to}`, userId);
    await this.publishEvent(event, {
      businessId: business.id,
      code: business.code,
      workspaceId: business.workspaceId,
      organizationId: business.organizationId,
      changedBy: userId,
    });
    await this.recordCentralAudit(`multi_business.business_${to.toLowerCase()}`, business.workspaceId, userId, { code: business.code });

    return BusinessResponseDto.from(business);
  }

  async setDefaultBusiness(id: string, userId?: string): Promise<BusinessResponseDto> {
    const existing = await this.requireBusiness(id);

    await this.repository.clearDefaultBusiness(existing.workspaceId);
    const raw = await this.repository.updateBusiness(id, {
      isDefault: true,
      status: existing.status === BusinessStatus.DRAFT ? BusinessStatus.ACTIVE : existing.status,
      updatedBy: userId ?? null,
    });

    const business = raw as unknown as IBusiness;
    this.invalidateBusinessCaches(business);
    await this.audit.logBusinessChange(business, 'Set as default business', userId);
    await this.publishEvent(BusinessEvent.DEFAULT_BUSINESS_CHANGED, {
      businessId: business.id,
      code: business.code,
      workspaceId: business.workspaceId,
      organizationId: business.organizationId,
      changedBy: userId,
    });

    return BusinessResponseDto.from(business);
  }

  // ── Hierarchy ───────────────────────────────────────────────

  async setParentBusiness(id: string, dto: SetParentBusinessDto, userId?: string): Promise<BusinessResponseDto> {
    const existing = await this.requireBusiness(id);

    if (dto.parentBusinessId) {
      const parent = await this.repository.findBusinessById(dto.parentBusinessId);
      if (!parent) {
        throw new NotFoundException({
          message: `Parent business '${dto.parentBusinessId}' not found`,
          code: MULTI_BUSINESS_ERROR_CODES.BUSINESS_NOT_FOUND,
        });
      }
      const wouldCycle = await this.validator.wouldCreateHierarchyCycle(id, dto.parentBusinessId);
      if (wouldCycle) {
        throw new BadRequestException({
          message: `Assigning '${dto.parentBusinessId}' as the parent of '${existing.code}' would create a hierarchy cycle`,
          code: MULTI_BUSINESS_ERROR_CODES.HIERARCHY_CYCLE,
        });
      }
    }

    const raw = await this.repository.updateBusiness(id, {
      parentBusinessId: dto.parentBusinessId ?? null,
      updatedBy: userId ?? null,
    });

    const business = raw as unknown as IBusiness;
    this.invalidateBusinessCaches(business);
    await this.audit.logBusinessChange(business, dto.reason ?? 'Parent business changed', userId);
    await this.publishEvent(BusinessEvent.HIERARCHY_CHANGED, {
      businessId: business.id,
      code: business.code,
      workspaceId: business.workspaceId,
      organizationId: business.organizationId,
      changedBy: userId,
      metadata: { previousParentId: existing.parentBusinessId, newParentId: dto.parentBusinessId ?? null },
    });

    return BusinessResponseDto.from(business);
  }

  async changeOwnership(id: string, dto: ChangeBusinessOwnershipDto, userId?: string): Promise<BusinessResponseDto> {
    const existing = await this.requireBusiness(id);

    const registrationNumber = dto.registrationNumber !== undefined ? dto.registrationNumber : existing.registrationNumber;
    const taxIdentifier = dto.taxIdentifier !== undefined ? dto.taxIdentifier : existing.taxIdentifier;
    if (
      (dto.registrationNumber !== undefined && dto.registrationNumber !== existing.registrationNumber) ||
      (dto.taxIdentifier !== undefined && dto.taxIdentifier !== existing.taxIdentifier)
    ) {
      const duplicateIdentity = await this.repository.findBusinessByLegalIdentity(
        existing.organizationId ?? null,
        existing.workspaceId,
        registrationNumber ?? null,
        taxIdentifier ?? null,
        existing.id,
      );
      if (duplicateIdentity) {
        throw new ConflictException({
          message: 'Another business already uses this registration number or tax identifier',
          code: MULTI_BUSINESS_ERROR_CODES.DUPLICATE_LEGAL_IDENTITY,
        });
      }
    }

    const raw = await this.repository.updateBusiness(id, {
      ...(dto.legalName !== undefined && { legalName: dto.legalName }),
      ...(dto.registrationNumber !== undefined && { registrationNumber: dto.registrationNumber }),
      ...(dto.taxIdentifier !== undefined && { taxIdentifier: dto.taxIdentifier }),
      updatedBy: userId ?? null,
    });
    const business = raw as unknown as IBusiness;

    await this.audit.logBusinessChange(business, dto.reason ?? 'Ownership changed', userId);
    await this.publishEvent(BusinessEvent.OWNERSHIP_CHANGED, {
      businessId: business.id,
      code: business.code,
      workspaceId: business.workspaceId,
      organizationId: business.organizationId,
      changedBy: userId,
      metadata: {
        previousLegalName: existing.legalName,
        newLegalName: business.legalName,
        reason: dto.reason,
      },
    });
    await this.recordCentralAudit('multi_business.ownership_changed', business.workspaceId, userId, { code: business.code });

    return BusinessResponseDto.from(business);
  }

  async getBusinessHistory(id: string): Promise<BusinessHistoryResponseDto[]> {
    await this.requireBusiness(id);
    const raws = await this.repository.findBusinessHistory(id);
    return raws.map((r) => BusinessHistoryResponseDto.from(r as any));
  }

  // ── Entity Links (workspaces, brands, warehouses, marketplace accounts, suppliers, reports, ...) ──

  /** Links an entity to this business. Rejects an exclusive (non-shared) link if the entity already belongs exclusively to a different business. */
  async linkEntity(businessId: string, dto: LinkBusinessEntityDto, userId?: string): Promise<BusinessEntityLinkResponseDto> {
    const business = await this.requireBusiness(businessId);

    const existing = await this.repository.findLink(businessId, dto.entityType, dto.entityId);
    if (existing) {
      throw new ConflictException({
        message: `This ${dto.entityType} is already linked to business '${business.code}'`,
        code: MULTI_BUSINESS_ERROR_CODES.LINK_ALREADY_EXISTS,
      });
    }

    const isShared = dto.isShared ?? false;
    if (!isShared) {
      const otherLinks = await this.repository.findLinksForEntity(business.workspaceId, dto.entityType, dto.entityId);
      const exclusiveElsewhere = (otherLinks as unknown as IBusinessEntityLink[]).some((link) => !link.isShared);
      if (exclusiveElsewhere) {
        throw new ConflictException({
          message: `This ${dto.entityType} is already exclusively assigned to another business — link it as shared, or unlink it first`,
          code: MULTI_BUSINESS_ERROR_CODES.INVALID_CROSS_BUSINESS_ASSIGNMENT,
        });
      }
    }

    const raw = await this.repository.createLink({
      businessId,
      workspaceId: business.workspaceId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      isShared,
      isPrimary: dto.isPrimary ?? true,
      linkedBy: userId ?? null,
    });

    const link = raw as unknown as IBusinessEntityLink;
    await this.publishEvent(BusinessEvent.ENTITY_LINKED, {
      businessId,
      code: business.code,
      workspaceId: business.workspaceId,
      organizationId: business.organizationId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      changedBy: userId,
    });

    return BusinessEntityLinkResponseDto.from(link);
  }

  async listLinks(businessId: string): Promise<BusinessEntityLinkResponseDto[]> {
    const raws = await this.repository.findLinks({ businessId });
    return (raws as unknown as IBusinessEntityLink[]).map((l) => BusinessEntityLinkResponseDto.from(l));
  }

  async unlinkEntity(businessId: string, entityType: string, entityId: string, userId?: string): Promise<void> {
    const business = await this.requireBusiness(businessId);
    const existing = await this.repository.findLink(businessId, entityType, entityId);
    if (!existing) {
      throw new NotFoundException({ message: 'Business entity link not found', code: MULTI_BUSINESS_ERROR_CODES.LINK_NOT_FOUND });
    }

    await this.repository.deleteLink((existing as unknown as IBusinessEntityLink).id);
    await this.publishEvent(BusinessEvent.ENTITY_UNLINKED, {
      businessId,
      code: business.code,
      workspaceId: business.workspaceId,
      organizationId: business.organizationId,
      entityType,
      entityId,
      changedBy: userId,
    });
  }

  // ── Cache ───────────────────────────────────────────────────

  async invalidateCache(workspaceId?: string): Promise<void> {
    if (workspaceId) {
      this.cache.invalidateBusinessSet(workspaceId);
      this.cache.invalidateBusinessesByWorkspace(workspaceId);
    } else {
      this.cache.flush();
    }
    await this.publishEvent(BusinessEvent.CACHE_INVALIDATED, { workspaceId: workspaceId ?? null });
  }

  // ── Helpers ─────────────────────────────────────────────────

  private invalidateBusinessCaches(business: IBusiness): void {
    this.cache.invalidateBusinessSet(business.workspaceId);
    this.cache.invalidateBusiness(business.workspaceId, business.code);
  }

  private assertNotDefault(business: IBusiness, action: string): void {
    if (business.isDefault) {
      throw new BadRequestException({
        message: `Business '${business.code}' is the default business for this workspace and cannot be ${action} — set another business as default first`,
        code: MULTI_BUSINESS_ERROR_CODES.DEFAULT_BUSINESS_PROTECTED,
      });
    }
  }

  private async requireBusiness(id: string, workspaceId?: string): Promise<IBusiness> {
    const raw = await this.repository.findBusinessById(id, workspaceId);
    if (!raw) {
      throw new NotFoundException({ message: `Business '${id}' not found`, code: MULTI_BUSINESS_ERROR_CODES.BUSINESS_NOT_FOUND });
    }
    return raw as unknown as IBusiness;
  }

  private async publishEvent(
    event: BusinessEvent,
    fields: {
      businessId?: string | null;
      code?: string | null;
      workspaceId?: string | null;
      organizationId?: string | null;
      entityType?: string | null;
      entityId?: string | null;
      changedBy?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      businessId: fields.businessId ?? null,
      code: fields.code ?? null,
      workspaceId: fields.workspaceId ?? null,
      organizationId: fields.organizationId ?? null,
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
        module: MULTI_BUSINESS_MODULE,
        entityType: 'Business',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
