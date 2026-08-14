import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import {
  CountryEvent,
  CountryFilterOptions,
  CountryProviderAvailabilityFilter,
  CountryResolutionRequest,
  CountryResolutionResult,
  CountryStatus,
  CountryValidationRequest,
  CountryValidationResult,
  ICountry,
  ICountryProviderAvailability,
  IWorkspaceCountryConfig,
} from './interfaces';
import { CountryRepository } from './repository/country.repository';
import { CountryRegistry } from './registry/country.registry';
import { CountryCache } from './cache/country.cache';
import { CountryContextResolver } from './resolver/country-context.resolver';
import { CountryValidator } from './validator/country.validator';
import { CountryAudit } from './audit/country.audit';
import { CountryEventQueue } from './events/country-events.queue';
import { COUNTRY_CONSTANTS, COUNTRY_ERROR_CODES, COUNTRY_MODULE } from './constants';
import {
  CountryFilterDto,
  CountryResponseDto,
  CreateCountryDto,
  CreateCountryOverrideDto,
  PaginatedCountryResponseDto,
  UpdateCountryDto,
  UpsertProviderAvailabilityDto,
  UpsertWorkspaceCountryConfigDto,
} from './dto';

@Injectable()
export class CountryService implements OnModuleInit {
  private readonly logger = new Logger(CountryService.name);

  constructor(
    private readonly repository: CountryRepository,
    private readonly registry: CountryRegistry,
    private readonly cache: CountryCache,
    private readonly resolver: CountryContextResolver,
    private readonly validator: CountryValidator,
    private readonly audit: CountryAudit,
    private readonly eventQueue: CountryEventQueue,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    try {
      const [countries] = await this.repository.findAll({ status: CountryStatus.ACTIVE });
      this.registry.seed(countries as unknown as ICountry[]);
    } catch (err) {
      this.logger.warn(`Failed to seed country registry on init: ${(err as Error).message}`);
    }
  }

  // ── Country CRUD ──────────────────────────────────────────

  async registerCountry(dto: CreateCountryDto, userId?: string): Promise<CountryResponseDto> {
    const existing = await this.repository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException({
        message: `Country '${dto.code}' already exists`,
        code: COUNTRY_ERROR_CODES.DUPLICATE,
      });
    }

    const supportedLocales = this.withDefault(dto.supportedLocales, dto.locale);
    const supportedCurrencies = this.withDefault(dto.supportedCurrencies, dto.currency.toUpperCase());
    const supportedLanguages = this.withDefault(dto.supportedLanguages, dto.language);

