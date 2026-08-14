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
  CalculationMode,
  ITaxCalculationRecord,
  ITaxJurisdiction,
  ITaxRule,
  JurisdictionLevel,
  TaxCalculationRecordFilterOptions,
  TaxCalculationRequest,
  TaxCalculationResult,
  TaxEvent,
  TaxJurisdictionFilterOptions,
  TaxRuleFilterOptions,
  TaxRuleResolutionRequest,
  TaxRuleStatus,
} from './interfaces';
import { TaxRepository } from './repository/tax.repository';
import { TaxJurisdictionRegistry } from './registry/tax-jurisdiction.registry';
import { TaxCache } from './cache/tax.cache';
import { TaxRuleResolver } from './resolver/tax-rule.resolver';
import { TaxCalculator } from './calculator/tax-calculator.service';
import { TaxValidator } from './validator/tax.validator';
import { TaxAudit } from './audit/tax.audit';
import { TaxEventQueue } from './events/tax-events.queue';
import { TAX_CONSTANTS, TAX_ERROR_CODES, TAX_MODULE } from './constants';
import {
  CalculateTaxDto,
  CreateJurisdictionDto,
  CreateTaxOverrideDto,
  CreateTaxRuleDto,
  JurisdictionFilterDto,
  PaginatedTaxRuleResponseDto,
  RollbackTaxRuleDto,
  TaxCalculationRecordFilterDto,
  TaxCalculationRecordResponseDto,
  TaxJurisdictionResponseDto,
  TaxRuleFilterDto,
  TaxRuleResponseDto,
  UpdateJurisdictionDto,
  UpdateTaxRuleDto,
} from './dto';

@Injectable()
export class TaxService implements OnModuleInit {
  private readonly logger = new Logger(TaxService.name);

  constructor(
    private readonly repository: TaxRepository,
    private readonly jurisdictionRegistry: TaxJurisdictionRegistry,
    private readonly cache: TaxCache,
    private readonly resolver: TaxRuleResolver,
    private readonly calculator: TaxCalculator,
    private readonly validator: TaxValidator,
    private readonly audit: TaxAudit,
    private readonly eventQueue: TaxEventQueue,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    try {
      const [jurisdictions] = await this.repository.findJurisdictions({ status: 'ACTIVE' });
      this.jurisdictionRegistry.seed(jurisdictions as unknown as ITaxJurisdiction[]);
    } catch (err) {
      this.logger.warn(`Failed to seed tax jurisdiction registry on init: ${(err as Error).message}`);
    }
  }

  // ── Jurisdictions ─────────────────────────────────────────

