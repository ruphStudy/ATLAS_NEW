import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { LocalizationService } from '@modules/localization/localization.service';
import {
  IEffectiveRegionalSettings,
  IRegionalSettingsProfile,
  IRegionalSettingsResolutionContext,
  RegionalSettingsEvent,
  RegionalSettingsProfileFilterOptions,
  RegionalSettingsScopeType,
  RegionalSettingsStatus,
} from './interfaces';
import { RegionalSettingsRepository } from './repository/regional-settings.repository';
import { RegionalSettingsCache } from './cache/regional-settings.cache';
import { RegionalSettingsResolver } from './resolver/regional-settings.resolver';
import { RegionalSettingsValidator } from './validator/regional-settings.validator';
import { RegionalSettingsAudit } from './audit/regional-settings.audit';
import { RegionalSettingsEventQueue } from './events/regional-settings-events.queue';
import { REGIONAL_SETTINGS_CONSTANTS, REGIONAL_SETTINGS_ERROR_CODES, REGIONAL_SETTINGS_MODULE } from './constants';
import {
  CreateRegionalSettingsProfileDto,
  EffectiveRegionalSettingsResponseDto,
  PaginatedRegionalSettingsProfileResponseDto,
  RegionalSettingsProfileFilterDto,
  RegionalSettingsProfileHistoryResponseDto,
  RegionalSettingsProfileResponseDto,
  RollbackRegionalSettingsProfileDto,
  UpdateRegionalSettingsProfileDto,
} from './dto';

const ARRAY_FIELDS = ['marketplaceKeys', 'supplierIds', 'warehouseIds', 'fulfillmentProviderKeys', 'paymentProviderKeys', 'workingDays', 'holidays'] as const;
const OBJECT_FIELDS = ['businessHours', 'pricingPreferences', 'shippingPreferences', 'fulfillmentPreferences', 'availabilityPreferences'] as const;
const SCALAR_FIELDS = [
  'localeCode',
  'languageCode',
  'currencyCode',
  'timezone',
  'dateFormat',
  'timeFormat',
  'numberFormat',
  'measurementSystem',
  'addressFormat',
  'taxJurisdictionCode',
  'complianceProfileKey',
] as const;

@Injectable()
export class RegionalSettingsService {
  private readonly logger = new Logger(RegionalSettingsService.name);

  constructor(
    private readonly repository: RegionalSettingsRepository,
    private readonly cache: RegionalSettingsCache,
    private readonly resolver: RegionalSettingsResolver,
    private readonly validator: RegionalSettingsValidator,
    private readonly audit: RegionalSettingsAudit,
    private readonly eventQueue: RegionalSettingsEventQueue,
    private readonly auditLogsService: AuditLogsService,
    private readonly localizationService: LocalizationService,
  ) {}

  // ── Profile ─────────────────────────────────────────────────

  async createProfile(dto: CreateRegionalSettingsProfileDto, userId?: string): Promise<RegionalSettingsProfileResponseDto> {
    const workspaceId = dto.workspaceId ?? null;
    const organizationId = dto.organizationId ?? null;
    const countryCode = dto.countryCode ? dto.countryCode.toUpperCase() : null;
    const regionCode = dto.regionCode ? dto.regionCode.toUpperCase() : null;

    const existing = await this.repository.findProfileByScope(dto.key, workspaceId, organizationId, countryCode, regionCode);
    if (existing) {
      throw new ConflictException({
        message: `A regional settings profile with key '${dto.key}' already exists for this scope`,
        code: REGIONAL_SETTINGS_ERROR_CODES.PROFILE_DUPLICATE,
      });
    }

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    const validation = await this.validator.validateProfile({
      countryCode,
      regionCode,
      localeCode: dto.localeCode ?? null,
      currencyCode: dto.currencyCode ?? null,
      taxJurisdictionCode: dto.taxJurisdictionCode ?? null,
      effectiveFrom,
      effectiveTo,
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid regional settings profile: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: REGIONAL_SETTINGS_ERROR_CODES.INVALID_PROFILE,
      });
    }

