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
  BulkImportRateItem,
  BulkImportRateItemResult,
  BulkImportRateResult,
  ConversionRequest,
  ConversionResult,
  CurrencyEvent,
  CurrencyFilterOptions,
  CurrencyStatus,
  ExchangeRateFilterOptions,
  ICurrency,
  IExchangeRate,
  IExchangeRateProviderConfig,
  IWorkspaceCurrencyConfig,
  RateSource,
  RateStatus,
  RecordRateRequest,
} from './interfaces';
import { CurrencyRepository } from './repository/currency.repository';
import { CurrencyRegistry } from './registry/currency.registry';
import { ExchangeRateProviderRegistry } from './registry/exchange-rate-provider.registry';
import { ExchangeRateProviderFactory } from './registry/exchange-rate-provider.factory';
import { CurrencyCache } from './cache/currency.cache';
import { CurrencyConverter } from './converter/currency-converter.service';
import { CurrencyValidator } from './validator/currency.validator';
import { CurrencyAudit } from './audit/currency.audit';
import { CurrencyEventQueue } from './events/currency-events.queue';
import { ExchangeRateSyncScheduler } from './scheduler/exchange-rate-sync.scheduler';
import { CURRENCY_CONSTANTS, CURRENCY_ERROR_CODES, CURRENCY_MODULE } from './constants';
import {
  BulkImportRatesDto,
  ConfigureProviderPriorityDto,
  ConvertAmountDto,
  CurrencyFilterDto,
  CurrencyResponseDto,
  CreateCurrencyDto,
  ExchangeRateFilterDto,
  ExchangeRateResponseDto,
  PaginatedCurrencyResponseDto,
  RecordRateDto,
  RefreshRateFromProviderDto,
  RejectRateDto,
  ResolveWithFallbackDto,
  ScheduleRateSyncDto,
  UpdateCurrencyDto,
  UpdateRateDto,
  UpsertWorkspaceCurrencyConfigDto,
} from './dto';