  async registerJurisdiction(dto: CreateJurisdictionDto, userId?: string): Promise<TaxJurisdictionResponseDto> {
    const existing = await this.repository.findJurisdictionByCode(dto.code);
    if (existing) {
      throw new ConflictException({
        message: `Tax jurisdiction '${dto.code}' already exists`,
        code: TAX_ERROR_CODES.JURISDICTION_DUPLICATE,
      });
    }

    const raw = await this.repository.createJurisdiction({
      code: dto.code.toUpperCase(),
      name: dto.name,
      countryCode: dto.countryCode.toUpperCase(),
      region: dto.region ?? null,
      level: dto.level ?? JurisdictionLevel.COUNTRY,
      parentId: dto.parentId ?? null,
      status: 'ACTIVE',
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const jurisdiction = raw as unknown as ITaxJurisdiction;
    this.jurisdictionRegistry.register(jurisdiction);

    await this.publishEvent(TaxEvent.JURISDICTION_REGISTERED, { jurisdictionCode: jurisdiction.code, changedBy: userId });

    return TaxJurisdictionResponseDto.from(jurisdiction);
  }

  async findJurisdictions(filter: JurisdictionFilterDto): Promise<{ items: TaxJurisdictionResponseDto[]; total: number }> {
    const [raws, total] = await this.repository.findJurisdictions(filter as TaxJurisdictionFilterOptions);
    return { items: (raws as unknown as ITaxJurisdiction[]).map((j) => TaxJurisdictionResponseDto.from(j)), total };
  }

  async findJurisdictionByCode(code: string): Promise<TaxJurisdictionResponseDto> {
    const jurisdiction = await this.requireJurisdiction(code);
    return TaxJurisdictionResponseDto.from(jurisdiction);
  }

  async updateJurisdiction(code: string, dto: UpdateJurisdictionDto, userId?: string): Promise<TaxJurisdictionResponseDto> {
    const existing = await this.requireJurisdiction(code);

    const raw = await this.repository.updateJurisdiction(existing.id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.region !== undefined && { region: dto.region }),
      ...(dto.level !== undefined && { level: dto.level }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      updatedBy: userId ?? null,
    });

    const jurisdiction = raw as unknown as ITaxJurisdiction;
    this.jurisdictionRegistry.register(jurisdiction);
    this.cache.invalidateRuleSetsByJurisdiction(jurisdiction.code);

    await this.publishEvent(TaxEvent.JURISDICTION_UPDATED, { jurisdictionCode: jurisdiction.code, changedBy: userId });

    return TaxJurisdictionResponseDto.from(jurisdiction);
  }

  // ── Tax Rules ─────────────────────────────────────────────

  async createRule(dto: CreateTaxRuleDto, userId?: string): Promise<TaxRuleResponseDto> {
    await this.requireJurisdiction(dto.jurisdictionCode);

    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    const validation = await this.validator.validateRule({
      ruleKey: dto.ruleKey,
      jurisdictionCode: dto.jurisdictionCode,
      workspaceId: dto.workspaceId ?? null,
      rate: dto.rate,
      effectiveFrom,
      effectiveTo,
    });
    if (!validation.valid) {
      throw new BadRequestException({
        message: `Invalid tax rule: ${validation.issues.map((i) => i.message).join('; ')}`,
        code: TAX_ERROR_CODES.INVALID_RULE,
      });
    }

    const raw = await this.repository.createRule({
      ruleKey: dto.ruleKey,
      name: dto.name,
      taxType: dto.taxType,
      jurisdictionCode: dto.jurisdictionCode.toUpperCase(),
      rate: dto.rate,
      calculationMode: dto.calculationMode ?? TAX_CONSTANTS.DEFAULT_CALCULATION_MODE,
      isCompound: dto.isCompound ?? false,
      compoundOnRuleKeys: dto.compoundOnRuleKeys ?? [],
      reverseCharge: dto.reverseCharge ?? false,
      priority: dto.priority ?? TAX_CONSTANTS.DEFAULT_PRIORITY,
      applicability: dto.applicability ?? {},
      exemptions: dto.exemptions ?? [],
      thresholds: dto.thresholds ?? {},
      workspaceId: dto.workspaceId ?? null,
      status: TaxRuleStatus.DRAFT,
      version: 1,
      effectiveFrom,
      effectiveTo,
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const rule = raw as unknown as ITaxRule;
    await this.audit.logRuleChange(rule, 'Created', userId);
    await this.publishEvent(TaxEvent.RULE_CREATED, {
      ruleKey: rule.ruleKey,
      ruleId: rule.id,
      jurisdictionCode: rule.jurisdictionCode,
      taxType: rule.taxType as string,
      workspaceId: rule.workspaceId,
      changedBy: userId,
    });

    return TaxRuleResponseDto.from(rule);
  }

  async findRules(filter: TaxRuleFilterDto): Promise<PaginatedTaxRuleResponseDto> {
    const [raws, total] = await this.repository.findRules(filter as TaxRuleFilterOptions);
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? TAX_CONSTANTS.DEFAULT_PAGE_SIZE, TAX_CONSTANTS.MAX_PAGE_SIZE);
    return {
      items: (raws as unknown as ITaxRule[]).map((r) => TaxRuleResponseDto.from(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findRuleById(id: string): Promise<TaxRuleResponseDto> {
    return TaxRuleResponseDto.from(await this.requireRule(id));
  }

  /**
   * Mutates in place while the rule is still DRAFT/PENDING_APPROVAL (never
   * yet used by a calculation). Once APPROVED/PUBLISHED, an update instead
   * creates a new version — the live/finalized row is never touched, so
   * any `TaxCalculationRecord` that referenced it stays accurate.
   */
  async updateRule(id: string, dto: UpdateTaxRuleDto, userId?: string): Promise<TaxRuleResponseDto> {
    const existing = await this.requireRule(id);

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : existing.effectiveFrom;
    const effectiveTo = dto.effectiveTo !== undefined ? (dto.effectiveTo ? new Date(dto.effectiveTo) : null) : existing.effectiveTo;
    const rate = dto.rate ?? existing.rate;

    if (TAX_CONSTANTS.MUTABLE_RULE_STATUSES.has(existing.status)) {
      const validation = await this.validator.validateRule(
        { ruleKey: existing.ruleKey, jurisdictionCode: existing.jurisdictionCode, workspaceId: existing.workspaceId, rate, effectiveFrom, effectiveTo },
        existing.id,
      );
      if (!validation.valid) {
        throw new BadRequestException({
          message: `Invalid tax rule: ${validation.issues.map((i) => i.message).join('; ')}`,
          code: TAX_ERROR_CODES.INVALID_RULE,
        });
      }

      const raw = await this.repository.updateRule(id, {
        ...(dto.name !== undefined && { name: dto.name }),
        rate,
        ...(dto.calculationMode !== undefined && { calculationMode: dto.calculationMode }),
        ...(dto.isCompound !== undefined && { isCompound: dto.isCompound }),
        ...(dto.compoundOnRuleKeys !== undefined && { compoundOnRuleKeys: dto.compoundOnRuleKeys }),
        ...(dto.reverseCharge !== undefined && { reverseCharge: dto.reverseCharge }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.applicability !== undefined && { applicability: dto.applicability }),
        ...(dto.exemptions !== undefined && { exemptions: dto.exemptions }),
        ...(dto.thresholds !== undefined && { thresholds: dto.thresholds }),
        effectiveFrom,
        effectiveTo,
        ...(dto.metadata !== undefined && { metadata: dto.metadata }),
        updatedBy: userId ?? null,
      });

      const rule = raw as unknown as ITaxRule;
      this.cache.invalidateRuleSetsByJurisdiction(rule.jurisdictionCode);
      await this.audit.logRuleChange(rule, dto.changeReason ?? 'Updated', userId);
      await this.publishEvent(TaxEvent.RULE_UPDATED, {
        ruleKey: rule.ruleKey,
        ruleId: rule.id,
        jurisdictionCode: rule.jurisdictionCode,
        workspaceId: rule.workspaceId,
        changedBy: userId,
      });
      return TaxRuleResponseDto.from(rule);
    }

    // Immutable (APPROVED/PUBLISHED) — create a new version instead of mutating.
    const raw = await this.repository.createRule({
      ruleKey: existing.ruleKey,
      name: dto.name ?? existing.name,
      taxType: existing.taxType,
      jurisdictionCode: existing.jurisdictionCode,
      rate,
      calculationMode: dto.calculationMode ?? existing.calculationMode,
      isCompound: dto.isCompound ?? existing.isCompound,
      compoundOnRuleKeys: dto.compoundOnRuleKeys ?? existing.compoundOnRuleKeys,
      reverseCharge: dto.reverseCharge ?? existing.reverseCharge,
      priority: dto.priority ?? existing.priority,
      applicability: dto.applicability ?? existing.applicability,
      exemptions: dto.exemptions ?? existing.exemptions,
      thresholds: dto.thresholds ?? existing.thresholds,
      workspaceId: existing.workspaceId,
      status: TaxRuleStatus.DRAFT,
      version: existing.version + 1,
      supersedesId: existing.id,
      effectiveFrom,
      effectiveTo,
      metadata: dto.metadata ?? existing.metadata,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const versioned = raw as unknown as ITaxRule;
    await this.audit.logRuleChange(versioned, dto.changeReason ?? 'New version created', userId);
    await this.publishEvent(TaxEvent.RULE_UPDATED, {
      ruleKey: versioned.ruleKey,
      ruleId: versioned.id,
      jurisdictionCode: versioned.jurisdictionCode,
      workspaceId: versioned.workspaceId,
      changedBy: userId,
      metadata: { supersedesId: existing.id },
    });

    return TaxRuleResponseDto.from(versioned);
  }

  async submitForApproval(id: string, userId?: string): Promise<TaxRuleResponseDto> {
    return this.transitionRule(id, TaxRuleStatus.PENDING_APPROVAL, TaxEvent.RULE_UPDATED, userId);
  }

  async approveRule(id: string, userId?: string): Promise<TaxRuleResponseDto> {
    return this.transitionRule(id, TaxRuleStatus.APPROVED, TaxEvent.RULE_APPROVED, userId, {
      approvedBy: userId ?? null,
      approvedAt: new Date(),
    });
  }

  async publishRule(id: string, userId?: string): Promise<TaxRuleResponseDto> {
    return this.transitionRule(id, TaxRuleStatus.PUBLISHED, TaxEvent.RULE_PUBLISHED, userId, {
      publishedAt: new Date(),
    });
  }

  async archiveRule(id: string, userId?: string): Promise<TaxRuleResponseDto> {
    return this.transitionRule(id, TaxRuleStatus.ARCHIVED, TaxEvent.RULE_ARCHIVED, userId);
  }

  private async transitionRule(
    id: string,
    to: TaxRuleStatus,
    event: TaxEvent,
    userId?: string,
    extraData: Record<string, unknown> = {},
  ): Promise<TaxRuleResponseDto> {
    const existing = await this.requireRule(id);
    const allowed = TAX_CONSTANTS.ALLOWED_RULE_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        message: `Cannot transition tax rule from '${existing.status}' to '${to}'`,
        code: TAX_ERROR_CODES.INVALID_TRANSITION,
      });
    }

    const raw = await this.repository.updateRule(id, { status: to, ...extraData, updatedBy: userId ?? null });
    const rule = raw as unknown as ITaxRule;
    this.cache.invalidateRuleSetsByJurisdiction(rule.jurisdictionCode);

    await this.audit.logRuleChange(rule, `Transitioned to ${to}`, userId);
    await this.publishEvent(event, {
      ruleKey: rule.ruleKey,
      ruleId: rule.id,
      jurisdictionCode: rule.jurisdictionCode,
      workspaceId: rule.workspaceId,
      changedBy: userId,
    });
    await this.recordCentralAudit(`tax.rule_${to.toLowerCase()}`, userId, {
      workspaceId: rule.workspaceId ?? undefined,
      ruleKey: rule.ruleKey,
    });

    return TaxRuleResponseDto.from(rule);
  }

  /** Restores a prior version's field values as a brand-new DRAFT version — the current row and history are never mutated. */
  async rollbackRule(id: string, dto: RollbackTaxRuleDto, userId?: string): Promise<TaxRuleResponseDto> {
    const existing = await this.requireRule(id);
    const historyEntry = await this.repository.findRuleHistoryByVersion(id, dto.toVersion);
    if (!historyEntry) {
      throw new NotFoundException({
        message: `Version ${dto.toVersion} not found in history for tax rule '${id}'`,
        code: TAX_ERROR_CODES.HISTORY_VERSION_NOT_FOUND,
      });
    }

    const { createdAt: _createdAt, updatedAt: _updatedAt, ...snapshot } = historyEntry['snapshot'] as Record<string, unknown>;
    const raw = await this.repository.createRule({
      ...snapshot,
      ruleKey: existing.ruleKey,
      jurisdictionCode: existing.jurisdictionCode,
      workspaceId: existing.workspaceId,
      status: TaxRuleStatus.DRAFT,
      version: existing.version + 1,
      supersedesId: existing.id,
      approvedBy: null,
      approvedAt: null,
      publishedAt: null,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const rolledBack = raw as unknown as ITaxRule;
    await this.audit.logRuleChange(rolledBack, dto.reason ?? `Rolled back to v${dto.toVersion}`, userId);
    await this.publishEvent(TaxEvent.RULE_ROLLED_BACK, {
      ruleKey: rolledBack.ruleKey,
      ruleId: rolledBack.id,
      jurisdictionCode: rolledBack.jurisdictionCode,
      workspaceId: rolledBack.workspaceId,
      changedBy: userId,
      metadata: { rolledBackToVersion: dto.toVersion, supersedesId: existing.id },
    });

    return TaxRuleResponseDto.from(rolledBack);
  }

  async getRuleHistory(id: string): Promise<Record<string, unknown>[]> {
    await this.requireRule(id);
    return this.repository.findRuleHistory(id);
  }

  // ── Overrides (authorized only) ──────────────────────────────

  async createOverride(dto: CreateTaxOverrideDto, userId?: string): Promise<Record<string, unknown>> {
    if (!dto.authorizedBy) {
      throw new BadRequestException({
        message: 'Tax overrides require an authorizedBy identity',
        code: TAX_ERROR_CODES.UNAUTHORIZED_OVERRIDE,
      });
    }

    const raw = await this.repository.createOverride({
      workspaceId: dto.workspaceId ?? null,
      organizationId: dto.organizationId ?? null,
      ruleKey: dto.ruleKey ?? null,
      jurisdictionCode: dto.jurisdictionCode ? dto.jurisdictionCode.toUpperCase() : null,
      taxType: dto.taxType ?? null,
      overrideType: dto.overrideType,
      overrideValue: dto.overrideValue,
      authorizedBy: dto.authorizedBy,
      priority: dto.priority ?? 0,
      reason: dto.reason ?? null,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    if (dto.workspaceId) {
      this.cache.invalidateRuleSetsByWorkspace(dto.workspaceId);
    } else {
      this.cache.invalidateAllRuleSets();
    }

    await this.publishEvent(TaxEvent.OVERRIDE_CREATED, {
      ruleKey: dto.ruleKey,
      jurisdictionCode: dto.jurisdictionCode,
      workspaceId: dto.workspaceId,
      changedBy: userId,
      metadata: { authorizedBy: dto.authorizedBy, overrideType: dto.overrideType },
    });

    return raw;
  }

  // ── Calculation ───────────────────────────────────────────

  async calculateTax(dto: CalculateTaxDto, userId?: string): Promise<TaxCalculationResult> {
    const request: TaxCalculationRequest = {
      workspaceId: dto.workspaceId,
      organizationId: dto.organizationId,
      transactionType: dto.transactionType,
      transactionRef: dto.transactionRef,
      taxableBase: dto.taxableBase,
      currency: dto.currency,
      jurisdictionCode: dto.jurisdictionCode,
      taxType: dto.taxType,
      context: dto.context,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
      persist: dto.persist,
    };

    const effectiveDate = request.effectiveDate ?? new Date();

    const resolutionRequest: TaxRuleResolutionRequest = {
      workspaceId: request.workspaceId,
      organizationId: request.organizationId,
      jurisdictionCode: request.jurisdictionCode,
      taxType: request.taxType,
      effectiveDate,
      context: request.context,
    };
    const resolvedRules = await this.resolver.resolve(resolutionRequest);

    const outcome = this.calculator.calculate(resolvedRules, request.taxableBase, request.currency, request.context);
    const warnings = [...outcome.warnings];
    if (resolvedRules.length === 0) {
      warnings.push(`No applicable published tax rule found for jurisdiction '${request.jurisdictionCode}'`);
    }

    let recordId: string | null = null;
    if (request.persist !== false) {
      const primaryLine = outcome.breakdown[0];
      const raw = await this.repository.createCalculationRecord({
        workspaceId: request.workspaceId,
        transactionType: request.transactionType,
        transactionRef: request.transactionRef,
        taxableBase: request.taxableBase,
        currency: request.currency.toUpperCase(),
        jurisdictionCode: request.jurisdictionCode.toUpperCase(),
        taxType: request.taxType ?? primaryLine?.taxType ?? 'CUSTOM',
        rate: primaryLine?.rate ?? 0,
        taxAmount: outcome.totalTaxAmount,
        calculationMode: primaryLine
          ? resolvedRules.find((r) => r.rule.ruleKey === primaryLine.ruleKey)?.rule.calculationMode ?? CalculationMode.EXCLUSIVE
          : CalculationMode.EXCLUSIVE,
        ruleId: resolvedRules.find((r) => r.rule.ruleKey === primaryLine?.ruleKey)?.rule.id ?? null,
        ruleKey: primaryLine?.ruleKey ?? null,
        ruleVersion: primaryLine?.ruleVersion ?? null,
        isReverseCharge: outcome.totalReverseChargeAmount > 0,
        isExempt: outcome.isExempt,
        breakdown: outcome.breakdown,
        effectiveDate,
        metadata: {},
        createdBy: userId ?? null,
      });
      recordId = (raw as { id: string }).id;
    }

    const result: TaxCalculationResult = {
      workspaceId: request.workspaceId,
      transactionType: request.transactionType,
      transactionRef: request.transactionRef,
      taxableBase: request.taxableBase,
      currency: request.currency.toUpperCase(),
      jurisdictionCode: request.jurisdictionCode.toUpperCase(),
      totalTaxAmount: outcome.totalTaxAmount,
      totalReverseChargeAmount: outcome.totalReverseChargeAmount,
      calculationMode: (resolvedRules[0]?.rule.calculationMode ?? TAX_CONSTANTS.DEFAULT_CALCULATION_MODE) as CalculationMode,
      isExempt: outcome.isExempt,
      breakdown: outcome.breakdown,
      effectiveDate,
      calculatedAt: new Date(),
      recordId,
      warnings,
    };

    await this.publishEvent(TaxEvent.CALCULATION_PERFORMED, {
      jurisdictionCode: result.jurisdictionCode,
      workspaceId: result.workspaceId,
      metadata: {
        transactionType: result.transactionType,
        transactionRef: result.transactionRef,
        totalTaxAmount: result.totalTaxAmount,
        isExempt: result.isExempt,
      },
    });

    if (resolvedRules.length === 0) {
      await this.publishEvent(TaxEvent.VALIDATION_FAILED, {
        jurisdictionCode: result.jurisdictionCode,
        workspaceId: result.workspaceId,
        metadata: { reason: 'MISSING_RULE', transactionRef: result.transactionRef },
      });
    }

    return result;
  }

  async getCalculationRecords(
    filter: TaxCalculationRecordFilterDto,
  ): Promise<{ items: TaxCalculationRecordResponseDto[]; total: number }> {
    const options: TaxCalculationRecordFilterOptions = {
      workspaceId: filter.workspaceId,
      transactionType: filter.transactionType,
      transactionRef: filter.transactionRef,
      jurisdictionCode: filter.jurisdictionCode,
      fromDate: filter.fromDate ? new Date(filter.fromDate) : null,
      toDate: filter.toDate ? new Date(filter.toDate) : null,
      page: filter.page,
      limit: filter.limit,
    };
    const [raws, total] = await this.repository.findCalculationRecords(options);
    return {
      items: (raws as unknown as ITaxCalculationRecord[]).map((r) => TaxCalculationRecordResponseDto.from(r)),
      total,
    };
  }

  // ── Cache ─────────────────────────────────────────────────

  async invalidateCache(jurisdictionCode?: string, workspaceId?: string): Promise<void> {
    if (jurisdictionCode) {
      this.cache.invalidateRuleSetsByJurisdiction(jurisdictionCode);
    } else {
      this.cache.flush();
    }
    if (workspaceId) {
      this.cache.invalidateRuleSetsByWorkspace(workspaceId);
      this.cache.invalidateCalculationsByWorkspace(workspaceId);
    }
    await this.publishEvent(TaxEvent.CACHE_INVALIDATED, { jurisdictionCode, workspaceId });
  }

  // ── Helpers ───────────────────────────────────────────────

  private async requireJurisdiction(code: string): Promise<ITaxJurisdiction> {
    const cached = this.jurisdictionRegistry.get(code);
    if (cached) return cached;
    const raw = await this.repository.findJurisdictionByCode(code);
    if (!raw) {
      throw new NotFoundException({
        message: `Tax jurisdiction '${code}' not found`,
        code: TAX_ERROR_CODES.JURISDICTION_NOT_FOUND,
      });
    }
    const jurisdiction = raw as unknown as ITaxJurisdiction;
    this.jurisdictionRegistry.register(jurisdiction);
    return jurisdiction;
  }

  private async requireRule(id: string): Promise<ITaxRule> {
    const raw = await this.repository.findRuleById(id);
    if (!raw) {
      throw new NotFoundException({ message: `Tax rule '${id}' not found`, code: TAX_ERROR_CODES.RULE_NOT_FOUND });
    }
    return raw as unknown as ITaxRule;
  }

  private async publishEvent(
    event: TaxEvent,
    fields: {
      ruleKey?: string | null;
      ruleId?: string | null;
      jurisdictionCode?: string | null;
      taxType?: string | null;
      workspaceId?: string | null;
      changedBy?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      ruleKey: fields.ruleKey ?? null,
      ruleId: fields.ruleId ?? null,
      jurisdictionCode: fields.jurisdictionCode ?? null,
      taxType: fields.taxType ?? null,
      workspaceId: fields.workspaceId ?? null,
      changedBy: fields.changedBy ?? null,
      metadata: fields.metadata,
      timestamp: new Date(),
    });
  }

  /**
   * Writes a lightweight entry to the central, cross-cutting audit ledger
   * for workspace-scoped tax actions — mirrors `CurrencyService`/`CountryService`.
   */
  private async recordCentralAudit(
    action: string,
    performedBy?: string,
    metadata?: Record<string, unknown> & { workspaceId?: string },
  ): Promise<void> {
    const workspaceId = metadata?.workspaceId;
    if (!workspaceId) return;

    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: TAX_MODULE,
        entityType: 'TaxRule',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