    const raw = await this.repository.createProfile({
      key: dto.key,
      workspaceId,
      organizationId,
      scopeType: dto.scopeType,
      countryCode,
      regionCode,
      localeCode: dto.localeCode ?? null,
      languageCode: dto.languageCode ?? null,
      currencyCode: dto.currencyCode ?? null,
      timezone: dto.timezone ?? null,
      dateFormat: dto.dateFormat ?? null,
      timeFormat: dto.timeFormat ?? null,
      numberFormat: dto.numberFormat ?? null,
      measurementSystem: dto.measurementSystem ?? null,
      addressFormat: dto.addressFormat ?? null,
      taxJurisdictionCode: dto.taxJurisdictionCode ?? null,
      complianceProfileKey: dto.complianceProfileKey ?? null,
      marketplaceKeys: dto.marketplaceKeys ?? [],
      supplierIds: dto.supplierIds ?? [],
      warehouseIds: dto.warehouseIds ?? [],
      fulfillmentProviderKeys: dto.fulfillmentProviderKeys ?? [],
      paymentProviderKeys: dto.paymentProviderKeys ?? [],
      workingDays: dto.workingDays ?? [],
      businessHours: dto.businessHours ?? {},
      holidays: dto.holidays ?? [],
      pricingPreferences: dto.pricingPreferences ?? {},
      shippingPreferences: dto.shippingPreferences ?? {},
      fulfillmentPreferences: dto.fulfillmentPreferences ?? {},
      availabilityPreferences: dto.availabilityPreferences ?? {},
      priority: dto.priority ?? REGIONAL_SETTINGS_CONSTANTS.DEFAULT_PRIORITY,
      status: RegionalSettingsStatus.DRAFT,
      version: 1,
      effectiveFrom,
      effectiveTo,
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const profile = raw as unknown as IRegionalSettingsProfile;
    await this.audit.logProfileChange(profile, 'Created', userId);
    await this.publishEvent(RegionalSettingsEvent.PROFILE_CREATED, {
      profileId: profile.id,
      key: profile.key,
      workspaceId: profile.workspaceId,
      countryCode: profile.countryCode,
      regionCode: profile.regionCode,
      changedBy: userId,
    });

    return RegionalSettingsProfileResponseDto.from(profile);
  }

  async findProfiles(filter: RegionalSettingsProfileFilterDto): Promise<PaginatedRegionalSettingsProfileResponseDto> {
    const [raws, total] = await this.repository.findProfiles(filter as RegionalSettingsProfileFilterOptions);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? REGIONAL_SETTINGS_CONSTANTS.DEFAULT_PAGE_SIZE, REGIONAL_SETTINGS_CONSTANTS.MAX_PAGE_SIZE);
    return {
      items: (raws as unknown as IRegionalSettingsProfile[]).map((p) => RegionalSettingsProfileResponseDto.from(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findProfileById(id: string): Promise<RegionalSettingsProfileResponseDto> {
    return RegionalSettingsProfileResponseDto.from(await this.requireProfile(id));
  }

  /**
   * Mutates in place while the profile is still DRAFT (never yet
   * published). Once PUBLISHED, an update instead creates a new version —
   * the live/finalized row is never touched, so anything that already
   * resolved through it stays accurate.
   */
  async updateProfile(id: string, dto: UpdateRegionalSettingsProfileDto, userId?: string): Promise<RegionalSettingsProfileResponseDto> {
    const existing = await this.requireProfile(id);

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : existing.effectiveFrom;
    const effectiveTo = dto.effectiveTo !== undefined ? (dto.effectiveTo ? new Date(dto.effectiveTo) : null) : existing.effectiveTo;
    const localeCode = dto.localeCode !== undefined ? dto.localeCode : existing.localeCode;
    const currencyCode = dto.currencyCode !== undefined ? dto.currencyCode : existing.currencyCode;
    const taxJurisdictionCode = dto.taxJurisdictionCode !== undefined ? dto.taxJurisdictionCode : existing.taxJurisdictionCode;

    const validation = await this.validator.validateProfile({
      countryCode: existing.countryCode,
      regionCode: existing.regionCode,
      localeCode: localeCode ?? null,
      currencyCode: currencyCode ?? null,
      taxJurisdictionCode: taxJurisdictionCode ?? null,
      effectiveFrom,
      effectiveTo,
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid regional settings profile: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: REGIONAL_SETTINGS_ERROR_CODES.INVALID_PROFILE,
      });
    }

    if (REGIONAL_SETTINGS_CONSTANTS.MUTABLE_PROFILE_STATUSES.has(existing.status)) {
      const raw = await this.repository.updateProfile(id, {
        ...(dto.languageCode !== undefined && { languageCode: dto.languageCode }),
        ...(dto.localeCode !== undefined && { localeCode: dto.localeCode }),
        ...(dto.currencyCode !== undefined && { currencyCode: dto.currencyCode }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.dateFormat !== undefined && { dateFormat: dto.dateFormat }),
        ...(dto.timeFormat !== undefined && { timeFormat: dto.timeFormat }),
        ...(dto.numberFormat !== undefined && { numberFormat: dto.numberFormat }),
        ...(dto.measurementSystem !== undefined && { measurementSystem: dto.measurementSystem }),
        ...(dto.addressFormat !== undefined && { addressFormat: dto.addressFormat }),
        ...(dto.taxJurisdictionCode !== undefined && { taxJurisdictionCode: dto.taxJurisdictionCode }),
        ...(dto.complianceProfileKey !== undefined && { complianceProfileKey: dto.complianceProfileKey }),
        ...(dto.marketplaceKeys !== undefined && { marketplaceKeys: dto.marketplaceKeys }),
        ...(dto.supplierIds !== undefined && { supplierIds: dto.supplierIds }),
        ...(dto.warehouseIds !== undefined && { warehouseIds: dto.warehouseIds }),
        ...(dto.fulfillmentProviderKeys !== undefined && { fulfillmentProviderKeys: dto.fulfillmentProviderKeys }),
        ...(dto.paymentProviderKeys !== undefined && { paymentProviderKeys: dto.paymentProviderKeys }),
        ...(dto.workingDays !== undefined && { workingDays: dto.workingDays }),
        ...(dto.businessHours !== undefined && { businessHours: dto.businessHours }),
        ...(dto.holidays !== undefined && { holidays: dto.holidays }),
        ...(dto.pricingPreferences !== undefined && { pricingPreferences: dto.pricingPreferences }),
        ...(dto.shippingPreferences !== undefined && { shippingPreferences: dto.shippingPreferences }),
        ...(dto.fulfillmentPreferences !== undefined && { fulfillmentPreferences: dto.fulfillmentPreferences }),
        ...(dto.availabilityPreferences !== undefined && { availabilityPreferences: dto.availabilityPreferences }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        effectiveFrom,
        effectiveTo,
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        updatedBy: userId ?? null,
      });

      const profile = raw as unknown as IRegionalSettingsProfile;
      this.invalidateProfileCaches(profile);
      await this.audit.logProfileChange(profile, dto.changeReason ?? 'Updated', userId);
      await this.publishEvent(RegionalSettingsEvent.PROFILE_UPDATED, {
        profileId: profile.id,
        key: profile.key,
        workspaceId: profile.workspaceId,
        countryCode: profile.countryCode,
        regionCode: profile.regionCode,
        changedBy: userId,
      });
      return RegionalSettingsProfileResponseDto.from(profile);
    }

    // Immutable (PUBLISHED) — create a new version instead of mutating.
    const raw = await this.repository.createProfile({
      key: existing.key,
      workspaceId: existing.workspaceId,
      organizationId: existing.organizationId,
      scopeType: existing.scopeType,
      countryCode: existing.countryCode,
      regionCode: existing.regionCode,
      languageCode: dto.languageCode ?? existing.languageCode,
      localeCode,
      currencyCode,
      timezone: dto.timezone ?? existing.timezone,
      dateFormat: dto.dateFormat ?? existing.dateFormat,
      timeFormat: dto.timeFormat ?? existing.timeFormat,
      numberFormat: dto.numberFormat ?? existing.numberFormat,
      measurementSystem: dto.measurementSystem ?? existing.measurementSystem,
      addressFormat: dto.addressFormat ?? existing.addressFormat,
      taxJurisdictionCode,
      complianceProfileKey: dto.complianceProfileKey ?? existing.complianceProfileKey,
      marketplaceKeys: dto.marketplaceKeys ?? existing.marketplaceKeys,
      supplierIds: dto.supplierIds ?? existing.supplierIds,
      warehouseIds: dto.warehouseIds ?? existing.warehouseIds,
      fulfillmentProviderKeys: dto.fulfillmentProviderKeys ?? existing.fulfillmentProviderKeys,
      paymentProviderKeys: dto.paymentProviderKeys ?? existing.paymentProviderKeys,
      workingDays: dto.workingDays ?? existing.workingDays,
      businessHours: dto.businessHours ?? existing.businessHours,
      holidays: dto.holidays ?? existing.holidays,
      pricingPreferences: dto.pricingPreferences ?? existing.pricingPreferences,
      shippingPreferences: dto.shippingPreferences ?? existing.shippingPreferences,
      fulfillmentPreferences: dto.fulfillmentPreferences ?? existing.fulfillmentPreferences,
      availabilityPreferences: dto.availabilityPreferences ?? existing.availabilityPreferences,
      priority: dto.priority ?? existing.priority,
      status: RegionalSettingsStatus.DRAFT,
      version: existing.version + 1,
      supersedesId: existing.id,
      effectiveFrom,
      effectiveTo,
      metadata: dto.metadata ?? existing.metadata,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const versioned = raw as unknown as IRegionalSettingsProfile;
    await this.audit.logProfileChange(versioned, dto.changeReason ?? 'New version created', userId);
    await this.publishEvent(RegionalSettingsEvent.PROFILE_UPDATED, {
      profileId: versioned.id,
      key: versioned.key,
      workspaceId: versioned.workspaceId,
      countryCode: versioned.countryCode,
      regionCode: versioned.regionCode,
      changedBy: userId,
      metadata: { supersedesId: existing.id },
    });

    return RegionalSettingsProfileResponseDto.from(versioned);
  }

  async publishProfile(id: string, userId?: string): Promise<RegionalSettingsProfileResponseDto> {
    const existing = await this.requireProfile(id);

    const validation = await this.validator.validateProfile({
      countryCode: existing.countryCode,
      regionCode: existing.regionCode,
      localeCode: existing.localeCode,
      currencyCode: existing.currencyCode,
      taxJurisdictionCode: existing.taxJurisdictionCode,
      effectiveFrom: existing.effectiveFrom,
      effectiveTo: existing.effectiveTo,
    });
    if (!validation.valid) {
      await this.publishEvent(RegionalSettingsEvent.VALIDATION_FAILED, {
        profileId: existing.id,
        key: existing.key,
        workspaceId: existing.workspaceId,
        metadata: { issues: validation.issues },
      });
      throw new BadRequestException({
        message: `Cannot publish regional settings profile '${existing.key}': ${validation.issues.map((i) => i.message).join('; ')}`,
        code: REGIONAL_SETTINGS_ERROR_CODES.INVALID_PROFILE,
      });
    }

    return this.transitionProfile(id, RegionalSettingsStatus.PUBLISHED, RegionalSettingsEvent.PROFILE_PUBLISHED, userId);
  }

  async archiveProfile(id: string, userId?: string): Promise<RegionalSettingsProfileResponseDto> {
    return this.transitionProfile(id, RegionalSettingsStatus.ARCHIVED, RegionalSettingsEvent.PROFILE_ARCHIVED, userId);
  }

  private async transitionProfile(
    id: string,
    to: RegionalSettingsStatus,
    event: RegionalSettingsEvent,
    userId?: string,
  ): Promise<RegionalSettingsProfileResponseDto> {
    const existing = await this.requireProfile(id);
    const allowed = REGIONAL_SETTINGS_CONSTANTS.ALLOWED_PROFILE_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        message: `Cannot transition regional settings profile from '${existing.status}' to '${to}'`,
        code: REGIONAL_SETTINGS_ERROR_CODES.INVALID_TRANSITION,
      });
    }

    const raw = await this.repository.updateProfile(id, { status: to, updatedBy: userId ?? null });
    const profile = raw as unknown as IRegionalSettingsProfile;
    this.invalidateProfileCaches(profile);

    await this.audit.logProfileChange(profile, `Transitioned to ${to}`, userId);
    await this.publishEvent(event, {
      profileId: profile.id,
      key: profile.key,
      workspaceId: profile.workspaceId,
      countryCode: profile.countryCode,
      regionCode: profile.regionCode,
      changedBy: userId,
    });
    await this.recordCentralAudit(`regional_settings.profile_${to.toLowerCase()}`, userId, {
      workspaceId: profile.workspaceId ?? undefined,
      key: profile.key,
    });

    return RegionalSettingsProfileResponseDto.from(profile);
  }

  /** Restores a prior version's field values as a brand-new DRAFT version — the current row and history are never mutated. */
  async rollbackProfile(id: string, dto: RollbackRegionalSettingsProfileDto, userId?: string): Promise<RegionalSettingsProfileResponseDto> {
    const existing = await this.requireProfile(id);
    const historyEntry = await this.repository.findProfileHistoryByVersion(id, dto.toVersion);
    if (!historyEntry) {
      throw new NotFoundException({
        message: `Version ${dto.toVersion} not found in history for regional settings profile '${id}'`,
        code: REGIONAL_SETTINGS_ERROR_CODES.HISTORY_VERSION_NOT_FOUND,
      });
    }

    const { createdAt: _createdAt, updatedAt: _updatedAt, ...snapshot } = historyEntry['snapshot'] as Record<string, unknown>;
    const raw = await this.repository.createProfile({
      ...snapshot,
      key: existing.key,
      workspaceId: existing.workspaceId,
      organizationId: existing.organizationId,
      scopeType: existing.scopeType,
      countryCode: existing.countryCode,
      regionCode: existing.regionCode,
      status: RegionalSettingsStatus.DRAFT,
      version: existing.version + 1,
      supersedesId: existing.id,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const rolledBack = raw as unknown as IRegionalSettingsProfile;
    this.invalidateProfileCaches(rolledBack);
    await this.audit.logProfileChange(rolledBack, dto.reason ?? `Rolled back to v${dto.toVersion}`, userId);
    await this.publishEvent(RegionalSettingsEvent.PROFILE_ROLLED_BACK, {
      profileId: rolledBack.id,
      key: rolledBack.key,
      workspaceId: rolledBack.workspaceId,
      countryCode: rolledBack.countryCode,
      regionCode: rolledBack.regionCode,
      changedBy: userId,
      metadata: { rolledBackToVersion: dto.toVersion, supersedesId: existing.id },
    });

    return RegionalSettingsProfileResponseDto.from(rolledBack);
  }

  async getProfileHistory(id: string): Promise<RegionalSettingsProfileHistoryResponseDto[]> {
    await this.requireProfile(id);
    const raws = await this.repository.findProfileHistory(id);
    return raws.map((r) => RegionalSettingsProfileHistoryResponseDto.from(r as any));
  }

  // ── Resolution ──────────────────────────────────────────────

  /**
   * Resolves the effective regional settings for a context by folding
   * every applicable PUBLISHED profile from least to most specific
   * (global → country → region → organization → workspace, priority as
   * tie-break). Any dimension no profile sets falls back to the
   * Localization Framework's own `resolveEffectiveRegionalSettings()` —
   * never recomputed here.
   */
  async resolveEffectiveSettings(context: IRegionalSettingsResolutionContext): Promise<EffectiveRegionalSettingsResponseDto> {
    const effectiveDate = context.effectiveDate ?? new Date();
    const cacheKey = RegionalSettingsCache.buildResolutionKey(context.workspaceId, context.countryCode, context.regionCode, effectiveDate);
    const cached = this.cache.getResolution(cacheKey);
    if (cached) {
      return EffectiveRegionalSettingsResponseDto.from(cached);
    }

    const profiles = await this.resolver.resolveApplicableProfiles(
      context.workspaceId,
      context.organizationId ?? null,
      context.countryCode ?? null,
      context.regionCode ?? null,
      effectiveDate,
    );

    const merged: Record<string, unknown> = {
      marketplaceKeys: [],
      supplierIds: [],
      warehouseIds: [],
      fulfillmentProviderKeys: [],
      paymentProviderKeys: [],
      workingDays: [],
      businessHours: {},
      holidays: [],
      pricingPreferences: {},
      shippingPreferences: {},
      fulfillmentPreferences: {},
      availabilityPreferences: {},
    };
    const sources: Record<string, RegionalSettingsScopeType | 'LOCALIZATION_DEFAULT'> = {};
    const contributingProfileIds: string[] = [];

    for (const profile of profiles) {
      let contributed = false;
      for (const field of SCALAR_FIELDS) {
        const value = profile[field];
        if (value !== null && value !== undefined) {
          merged[field] = value;
          sources[field] = profile.scopeType;
          contributed = true;
        }
      }
      for (const field of ARRAY_FIELDS) {
        const value = profile[field] as unknown[];
        if (value && value.length > 0) {
          merged[field] = value;
          sources[field] = profile.scopeType;
          contributed = true;
        }
      }
      for (const field of OBJECT_FIELDS) {
        const value = profile[field] as Record<string, unknown>;
        if (value && Object.keys(value).length > 0) {
          merged[field] = value;
          sources[field] = profile.scopeType;
          contributed = true;
        }
      }
      if (contributed) contributingProfileIds.push(profile.id);
    }

    if (context.userId) {
      const localizationDefaults = await this.localizationService.resolveEffectiveRegionalSettings(context.workspaceId, context.userId);
      const scalarFallback: Record<string, unknown> = {
        localeCode: localizationDefaults.localeCode,
        timezone: localizationDefaults.timezone,
        currencyCode: localizationDefaults.currencyCode,
        dateFormat: localizationDefaults.dateFormat,
        measurementSystem: localizationDefaults.measurementSystem,
      };
      for (const [field, value] of Object.entries(scalarFallback)) {
        if ((merged[field] === undefined || merged[field] === null) && value !== undefined && value !== null) {
          merged[field] = value;
          sources[field] = 'LOCALIZATION_DEFAULT';
        }
      }
    }

    // numberFormat is object-shaped here (decimal/thousands separators) — reuse the resolved
    // locale's own catalog definition rather than Localization's preference-setting string.
    if ((merged.numberFormat === undefined || merged.numberFormat === null) && typeof merged.localeCode === 'string') {
      try {
        const localeDef = await this.localizationService.getLocale(merged.localeCode);
        merged.numberFormat = localeDef.numberFormat;
        sources.numberFormat = 'LOCALIZATION_DEFAULT';
      } catch {
        // resolved locale code doesn't exist in the catalog — leave numberFormat unset
      }
    }

    const result: IEffectiveRegionalSettings = {
      localeCode: (merged.localeCode as string) ?? null,
      languageCode: (merged.languageCode as string) ?? null,
      currencyCode: (merged.currencyCode as string) ?? null,
      timezone: (merged.timezone as string) ?? null,
      dateFormat: (merged.dateFormat as string) ?? null,
      timeFormat: (merged.timeFormat as string) ?? null,
      numberFormat: (merged.numberFormat as Record<string, unknown>) ?? null,
      measurementSystem: (merged.measurementSystem as string) ?? null,
      addressFormat: (merged.addressFormat as Record<string, unknown>) ?? null,
      taxJurisdictionCode: (merged.taxJurisdictionCode as string) ?? null,
      complianceProfileKey: (merged.complianceProfileKey as string) ?? null,
      marketplaceKeys: merged.marketplaceKeys as string[],
      supplierIds: merged.supplierIds as string[],
      warehouseIds: merged.warehouseIds as string[],
      fulfillmentProviderKeys: merged.fulfillmentProviderKeys as string[],
      paymentProviderKeys: merged.paymentProviderKeys as string[],
      workingDays: merged.workingDays as number[],
      businessHours: merged.businessHours as Record<string, unknown>,
      holidays: merged.holidays as Array<{ date: string; name: string }>,
      pricingPreferences: merged.pricingPreferences as Record<string, unknown>,
      shippingPreferences: merged.shippingPreferences as Record<string, unknown>,
      fulfillmentPreferences: merged.fulfillmentPreferences as Record<string, unknown>,
      availabilityPreferences: merged.availabilityPreferences as Record<string, unknown>,
      sources,
      contributingProfileIds,
    };

    this.cache.setResolution(cacheKey, result);
    return EffectiveRegionalSettingsResponseDto.from(result);
  }

  // ── Cache ───────────────────────────────────────────────────

  async invalidateCache(workspaceId?: string): Promise<void> {
    if (workspaceId) {
      this.cache.invalidateProfileSetsByWorkspace(workspaceId);
      this.cache.invalidateResolutionsByWorkspace(workspaceId);
    } else {
      this.cache.flush();
    }
    await this.publishEvent(RegionalSettingsEvent.CACHE_INVALIDATED, { workspaceId: workspaceId ?? null });
  }

  // ── Helpers ─────────────────────────────────────────────────

  private invalidateProfileCaches(profile: IRegionalSettingsProfile): void {
    if (profile.workspaceId) {
      this.cache.invalidateProfileSetsByWorkspace(profile.workspaceId);
      this.cache.invalidateResolutionsByWorkspace(profile.workspaceId);
    } else {
      this.cache.invalidateAllProfileSets();
      this.cache.invalidateAllResolutions();
    }
  }

  private async requireProfile(id: string): Promise<IRegionalSettingsProfile> {
    const raw = await this.repository.findProfileById(id);
    if (!raw) {
      throw new NotFoundException({
        message: `Regional settings profile '${id}' not found`,
        code: REGIONAL_SETTINGS_ERROR_CODES.PROFILE_NOT_FOUND,
      });
    }
    return raw as unknown as IRegionalSettingsProfile;
  }

  private async publishEvent(
    event: RegionalSettingsEvent,
    fields: {
      profileId?: string | null;
      key?: string | null;
      workspaceId?: string | null;
      countryCode?: string | null;
      regionCode?: string | null;
      changedBy?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      profileId: fields.profileId ?? null,
      key: fields.key ?? null,
      workspaceId: fields.workspaceId ?? null,
      countryCode: fields.countryCode ?? null,
      regionCode: fields.regionCode ?? null,
      changedBy: fields.changedBy ?? null,
      metadata: fields.metadata,
      timestamp: new Date(),
    });
  }

  private async recordCentralAudit(action: string, performedBy?: string, metadata?: Record<string, unknown> & { workspaceId?: string }): Promise<void> {
    const workspaceId = metadata?.workspaceId;
    if (!workspaceId) return;

    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: REGIONAL_SETTINGS_MODULE,
        entityType: 'RegionalSettingsProfile',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