@Injectable()
export class CurrencyService implements OnModuleInit {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    private readonly repository: CurrencyRepository,
    private readonly registry: CurrencyRegistry,
    private readonly providerRegistry: ExchangeRateProviderRegistry,
    private readonly providerFactory: ExchangeRateProviderFactory,
    private readonly cache: CurrencyCache,
    private readonly converter: CurrencyConverter,
    private readonly validator: CurrencyValidator,
    private readonly audit: CurrencyAudit,
    private readonly eventQueue: CurrencyEventQueue,
    private readonly syncScheduler: ExchangeRateSyncScheduler,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    try {
      const [currencies] = await this.repository.findAll({ status: CurrencyStatus.ACTIVE });
      this.registry.seed(currencies as unknown as ICurrency[]);
    } catch (err) {
      this.logger.warn(`Failed to seed currency registry on init: ${(err as Error).message}`);
    }
  }

  // ── Currency CRUD ─────────────────────────────────────────

  async registerCurrency(dto: CreateCurrencyDto, userId?: string): Promise<CurrencyResponseDto> {
    const existing = await this.repository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException({
        message: `Currency '${dto.code}' already exists`,
        code: CURRENCY_ERROR_CODES.DUPLICATE,
      });
    }

    const raw = await this.repository.create({
      code: dto.code.toUpperCase(),
      name: dto.name,
      symbol: dto.symbol,
      decimals: dto.decimals ?? CURRENCY_CONSTANTS.DEFAULT_DECIMALS,
      roundingMode: dto.roundingMode ?? CURRENCY_CONSTANTS.DEFAULT_ROUNDING_MODE,
      status: CurrencyStatus.DRAFT,
      version: 1,
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const currency = raw as unknown as ICurrency;
    this.registry.register(currency);

    await this.audit.logChange(currency, 'Registered', userId);
    await this.publishEvent(CurrencyEvent.REGISTERED, { currencyCode: currency.code, changedBy: userId });

    return CurrencyResponseDto.from(currency);
  }

  async findAll(filter: CurrencyFilterDto): Promise<PaginatedCurrencyResponseDto> {
    const [raws, total] = await this.repository.findAll(filter as CurrencyFilterOptions);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? CURRENCY_CONSTANTS.DEFAULT_PAGE_SIZE, CURRENCY_CONSTANTS.MAX_PAGE_SIZE);
    return {
      items: (raws as unknown as ICurrency[]).map((c) => CurrencyResponseDto.from(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<CurrencyResponseDto> {
    const raw = await this.repository.findById(id);
    if (!raw) throw new NotFoundException({ message: `Currency '${id}' not found`, code: CURRENCY_ERROR_CODES.NOT_FOUND });
    return CurrencyResponseDto.from(raw as unknown as ICurrency);
  }

  async findByCode(code: string): Promise<CurrencyResponseDto> {
    const cached = this.cache.getCurrency(code);
    if (cached) return CurrencyResponseDto.from(cached);

    const raw = await this.repository.findByCode(code);
    if (!raw) throw new NotFoundException({ message: `Currency '${code}' not found`, code: CURRENCY_ERROR_CODES.NOT_FOUND });
    const currency = raw as unknown as ICurrency;
    this.cache.setCurrency(currency);
    return CurrencyResponseDto.from(currency);
  }

  async updateCurrency(id: string, dto: UpdateCurrencyDto, userId?: string): Promise<CurrencyResponseDto> {
    const existing = await this.requireCurrency(id);
    this.assertMutable(existing);

    const raw = await this.repository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.symbol !== undefined && { symbol: dto.symbol }),
      ...(dto.decimals !== undefined && { decimals: dto.decimals }),
      ...(dto.roundingMode !== undefined && { roundingMode: dto.roundingMode }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      version: existing.version + 1,
      updatedBy: userId ?? null,
    });

    const currency = raw as unknown as ICurrency;
    this.registry.register(currency);
    this.cache.invalidateCurrency(currency.code);

    await this.audit.logChange(currency, dto.changeReason ?? 'Updated', userId);
    await this.publishEvent(CurrencyEvent.UPDATED, { currencyCode: currency.code, changedBy: userId });

    return CurrencyResponseDto.from(currency);
  }

  async enableCurrency(id: string, userId?: string): Promise<CurrencyResponseDto> {
    return this.transition(id, CurrencyStatus.ACTIVE, CurrencyEvent.ENABLED, 'Enabled', userId);
  }

  async disableCurrency(id: string, userId?: string): Promise<CurrencyResponseDto> {
    return this.transition(id, CurrencyStatus.DISABLED, CurrencyEvent.DISABLED, 'Disabled', userId);
  }

  async archiveCurrency(id: string, userId?: string): Promise<CurrencyResponseDto> {
    return this.transition(id, CurrencyStatus.ARCHIVED, CurrencyEvent.ARCHIVED, 'Archived', userId);
  }

  async restoreCurrency(id: string, userId?: string): Promise<CurrencyResponseDto> {
    return this.transition(id, CurrencyStatus.DRAFT, CurrencyEvent.RESTORED, 'Restored', userId);
  }

  async deleteCurrency(id: string, userId?: string): Promise<void> {
    const existing = await this.requireCurrency(id);
    this.assertMutable(existing);
    await this.repository.softDelete(id, userId);
    this.registry.unregister(existing.code);
    this.cache.invalidateCurrency(existing.code);
  }

  async getHistory(id: string): Promise<Record<string, unknown>[]> {
    await this.requireCurrency(id);
    return this.repository.findHistory(id);
  }

  // ── Workspace Configuration (base / reporting currency) ────

  async upsertWorkspaceConfig(
    workspaceId: string,
    dto: UpsertWorkspaceCurrencyConfigDto,
    userId?: string,
  ): Promise<IWorkspaceCurrencyConfig> {
    await this.requireCurrencyByCode(dto.baseCurrency);
    if (dto.reportingCurrency) {
      await this.requireCurrencyByCode(dto.reportingCurrency);
    }

    const raw = await this.repository.upsertWorkspaceConfig({
      workspaceId,
      baseCurrency: dto.baseCurrency.toUpperCase(),
      reportingCurrency: dto.reportingCurrency ? dto.reportingCurrency.toUpperCase() : null,
      staleToleranceMinutes: dto.staleToleranceMinutes ?? CURRENCY_CONSTANTS.DEFAULT_STALE_TOLERANCE_MINUTES,
      configuration: dto.configuration ?? {},
      updatedBy: userId ?? null,
    });

    this.cache.invalidateRatesByWorkspace(workspaceId);

    await this.publishEvent(CurrencyEvent.WORKSPACE_CONFIGURED, { workspaceId, changedBy: userId });
    await this.recordCentralAudit('currency.workspace_configured', userId, { workspaceId });

    return raw as unknown as IWorkspaceCurrencyConfig;
  }

  async getWorkspaceConfig(workspaceId: string): Promise<IWorkspaceCurrencyConfig | null> {
    const raw = await this.repository.findWorkspaceConfig(workspaceId);
    return raw ? (raw as unknown as IWorkspaceCurrencyConfig) : null;
  }

  // ── Rate Recording (manual / scheduled / provider) ─────────

  async recordManualRate(dto: RecordRateDto, userId?: string): Promise<ExchangeRateResponseDto> {
    const raw = await this.recordRate(
      {
        baseCurrency: dto.baseCurrency,
        quoteCurrency: dto.quoteCurrency,
        rate: dto.rate,
        rateType: dto.rateType,
        source: RateSource.MANUAL,
        effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : new Date(),
        workspaceId: dto.workspaceId ?? null,
        requiresApproval: dto.requiresApproval,
        metadata: dto.metadata ?? {},
      },
      userId,
    );
    return ExchangeRateResponseDto.from(raw);
  }

  async recordScheduledRate(dto: RecordRateDto, userId?: string): Promise<ExchangeRateResponseDto> {
    const raw = await this.recordRate(
      {
        baseCurrency: dto.baseCurrency,
        quoteCurrency: dto.quoteCurrency,
        rate: dto.rate,
        rateType: dto.rateType,
        source: RateSource.SCHEDULED,
        effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : new Date(),
        workspaceId: dto.workspaceId ?? null,
        requiresApproval: dto.requiresApproval,
        metadata: dto.metadata ?? {},
      },
      userId,
    );
    return ExchangeRateResponseDto.from(raw);
  }

  async refreshRateFromProvider(dto: RefreshRateFromProviderDto, userId?: string): Promise<ExchangeRateResponseDto> {
    if (!this.providerRegistry.isRegistered(dto.providerKey)) {
      throw new BadRequestException({
        message: `Exchange-rate provider '${dto.providerKey}' is not registered`,
        code: CURRENCY_ERROR_CODES.PROVIDER_NOT_REGISTERED,
      });
    }

    const adapter = this.providerRegistry.get(dto.providerKey);
    const quote = await adapter.fetchRate(dto.baseCurrency, dto.quoteCurrency);

    const raw = await this.recordRate(
      {
        baseCurrency: dto.baseCurrency,
        quoteCurrency: dto.quoteCurrency,
        rate: quote.rate,
        source: RateSource.PROVIDER,
        providerKey: dto.providerKey,
        effectiveAt: quote.fetchedAt,
        workspaceId: dto.workspaceId ?? null,
        requiresApproval: dto.requiresApproval,
        metadata: quote.metadata ?? {},
      },
      userId,
    );
    return ExchangeRateResponseDto.from(raw);
  }

  /**
   * Resolves a rate through the priority/fallback provider chain (no single
   * provider is required by the caller) and records it. On total failure
   * across every configured provider, publishes SYNC_FAILED and rethrows.
   */
  async resolveRateWithFallback(dto: ResolveWithFallbackDto, userId?: string): Promise<ExchangeRateResponseDto> {
    try {
      const { quote, providerKey } = await this.providerFactory.fetchWithFallback(
        dto.baseCurrency,
        dto.quoteCurrency,
        dto.workspaceId ?? null,
      );
      const raw = await this.recordRate(
        {
          baseCurrency: dto.baseCurrency,
          quoteCurrency: dto.quoteCurrency,
          rate: quote.rate,
          source: RateSource.PROVIDER,
          providerKey,
          effectiveAt: quote.fetchedAt,
          workspaceId: dto.workspaceId ?? null,
          requiresApproval: dto.requiresApproval,
          metadata: quote.metadata ?? {},
        },
        userId,
      );
      return ExchangeRateResponseDto.from(raw);
    } catch (err) {
      await this.publishEvent(CurrencyEvent.SYNC_FAILED, {
        baseCurrency: dto.baseCurrency.toUpperCase(),
        quoteCurrency: dto.quoteCurrency.toUpperCase(),
        workspaceId: dto.workspaceId,
        metadata: { error: (err as Error).message },
      });
      throw err;
    }
  }

  private async recordRate(request: RecordRateRequest, userId?: string): Promise<IExchangeRate> {
    const validation = await this.validator.validateRate(request);
    if (!validation.valid) {
      await this.publishEvent(CurrencyEvent.RATE_REJECTED, {
        baseCurrency: request.baseCurrency.toUpperCase(),
        quoteCurrency: request.quoteCurrency.toUpperCase(),
        workspaceId: request.workspaceId,
        metadata: { issues: validation.issues },
      });
      throw new BadRequestException({
        message: `Invalid exchange rate: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: CURRENCY_ERROR_CODES.INVALID_RATE,
      });
    }

    const now = new Date();
    const status = request.requiresApproval ? RateStatus.PENDING_APPROVAL : RateStatus.PUBLISHED;

    const raw = await this.repository.createRate({
      baseCurrency: request.baseCurrency.toUpperCase(),
      quoteCurrency: request.quoteCurrency.toUpperCase(),
      rate: request.rate,
      rateType: request.rateType ?? CURRENCY_CONSTANTS.DEFAULT_RATE_TYPE,
      source: request.source,
      providerKey: request.providerKey ?? null,
      effectiveAt: request.effectiveAt ?? now,
      status,
      publishedAt: status === RateStatus.PUBLISHED ? now : null,
      isAbnormal: validation.isAbnormal ?? false,
      supersedesId: request.supersedesId ?? null,
      version: 1,
      workspaceId: request.workspaceId ?? null,
      metadata: request.metadata ?? {},
      createdBy: userId ?? null,
    });

    const rate = raw as unknown as IExchangeRate;

    if (request.workspaceId) {
      this.cache.invalidateRatesByWorkspace(request.workspaceId);
    } else {
      this.cache.invalidateAllRates();
    }

    await this.publishEvent(CurrencyEvent.RATE_RECORDED, {
      baseCurrency: rate.baseCurrency,
      quoteCurrency: rate.quoteCurrency,
      rateId: rate.id,
      workspaceId: request.workspaceId,
      changedBy: userId,
      metadata: { source: request.source, status },
    });
    await this.recordCentralAudit('currency.rate_recorded', userId, {
      workspaceId: request.workspaceId ?? undefined,
      baseCurrency: rate.baseCurrency,
      quoteCurrency: rate.quoteCurrency,
      source: request.source,
    });

    if (rate.isAbnormal) {
      await this.publishEvent(CurrencyEvent.ABNORMAL_RATE_DETECTED, {
        baseCurrency: rate.baseCurrency,
        quoteCurrency: rate.quoteCurrency,
        rateId: rate.id,
        workspaceId: request.workspaceId,
        metadata: { rate: rate.rate, warnings: validation.warnings },
      });
    }

    return rate;
  }

  // ── Rate Update (versioned — never mutates a historical rate) ──

  /**
   * Creates a new version of a rate rather than mutating the existing row —
   * the previous row (which may already back a finalized transaction) is
   * left completely untouched.
   */
  async updateRate(id: string, dto: UpdateRateDto, userId?: string): Promise<ExchangeRateResponseDto> {
    const existing = await this.requireRate(id);

    const raw = await this.recordRate(
      {
        baseCurrency: existing.baseCurrency,
        quoteCurrency: existing.quoteCurrency,
        rate: dto.rate,
        rateType: existing.rateType,
        source: existing.source as RateSource,
        providerKey: existing.providerKey,
        effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : existing.effectiveAt,
        workspaceId: existing.workspaceId,
        requiresApproval: true,
        supersedesId: existing.id,
        metadata: dto.metadata ?? existing.metadata,
      },
      userId,
    );

    const versioned = (await this.repository.updateRateStatus(raw.id, {
      version: existing.version + 1,
    })) as unknown as IExchangeRate;

    await this.publishEvent(CurrencyEvent.RATE_UPDATED, {
      baseCurrency: versioned.baseCurrency,
      quoteCurrency: versioned.quoteCurrency,
      rateId: versioned.id,
      workspaceId: versioned.workspaceId,
      changedBy: userId,
      metadata: { supersedesId: existing.id, changeReason: dto.changeReason },
    });

    return ExchangeRateResponseDto.from(versioned);
  }

  // ── Rate Approval / Publish / Reject / Archive ──────────────

  async approveRate(id: string, userId?: string): Promise<ExchangeRateResponseDto> {
    return this.transitionRate(id, RateStatus.APPROVED, CurrencyEvent.RATE_APPROVED, {
      approvedBy: userId ?? null,
      approvedAt: new Date(),
    });
  }

  async publishRate(id: string, userId?: string): Promise<ExchangeRateResponseDto> {
    return this.transitionRate(id, RateStatus.PUBLISHED, CurrencyEvent.RATE_PUBLISHED, {
      publishedAt: new Date(),
    });
  }

  async rejectRate(id: string, dto: RejectRateDto, userId?: string): Promise<ExchangeRateResponseDto> {
    return this.transitionRate(id, RateStatus.REJECTED, CurrencyEvent.RATE_REJECTED, {
      metadata: { reason: dto.reason },
    });
  }

  async archiveRateRecord(id: string, userId?: string): Promise<ExchangeRateResponseDto> {
    return this.transitionRate(id, RateStatus.ARCHIVED, CurrencyEvent.RATE_ARCHIVED, {});
  }

  private async transitionRate(
    id: string,
    to: RateStatus,
    event: CurrencyEvent,
    extraData: Record<string, unknown>,
  ): Promise<ExchangeRateResponseDto> {
    const existing = await this.requireRate(id);
    const allowed = CURRENCY_CONSTANTS.ALLOWED_RATE_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        message: `Cannot transition rate from '${existing.status}' to '${to}'`,
        code: CURRENCY_ERROR_CODES.INVALID_RATE_TRANSITION,
      });
    }

    const mergedMetadata = extraData.metadata
      ? { ...existing.metadata, ...(extraData.metadata as Record<string, unknown>) }
      : undefined;

    const raw = await this.repository.updateRateStatus(id, {
      status: to,
      ...extraData,
      ...(mergedMetadata ? { metadata: mergedMetadata } : {}),
    });
    const rate = raw as unknown as IExchangeRate;

    if (rate.workspaceId) {
      this.cache.invalidateRatesByWorkspace(rate.workspaceId);
    } else {
      this.cache.invalidateAllRates();
    }

    await this.publishEvent(event, {
      baseCurrency: rate.baseCurrency,
      quoteCurrency: rate.quoteCurrency,
      rateId: rate.id,
      workspaceId: rate.workspaceId,
    });

    return ExchangeRateResponseDto.from(rate);
  }

  async getRate(id: string): Promise<ExchangeRateResponseDto> {
    return ExchangeRateResponseDto.from(await this.requireRate(id));
  }

  // ── Bulk Import ────────────────────────────────────────────

  async bulkImportRates(dto: BulkImportRatesDto, userId?: string): Promise<BulkImportRateResult> {
    const results: BulkImportRateItemResult[] = [];

    for (const dtoItem of dto.items) {
      const item: BulkImportRateItem = {
        baseCurrency: dtoItem.baseCurrency,
        quoteCurrency: dtoItem.quoteCurrency,
        rate: dtoItem.rate,
        rateType: dtoItem.rateType,
        effectiveAt: dtoItem.effectiveAt ? new Date(dtoItem.effectiveAt) : undefined,
        workspaceId: dtoItem.workspaceId ?? null,
        metadata: dtoItem.metadata,
      };
      try {
        const raw = await this.recordRate(
          {
            baseCurrency: item.baseCurrency,
            quoteCurrency: item.quoteCurrency,
            rate: item.rate,
            rateType: item.rateType,
            source: RateSource.MANUAL,
            effectiveAt: item.effectiveAt ?? new Date(),
            workspaceId: item.workspaceId ?? null,
            requiresApproval: dto.requiresApproval,
            metadata: item.metadata ?? {},
          },
          userId,
        );
        results.push({ item, success: true, rateId: raw.id });
      } catch (err) {
        results.push({ item, success: false, error: (err as Error).message });
      }
    }

    return {
      total: dto.items.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  // ── Provider Priority / Fallback ─────────────────────────────

  async configureProviderPriority(
    dto: ConfigureProviderPriorityDto,
    userId?: string,
  ): Promise<IExchangeRateProviderConfig> {
    const raw = await this.repository.upsertProviderConfig({
      providerKey: dto.providerKey.toUpperCase(),
      workspaceId: dto.workspaceId ?? null,
      isEnabled: dto.isEnabled ?? true,
      priority: dto.priority ?? CURRENCY_CONSTANTS.DEFAULT_PROVIDER_PRIORITY,
      updatedBy: userId ?? null,
    });

    await this.publishEvent(CurrencyEvent.PROVIDER_CONFIGURED, {
      workspaceId: dto.workspaceId,
      metadata: { providerKey: dto.providerKey, priority: dto.priority },
    });

    return raw as unknown as IExchangeRateProviderConfig;
  }

  async getProviderPriorities(workspaceId?: string): Promise<IExchangeRateProviderConfig[]> {
    const raws = await this.repository.findProviderConfigs(workspaceId ?? null);
    return raws as unknown as IExchangeRateProviderConfig[];
  }

  // ── Scheduled Synchronization ────────────────────────────────

  scheduleRateSync(dto: ScheduleRateSyncDto, userId?: string): void {
    this.syncScheduler.addPair(
      {
        baseCurrency: dto.baseCurrency.toUpperCase(),
        quoteCurrency: dto.quoteCurrency.toUpperCase(),
        providerKey: dto.providerKey.toUpperCase(),
        workspaceId: dto.workspaceId ?? null,
      },
      dto.intervalMs ?? CURRENCY_CONSTANTS.DEFAULT_SYNC_INTERVAL_MS,
      async (pair) => {
        try {
          await this.refreshRateFromProvider(
            {
              providerKey: pair.providerKey,
              baseCurrency: pair.baseCurrency,
              quoteCurrency: pair.quoteCurrency,
              workspaceId: pair.workspaceId ?? undefined,
            },
            userId,
          );
        } catch (err) {
          await this.publishEvent(CurrencyEvent.SYNC_FAILED, {
            baseCurrency: pair.baseCurrency,
            quoteCurrency: pair.quoteCurrency,
            workspaceId: pair.workspaceId,
            metadata: { providerKey: pair.providerKey, error: (err as Error).message },
          });
          throw err;
        }
      },
    );
  }

  unscheduleRateSync(dto: ScheduleRateSyncDto): void {
    this.syncScheduler.removePair({
      baseCurrency: dto.baseCurrency.toUpperCase(),
      quoteCurrency: dto.quoteCurrency.toUpperCase(),
      providerKey: dto.providerKey.toUpperCase(),
      workspaceId: dto.workspaceId ?? null,
    });
  }

  async getRateHistory(filter: ExchangeRateFilterDto): Promise<{ items: IExchangeRate[]; total: number }> {
    const options: ExchangeRateFilterOptions = {
      baseCurrency: filter.baseCurrency,
      quoteCurrency: filter.quoteCurrency,
      source: filter.source,
      workspaceId: filter.workspaceId,
      fromDate: filter.fromDate ? new Date(filter.fromDate) : null,
      toDate: filter.toDate ? new Date(filter.toDate) : null,
      page: filter.page,
      limit: filter.limit,
    };
    const [items, total] = await this.repository.findRates(options);
    return { items: items as unknown as IExchangeRate[], total };
  }

  // ── Conversion ────────────────────────────────────────────

  async convert(dto: ConvertAmountDto): Promise<ConversionResult> {
    const request: ConversionRequest = {
      workspaceId: dto.workspaceId ?? null,
      amount: dto.amount,
      fromCurrency: dto.fromCurrency,
      toCurrency: dto.toCurrency,
      asOfDate: dto.asOfDate ? new Date(dto.asOfDate) : null,
      allowStale: dto.allowStale,
    };

    const result = await this.converter.convert(request);

    await this.publishEvent(CurrencyEvent.CONVERSION_PERFORMED, {
      baseCurrency: result.originalCurrency,
      quoteCurrency: result.convertedCurrency,
      workspaceId: dto.workspaceId,
      metadata: {
        originalAmount: result.originalAmount,
        convertedAmount: result.convertedAmount,
        rate: result.rate,
        direction: result.rateDirection,
        stale: result.stale,
      },
    });

    return result;
  }

  // ── Cache ─────────────────────────────────────────────────

  async invalidateCache(code?: string, workspaceId?: string): Promise<void> {
    if (code) {
      this.cache.invalidateCurrency(code);
    } else {
      this.cache.flush();
    }
    if (workspaceId) {
      this.cache.invalidateRatesByWorkspace(workspaceId);
    }
    await this.publishEvent(CurrencyEvent.CACHE_INVALIDATED, { currencyCode: code ?? null, workspaceId });
  }

  // ── Helpers ───────────────────────────────────────────────

  private async requireCurrency(id: string): Promise<ICurrency> {
    const raw = await this.repository.findById(id);
    if (!raw) {
      throw new NotFoundException({ message: `Currency '${id}' not found`, code: CURRENCY_ERROR_CODES.NOT_FOUND });
    }
    return raw as unknown as ICurrency;
  }

  private async requireCurrencyByCode(code: string): Promise<ICurrency> {
    const cached = this.cache.getCurrency(code);
    if (cached) return cached;
    const raw = await this.repository.findByCode(code);
    if (!raw) {
      throw new NotFoundException({ message: `Currency '${code}' not found`, code: CURRENCY_ERROR_CODES.NOT_FOUND });
    }
    const currency = raw as unknown as ICurrency;
    this.cache.setCurrency(currency);
    return currency;
  }

  private async requireRate(id: string): Promise<IExchangeRate> {
    const raw = await this.repository.findRateById(id);
    if (!raw) {
      throw new NotFoundException({ message: `Exchange rate '${id}' not found`, code: CURRENCY_ERROR_CODES.RATE_NOT_FOUND });
    }
    return raw as unknown as IExchangeRate;
  }

  private assertMutable(currency: ICurrency): void {
    if (!CURRENCY_CONSTANTS.MUTABLE_STATUSES.has(currency.status)) {
      throw new BadRequestException({
        message: `Currency '${currency.code}' cannot be modified in status '${currency.status}'`,
        code: CURRENCY_ERROR_CODES.IMMUTABLE,
      });
    }
  }

  private assertTransition(from: CurrencyStatus, to: CurrencyStatus): void {
    const allowed = CURRENCY_CONSTANTS.ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        message: `Cannot transition currency from '${from}' to '${to}'`,
        code: CURRENCY_ERROR_CODES.INVALID_TRANSITION,
      });
    }
  }

  private async transition(
    id: string,
    to: CurrencyStatus,
    event: CurrencyEvent,
    reason: string,
    userId?: string,
  ): Promise<CurrencyResponseDto> {
    const existing = await this.requireCurrency(id);
    this.assertTransition(existing.status, to);

    const raw = await this.repository.update(id, { status: to, updatedBy: userId ?? null });
    const currency = raw as unknown as ICurrency;
    this.registry.register(currency);
    this.cache.invalidateCurrency(currency.code);

    await this.audit.logChange(currency, reason, userId);
    await this.publishEvent(event, { currencyCode: currency.code, changedBy: userId });

    return CurrencyResponseDto.from(currency);
  }

  private async publishEvent(
    event: CurrencyEvent,
    fields: {
      currencyCode?: string | null;
      baseCurrency?: string | null;
      quoteCurrency?: string | null;
      rateId?: string | null;
      workspaceId?: string | null;
      changedBy?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      currencyCode: fields.currencyCode ?? null,
      baseCurrency: fields.baseCurrency ?? null,
      quoteCurrency: fields.quoteCurrency ?? null,
      rateId: fields.rateId ?? null,
      workspaceId: fields.workspaceId ?? null,
      changedBy: fields.changedBy ?? null,
      metadata: fields.metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Writes a lightweight entry to the central, cross-cutting audit ledger
   * for workspace-scoped currency actions — mirrors the pattern used by
   * `CountryService`/`MarketplaceProviderService`.
   */
  private async recordCentralAudit(
    action: string,
    performedBy?: string,
    metadata?: Record<string, unknown> & { workspaceId?: string },
  ): Promise<void> {
    const workspaceId = metadata?.workspaceId;
    if (!workspaceId) return; // the central ledger is workspace-scoped

    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: CURRENCY_MODULE,
        entityType: 'Currency',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