    const raw = await this.repository.create({
      code: dto.code.toUpperCase(),
      name: dto.name,
      region: dto.region ?? null,
      timezone: dto.timezone,
      locale: dto.locale,
      currency: dto.currency.toUpperCase(),
      language: dto.language,
      supportedLocales,
      supportedCurrencies,
      supportedLanguages,
      taxRegime: dto.taxRegime ?? null,
      complianceRefs: dto.complianceRefs ?? [],
      businessRules: dto.businessRules ?? {},
      status: CountryStatus.DRAFT,
      version: 1,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const country = raw as unknown as ICountry;
    this.registry.register(country);

    await this.audit.logChange(country, 'Registered', userId);
    await this.publishEvent(CountryEvent.REGISTERED, country.code, userId);

    return CountryResponseDto.from(country);
  }

  async findAll(filter: CountryFilterDto): Promise<PaginatedCountryResponseDto> {
    const [raws, total] = await this.repository.findAll(filter as CountryFilterOptions);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? COUNTRY_CONSTANTS.DEFAULT_PAGE_SIZE, COUNTRY_CONSTANTS.MAX_PAGE_SIZE);
    return {
      items: (raws as unknown as ICountry[]).map((c) => CountryResponseDto.from(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<CountryResponseDto> {
    const raw = await this.repository.findById(id);
    if (!raw) throw new NotFoundException({ message: `Country '${id}' not found`, code: COUNTRY_ERROR_CODES.NOT_FOUND });
    return CountryResponseDto.from(raw as unknown as ICountry);
  }

  async findByCode(code: string): Promise<CountryResponseDto> {
    const cached = this.cache.getCountry(code);
    if (cached) return CountryResponseDto.from(cached);

    const raw = await this.repository.findByCode(code);
    if (!raw) throw new NotFoundException({ message: `Country '${code}' not found`, code: COUNTRY_ERROR_CODES.NOT_FOUND });
    const country = raw as unknown as ICountry;
    this.cache.setCountry(country);
    return CountryResponseDto.from(country);
  }

  async updateCountry(id: string, dto: UpdateCountryDto, userId?: string): Promise<CountryResponseDto> {
    const existing = await this.requireCountry(id);
    this.assertMutable(existing);

    const locale = dto.locale ?? existing.locale;
    const currency = dto.currency ? dto.currency.toUpperCase() : existing.currency;
    const language = dto.language ?? existing.language;
    const supportedLocales = this.withDefault(dto.supportedLocales ?? existing.supportedLocales, locale);
    const supportedCurrencies = this.withDefault(dto.supportedCurrencies ?? existing.supportedCurrencies, currency);
    const supportedLanguages = this.withDefault(dto.supportedLanguages ?? existing.supportedLanguages, language);

    const raw = await this.repository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.region !== undefined && { region: dto.region }),
      ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      locale,
      currency,
      language,
      supportedLocales,
      supportedCurrencies,
      supportedLanguages,
      ...(dto.taxRegime !== undefined && { taxRegime: dto.taxRegime }),
      ...(dto.complianceRefs !== undefined && { complianceRefs: dto.complianceRefs }),
      ...(dto.businessRules !== undefined && { businessRules: dto.businessRules }),
      ...(dto.effectiveFrom !== undefined && { effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null }),
      ...(dto.effectiveTo !== undefined && { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      version: existing.version + 1,
      updatedBy: userId ?? null,
    });

    const country = raw as unknown as ICountry;
    this.registry.register(country);
    this.cache.invalidateCountry(country.code);

    await this.audit.logChange(country, dto.changeReason ?? 'Updated', userId);
    await this.publishEvent(CountryEvent.UPDATED, country.code, userId);

    return CountryResponseDto.from(country);
  }

  async enableCountry(id: string, userId?: string): Promise<CountryResponseDto> {
    return this.transition(id, CountryStatus.ACTIVE, CountryEvent.ENABLED, 'Enabled', userId);
  }

  async disableCountry(id: string, userId?: string): Promise<CountryResponseDto> {
    return this.transition(id, CountryStatus.DISABLED, CountryEvent.DISABLED, 'Disabled', userId);
  }

  async deprecateCountry(id: string, userId?: string): Promise<CountryResponseDto> {
    return this.transition(id, CountryStatus.DEPRECATED, CountryEvent.DEPRECATED, 'Deprecated', userId);
  }

  async archiveCountry(id: string, userId?: string): Promise<CountryResponseDto> {
    return this.transition(id, CountryStatus.ARCHIVED, CountryEvent.ARCHIVED, 'Archived', userId);
  }

  async restoreCountry(id: string, userId?: string): Promise<CountryResponseDto> {
    return this.transition(id, CountryStatus.DRAFT, CountryEvent.RESTORED, 'Restored', userId);
  }

  async deleteCountry(id: string, userId?: string): Promise<void> {
    const existing = await this.requireCountry(id);
    this.assertMutable(existing);
    await this.repository.softDelete(id, userId);
    this.registry.unregister(existing.code);
    this.cache.invalidateCountry(existing.code);
  }

  async getHistory(id: string): Promise<Record<string, unknown>[]> {
    await this.requireCountry(id);
    return this.repository.findHistory(id);
  }

  // ── Workspace Enablement / Configuration ──────────────────

  async upsertWorkspaceConfig(
    workspaceId: string,
    dto: UpsertWorkspaceCountryConfigDto,
    userId?: string,
  ): Promise<IWorkspaceCountryConfig> {
    const country = await this.requireCountryByCode(dto.countryCode);

    let fallbackCountryCode: string | null = null;
    if (dto.fallbackCountryCode) {
      fallbackCountryCode = dto.fallbackCountryCode.toUpperCase();
      if (fallbackCountryCode === country.code) {
        throw new BadRequestException({
          message: `A country cannot fall back to itself ('${country.code}')`,
          code: COUNTRY_ERROR_CODES.VALIDATION_FAILED,
        });
      }
      await this.requireCountryByCode(fallbackCountryCode); // invalid-dependency check — must be a registered country
    }

    const raw = await this.repository.upsertWorkspaceConfig({
      workspaceId,
      countryCode: country.code,
      organizationId: dto.organizationId ?? null,
      isEnabled: dto.isEnabled ?? true,
      priority: dto.priority ?? COUNTRY_CONSTANTS.DEFAULT_PRIORITY,
      fallbackCountryCode,
      configuration: dto.configuration ?? {},
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    this.cache.invalidateResolutionsByWorkspace(workspaceId);

    await this.publishEvent(CountryEvent.CONFIGURED, country.code, userId, { workspaceId });
    await this.recordCentralAudit('country.workspace_configured', country.code, userId, { workspaceId });

    return raw as unknown as IWorkspaceCountryConfig;
  }

  async getWorkspaceConfigs(workspaceId: string): Promise<IWorkspaceCountryConfig[]> {
    const raws = await this.repository.findWorkspaceConfigs(workspaceId);
    return raws as unknown as IWorkspaceCountryConfig[];
  }

  async setDefaultCountry(workspaceId: string, countryCode: string, userId?: string): Promise<IWorkspaceCountryConfig> {
    const country = await this.requireCountryByCode(countryCode);

    const existing = await this.repository.findWorkspaceConfig(workspaceId, country.code);
    if (!existing || !(existing as unknown as IWorkspaceCountryConfig).isEnabled) {
      throw new BadRequestException(`Country '${country.code}' must be enabled for this workspace before it can be set as default`);
    }

    await this.repository.clearDefault(workspaceId, country.code);
    const raw = await this.repository.upsertWorkspaceConfig({
      workspaceId,
      countryCode: country.code,
      isDefault: true,
      updatedBy: userId ?? null,
    });

    this.cache.invalidateResolutionsByWorkspace(workspaceId);

    await this.publishEvent(CountryEvent.DEFAULT_CHANGED, country.code, userId, { workspaceId });
    await this.recordCentralAudit('country.default_changed', country.code, userId, { workspaceId });

    return raw as unknown as IWorkspaceCountryConfig;
  }

  async removeWorkspaceCountry(workspaceId: string, countryCode: string, userId?: string): Promise<void> {
    const existing = await this.repository.findWorkspaceConfig(workspaceId, countryCode);
    if (!existing) return;
    await this.repository.softDeleteWorkspaceConfig((existing as { id: string }).id, userId);
    this.cache.invalidateResolutionsByWorkspace(workspaceId);
    await this.recordCentralAudit('country.workspace_removed', countryCode, userId, { workspaceId });
  }

  // ── Overrides ─────────────────────────────────────────────

  async createOverride(dto: CreateCountryOverrideDto, userId?: string): Promise<Record<string, unknown>> {
    const country = await this.requireCountryByCode(dto.countryCode);

    const raw = await this.repository.createOverride({
      workspaceId: dto.workspaceId ?? null,
      organizationId: dto.organizationId ?? null,
      countryCode: country.code,
      overrideType: dto.overrideType,
      overrideValue: dto.overrideValue,
      priority: dto.priority ?? 0,
      reason: dto.reason ?? null,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    if (dto.workspaceId) {
      this.cache.invalidateResolutionsByWorkspace(dto.workspaceId);
    } else {
      this.cache.invalidateCountry(country.code);
    }

    await this.publishEvent(CountryEvent.OVERRIDE_CREATED, country.code, userId, {
      workspaceId: dto.workspaceId,
      overrideType: dto.overrideType,
    });

    return raw;
  }

  // ── Provider Availability (marketplace/supplier/warehouse/fulfillment/payment/AI) ──

  /**
   * Configures whether a given provider (identified only by its key — never
   * hardcoded here) is available in a country for a domain. `workspaceId`
   * omitted = global default availability; set = a workspace-scoped
   * override on top of it. The domain's own registry (marketplace provider
   * registry, supplier provider registry, etc.) remains the source of truth
   * for whether the provider itself exists — this only records whether it
   * is offered in that country.
   */
  async configureProviderAvailability(
    dto: UpsertProviderAvailabilityDto,
    userId?: string,
  ): Promise<ICountryProviderAvailability> {
    const country = await this.requireCountryByCode(dto.countryCode);

    const raw = await this.repository.upsertProviderAvailability({
      countryCode: country.code,
      domain: dto.domain,
      providerKey: dto.providerKey,
      workspaceId: dto.workspaceId ?? null,
      isAvailable: dto.isAvailable ?? true,
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    if (dto.workspaceId) {
      this.cache.invalidateResolutionsByWorkspace(dto.workspaceId);
    } else {
      this.cache.invalidateCountry(country.code);
    }

    await this.publishEvent(CountryEvent.PROVIDER_AVAILABILITY_CONFIGURED, country.code, userId, {
      workspaceId: dto.workspaceId,
      domain: dto.domain,
      providerKey: dto.providerKey,
    });
    await this.recordCentralAudit('country.provider_availability_configured', country.code, userId, {
      workspaceId: dto.workspaceId,
      domain: dto.domain,
      providerKey: dto.providerKey,
    });

    return raw as unknown as ICountryProviderAvailability;
  }

  async getProviderAvailability(
    countryCode: string,
    filter?: CountryProviderAvailabilityFilter,
  ): Promise<ICountryProviderAvailability[]> {
    await this.requireCountryByCode(countryCode);
    const raws = await this.repository.findProviderAvailability(countryCode, filter);
    return raws as unknown as ICountryProviderAvailability[];
  }

  // ── Region Grouping ────────────────────────────────────────

  async listRegions(): Promise<string[]> {
    return this.repository.findDistinctRegions();
  }

  // ── Resolution ────────────────────────────────────────────

  async resolveContext(request: CountryResolutionRequest): Promise<CountryResolutionResult> {
    const result = await this.resolver.resolve(request);
    await this.publishEvent(
      CountryEvent.CONTEXT_RESOLVED,
      result.context?.code ?? request.countryCode ?? 'UNKNOWN',
      undefined,
      { workspaceId: request.workspaceId, status: result.status },
    );
    return result;
  }

  // ── Validation ────────────────────────────────────────────

  async validateCombination(request: CountryValidationRequest): Promise<CountryValidationResult> {
    const result = await this.validator.validate(request);
    if (!result.valid) {
      await this.publishEvent(CountryEvent.VALIDATION_FAILED, request.countryCode, undefined, {
        workspaceId: request.workspaceId,
        issues: result.issues,
      });
    }
    return result;
  }

  // ── Cache ─────────────────────────────────────────────────

  async invalidateCache(code?: string, workspaceId?: string): Promise<void> {
    if (code) {
      this.cache.invalidateCountry(code);
    } else {
      this.cache.flush();
    }
    if (workspaceId) {
      this.cache.invalidateResolutionsByWorkspace(workspaceId);
    }
    await this.publishEvent(CountryEvent.CACHE_INVALIDATED, code ?? '*', undefined, { workspaceId });
  }

  // ── Helpers ───────────────────────────────────────────────

  private async requireCountry(id: string): Promise<ICountry> {
    const raw = await this.repository.findById(id);
    if (!raw) {
      throw new NotFoundException({ message: `Country '${id}' not found`, code: COUNTRY_ERROR_CODES.NOT_FOUND });
    }
    return raw as unknown as ICountry;
  }

  private async requireCountryByCode(code: string): Promise<ICountry> {
    const cached = this.cache.getCountry(code);
    if (cached) return cached;
    const raw = await this.repository.findByCode(code);
    if (!raw) {
      throw new NotFoundException({ message: `Country '${code}' not found`, code: COUNTRY_ERROR_CODES.NOT_FOUND });
    }
    const country = raw as unknown as ICountry;
    this.cache.setCountry(country);
    return country;
  }

  /** Ensures a country's own default (locale/currency/language) is always present in its "supported" list. */
  private withDefault(list: string[] | undefined, value: string): string[] {
    const normalized = (list ?? []).filter((v) => v.toLowerCase() !== value.toLowerCase());
    return [value, ...normalized];
  }

  private assertMutable(country: ICountry): void {
    if (!COUNTRY_CONSTANTS.MUTABLE_STATUSES.has(country.status)) {
      throw new BadRequestException({
        message: `Country '${country.code}' cannot be modified in status '${country.status}'`,
        code: COUNTRY_ERROR_CODES.IMMUTABLE,
      });
    }
  }

  private assertTransition(from: CountryStatus, to: CountryStatus): void {
    const allowed = COUNTRY_CONSTANTS.ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        message: `Cannot transition country from '${from}' to '${to}'`,
        code: COUNTRY_ERROR_CODES.INVALID_TRANSITION,
      });
    }
  }

  private async transition(
    id: string,
    to: CountryStatus,
    event: CountryEvent,
    reason: string,
    userId?: string,
  ): Promise<CountryResponseDto> {
    const existing = await this.requireCountry(id);
    this.assertTransition(existing.status, to);

    const raw = await this.repository.update(id, { status: to, updatedBy: userId ?? null });
    const country = raw as unknown as ICountry;
    this.registry.register(country);
    this.cache.invalidateCountry(country.code);

    await this.audit.logChange(country, reason, userId);
    await this.publishEvent(event, country.code, userId);

    return CountryResponseDto.from(country);
  }

  private async publishEvent(
    event: CountryEvent,
    countryCode: string,
    changedBy?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      countryCode,
      workspaceId: (metadata?.['workspaceId'] as string) ?? null,
      changedBy: changedBy ?? null,
      metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Writes a lightweight entry to the central, cross-cutting audit ledger
   * for country lifecycle/configuration actions — mirrors the pattern used
   * by `MarketplaceProviderService`/`MarketplaceProviderCredentialsService`.
   */
  private async recordCentralAudit(
    action: string,
    countryCode: string,
    performedBy?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const workspaceId = metadata?.['workspaceId'] as string | undefined;
    if (!workspaceId) return; // the central ledger is workspace-scoped

    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: COUNTRY_MODULE,
        entityType: 'Country',
        entityId: countryCode,
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
