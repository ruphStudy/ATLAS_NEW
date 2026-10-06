import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { TaxService } from '../tax/tax.service';
import { CalculateTaxDto } from '../tax/dto';
import {
  ApplyGstVatRequest,
  GstVatAdjustmentType,
  GstVatApplicationResult,
  GstVatDirection,
  GstVatEvent,
  GstVatRegistrationFilterOptions,
  GstVatRegistrationStatus,
  GstVatTaxCodeFilterOptions,
  GstVatTransactionFilterOptions,
  GstVatTransactionStatus,
  GstVatTreatment,
  GstVatValidationIssueType,
  GstVatValidationResult,
  IGstVatAdjustment,
  IGstVatRegistration,
  IGstVatTaxCode,
  IGstVatTransaction,
  RecordGstVatAdjustmentRequest,
} from './interfaces';
import { GstVatRepository } from './repository/gst-vat.repository';
import { GstVatAudit } from './audit/gst-vat.audit';
import { GstVatEventQueue } from './events/gst-vat-events.queue';
import { GST_VAT_CONSTANTS, GST_VAT_ERROR_CODES, GST_VAT_MODULE } from './constants';
import {
  ApplyGstVatDto,
  CreateGstVatRegistrationDto,
  CreateGstVatTaxCodeDto,
  GstVatAdjustmentResponseDto,
  GstVatRegistrationFilterDto,
  GstVatRegistrationResponseDto,
  GstVatTaxCodeFilterDto,
  GstVatTaxCodeResponseDto,
  GstVatTransactionFilterDto,
  GstVatTransactionResponseDto,
  RecordGstVatAdjustmentDto,
  UpdateGstVatRegistrationDto,
  UpdateGstVatTaxCodeDto,
} from './dto';

@Injectable()
export class GstVatService {
  private readonly logger = new Logger(GstVatService.name);

  constructor(
    private readonly repository: GstVatRepository,
    private readonly taxService: TaxService,
    private readonly audit: GstVatAudit,
    private readonly eventQueue: GstVatEventQueue,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Registration ──────────────────────────────────────────

  async createRegistration(dto: CreateGstVatRegistrationDto, userId?: string): Promise<GstVatRegistrationResponseDto> {
    const existing = await this.repository.findRegistration(dto.workspaceId, dto.jurisdictionCode, dto.taxType);
    if (existing) {
      throw new ConflictException({
        message: `A ${dto.taxType} registration already exists for workspace '${dto.workspaceId}' in '${dto.jurisdictionCode}'`,
        code: GST_VAT_ERROR_CODES.REGISTRATION_DUPLICATE,
      });
    }

    const raw = await this.repository.createRegistration({
      workspaceId: dto.workspaceId,
      jurisdictionCode: dto.jurisdictionCode.toUpperCase(),
      taxType: dto.taxType,
      registrationNumber: dto.registrationNumber,
      registrationType: dto.registrationType ?? null,
      status: GstVatRegistrationStatus.ACTIVE,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const registration = raw as unknown as IGstVatRegistration;
    await this.audit.logRegistrationChange(registration, 'Created', userId);
    await this.publishEvent(GstVatEvent.REGISTRATION_CREATED, {
      workspaceId: registration.workspaceId,
      jurisdictionCode: registration.jurisdictionCode,
      taxType: registration.taxType as string,
      registrationId: registration.id,
      changedBy: userId,
    });
    await this.recordCentralAudit('gst_vat.registration_created', registration.workspaceId, userId, {
      jurisdictionCode: registration.jurisdictionCode,
      taxType: registration.taxType,
    });

    return GstVatRegistrationResponseDto.from(registration);
  }

  async findRegistrations(
    filter: GstVatRegistrationFilterDto,
  ): Promise<{ items: GstVatRegistrationResponseDto[]; total: number }> {
    const [raws, total] = await this.repository.findRegistrations(filter as GstVatRegistrationFilterOptions);
    return {
      items: (raws as unknown as IGstVatRegistration[]).map((r) => GstVatRegistrationResponseDto.from(r)),
      total,
    };
  }

  async findRegistrationById(id: string): Promise<GstVatRegistrationResponseDto> {
    return GstVatRegistrationResponseDto.from(await this.requireRegistration(id));
  }

  async updateRegistration(
    id: string,
    dto: UpdateGstVatRegistrationDto,
    userId?: string,
  ): Promise<GstVatRegistrationResponseDto> {
    const existing = await this.requireRegistration(id);

    const raw = await this.repository.updateRegistration(id, {
      ...(dto.registrationNumber !== undefined && { registrationNumber: dto.registrationNumber }),
      ...(dto.registrationType !== undefined && { registrationType: dto.registrationType }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.effectiveTo !== undefined && { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      updatedBy: userId ?? null,
    });

    const registration = raw as unknown as IGstVatRegistration;
    const event =
      registration.status === GstVatRegistrationStatus.SUSPENDED
        ? GstVatEvent.REGISTRATION_SUSPENDED
        : registration.status === GstVatRegistrationStatus.CANCELLED
          ? GstVatEvent.REGISTRATION_CANCELLED
          : GstVatEvent.REGISTRATION_UPDATED;

    await this.audit.logRegistrationChange(registration, `Updated (${existing.status} → ${registration.status})`, userId);
    await this.publishEvent(event, {
      workspaceId: registration.workspaceId,
      jurisdictionCode: registration.jurisdictionCode,
      taxType: registration.taxType as string,
      registrationId: registration.id,
      changedBy: userId,
    });

    return GstVatRegistrationResponseDto.from(registration);
  }

  async getRegistrationHistory(id: string): Promise<Record<string, unknown>[]> {
    await this.requireRegistration(id);
    return this.repository.findRegistrationHistory(id);
  }

  // ── Tax Codes ─────────────────────────────────────────────

  async createTaxCode(dto: CreateGstVatTaxCodeDto, userId?: string): Promise<GstVatTaxCodeResponseDto> {
    const existing = await this.repository.findTaxCode(dto.code, dto.jurisdictionCode ?? null, dto.workspaceId ?? null);
    if (existing) {
      throw new ConflictException({
        message: `Tax code '${dto.code}' already exists for this jurisdiction/workspace scope`,
        code: GST_VAT_ERROR_CODES.TAX_CODE_DUPLICATE,
      });
    }

    const raw = await this.repository.createTaxCode({
      code: dto.code,
      description: dto.description,
      category: dto.category ?? null,
      taxType: dto.taxType,
      jurisdictionCode: dto.jurisdictionCode ? dto.jurisdictionCode.toUpperCase() : null,
      ruleKey: dto.ruleKey ?? null,
      isZeroRated: dto.isZeroRated ?? false,
      status: GST_VAT_CONSTANTS.DEFAULT_TAX_CODE_STATUS,
      workspaceId: dto.workspaceId ?? null,
      metadata: dto.metadata ?? {},
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });

    const taxCode = raw as unknown as IGstVatTaxCode;
    await this.publishEvent(GstVatEvent.TAX_CODE_CREATED, {
      workspaceId: taxCode.workspaceId,
      jurisdictionCode: taxCode.jurisdictionCode,
      taxType: taxCode.taxType as string,
      changedBy: userId,
      metadata: { code: taxCode.code },
    });

    return GstVatTaxCodeResponseDto.from(taxCode);
  }

  async findTaxCodes(filter: GstVatTaxCodeFilterDto): Promise<{ items: GstVatTaxCodeResponseDto[]; total: number }> {
    const [raws, total] = await this.repository.findTaxCodes(filter as GstVatTaxCodeFilterOptions);
    return { items: (raws as unknown as IGstVatTaxCode[]).map((t) => GstVatTaxCodeResponseDto.from(t)), total };
  }

  async updateTaxCode(id: string, dto: UpdateGstVatTaxCodeDto, userId?: string): Promise<GstVatTaxCodeResponseDto> {
    const raw = await this.repository.findTaxCodeById(id);
    if (!raw) {
      throw new NotFoundException({ message: `Tax code '${id}' not found`, code: GST_VAT_ERROR_CODES.TAX_CODE_NOT_FOUND });
    }

    const updated = await this.repository.updateTaxCode(id, {
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.ruleKey !== undefined && { ruleKey: dto.ruleKey }),
      ...(dto.isZeroRated !== undefined && { isZeroRated: dto.isZeroRated }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      updatedBy: userId ?? null,
    });

    const taxCode = updated as unknown as IGstVatTaxCode;
    await this.publishEvent(GstVatEvent.TAX_CODE_UPDATED, {
      workspaceId: taxCode.workspaceId,
      jurisdictionCode: taxCode.jurisdictionCode,
      taxType: taxCode.taxType as string,
      changedBy: userId,
      metadata: { code: taxCode.code },
    });

    return GstVatTaxCodeResponseDto.from(taxCode);
  }

  // ── Configuration Validation ──────────────────────────────

  async validateConfiguration(request: ApplyGstVatRequest): Promise<GstVatValidationResult> {
    const issues: GstVatValidationResult['issues'] = [];
    const warnings: string[] = [];

    const registration = await this.repository.findRegistration(
      request.workspaceId,
      request.destinationJurisdictionCode,
      request.taxType,
    );
    if (!registration) {
      warnings.push(
        `No ${request.taxType} registration on file for workspace '${request.workspaceId}' in '${request.destinationJurisdictionCode}'`,
      );
    } else {
      const reg = registration as unknown as IGstVatRegistration;
      if (reg.status !== GstVatRegistrationStatus.ACTIVE) {
        issues.push({
          type: GstVatValidationIssueType.MISSING_REGISTRATION,
          message: `Registration for '${request.destinationJurisdictionCode}' is ${reg.status}, not ACTIVE`,
        });
      }
      if (reg.effectiveTo && reg.effectiveTo < (request.effectiveDate ?? new Date())) {
        issues.push({
          type: GstVatValidationIssueType.EXPIRED_CONFIGURATION,
          message: `Registration for '${request.destinationJurisdictionCode}' expired on ${reg.effectiveTo.toISOString()}`,
        });
      }
    }

    if (request.context?.taxCodeCode) {
      const taxCode = await this.repository.findTaxCode(
        request.context.taxCodeCode,
        request.destinationJurisdictionCode,
        request.workspaceId,
      );
      if (!taxCode) {
        issues.push({
          type: GstVatValidationIssueType.INVALID_TAX_CODE,
          message: `Tax code '${request.context.taxCodeCode}' is not registered for '${request.destinationJurisdictionCode}'`,
        });
      }
    }

    return { valid: issues.length === 0, issues, warnings };
  }

  // ── Core: Apply GST/VAT ───────────────────────────────────

  /**
   * Determines GST/VAT treatment (intra/inter-region, reverse charge,
   * zero-rated, exempt) and delegates the actual rate resolution/amount
   * calculation entirely to `TaxService.calculateTax()` — this method
   * never computes a tax amount itself, only classifies the transaction
   * and wraps the Tax Engine's immutable result in GST/VAT semantics.
   */
  async applyGstVat(dto: ApplyGstVatDto, userId?: string): Promise<GstVatApplicationResult> {
    const request: ApplyGstVatRequest = {
      workspaceId: dto.workspaceId,
      organizationId: dto.organizationId,
      taxType: dto.taxType,
      direction: dto.direction,
      transactionType: dto.transactionType,
      transactionRef: dto.transactionRef,
      taxableBase: dto.taxableBase,
      currency: dto.currency,
      originJurisdictionCode: dto.originJurisdictionCode,
      destinationJurisdictionCode: dto.destinationJurisdictionCode,
      context: dto.context,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
      persist: dto.persist,
    };

    const warnings: string[] = [];
    let treatment = this.determinePreliminaryTreatment(request);

    let taxCode: IGstVatTaxCode | null = null;
    if (request.context?.taxCodeCode) {
      const raw = await this.repository.findTaxCode(
        request.context.taxCodeCode,
        request.destinationJurisdictionCode,
        request.workspaceId,
      );
      taxCode = raw ? (raw as unknown as IGstVatTaxCode) : null;
      if (!taxCode) {
        warnings.push(`Tax code '${request.context.taxCodeCode}' is not registered — proceeding without a classification override`);
      } else if (taxCode.isZeroRated) {
        treatment = GstVatTreatment.ZERO_RATED;
      }
    }

    const registrationRaw = await this.repository.findRegistration(
      request.workspaceId,
      request.destinationJurisdictionCode,
      request.taxType,
    );
    const registration = registrationRaw ? (registrationRaw as unknown as IGstVatRegistration) : null;
    if (!registration && treatment !== GstVatTreatment.EXEMPT) {
      warnings.push(`No ${request.taxType} registration on file for '${request.destinationJurisdictionCode}'`);
    }

    const calcDto: CalculateTaxDto = {
      workspaceId: request.workspaceId,
      organizationId: request.organizationId ?? undefined,
      transactionType: request.transactionType,
      transactionRef: request.transactionRef,
      taxableBase: request.taxableBase,
      currency: request.currency,
      jurisdictionCode: request.destinationJurisdictionCode,
      taxType: request.taxType,
      context: {
        productCategory: request.context?.productCategory ?? undefined,
        customerType: request.context?.customerType ?? undefined,
        transactionType: request.transactionType,
        exemptionCodes: request.context?.exemptionCodes,
      },
      effectiveDate: request.effectiveDate ? request.effectiveDate.toISOString() : undefined,
      persist: request.persist,
    };

    const taxCalculation = await this.taxService.calculateTax(calcDto, userId);
    warnings.push(...taxCalculation.warnings);

    if (taxCalculation.isExempt && treatment !== GstVatTreatment.ZERO_RATED && treatment !== GstVatTreatment.REVERSE_CHARGE) {
      treatment = GstVatTreatment.EXEMPT;
    }

    const isItcEligible =
      request.direction === GstVatDirection.INPUT && !!registration && treatment !== GstVatTreatment.EXEMPT;
    const itcAmount = isItcEligible ? taxCalculation.totalTaxAmount : null;

    let transactionId: string | null = null;
    if (request.persist !== false && taxCalculation.recordId) {
      const raw = await this.repository.createTransaction({
        workspaceId: request.workspaceId,
        taxCalculationRecordId: taxCalculation.recordId,
        direction: request.direction,
        treatment,
        registrationId: registration?.id ?? null,
        taxCodeId: taxCode?.id ?? null,
        originJurisdictionCode: request.originJurisdictionCode ?? null,
        destinationJurisdictionCode: request.destinationJurisdictionCode.toUpperCase(),
        isItcEligible,
        itcAmount,
        transactionType: request.transactionType,
        transactionRef: request.transactionRef,
        status: GstVatTransactionStatus.RECORDED,
        metadata: {},
        createdBy: userId ?? null,
      });
      transactionId = (raw as { id: string }).id;
    }

    await this.publishEvent(GstVatEvent.TAX_APPLIED, {
      workspaceId: request.workspaceId,
      jurisdictionCode: request.destinationJurisdictionCode,
      taxType: request.taxType,
      transactionId,
      changedBy: userId,
      metadata: {
        treatment,
        direction: request.direction,
        totalTaxAmount: taxCalculation.totalTaxAmount,
        isItcEligible,
      },
    });

    if (!registration) {
      await this.publishEvent(GstVatEvent.VALIDATION_FAILED, {
        workspaceId: request.workspaceId,
        jurisdictionCode: request.destinationJurisdictionCode,
        taxType: request.taxType,
        metadata: { reason: 'MISSING_REGISTRATION', transactionRef: request.transactionRef },
      });
    }

    return {
      workspaceId: request.workspaceId,
      direction: request.direction,
      treatment,
      taxCalculation,
      transactionId,
      registrationId: registration?.id ?? null,
      isItcEligible,
      itcAmount,
      warnings,
    };
  }

  private determinePreliminaryTreatment(request: ApplyGstVatRequest): GstVatTreatment {
    if (request.context?.isReverseChargeEligible) return GstVatTreatment.REVERSE_CHARGE;
    if (!request.originJurisdictionCode) return GstVatTreatment.STANDARD;
    return request.originJurisdictionCode.toUpperCase() === request.destinationJurisdictionCode.toUpperCase()
      ? GstVatTreatment.INTRA_REGION
      : GstVatTreatment.INTER_REGION;
  }

  async getTransactions(
    filter: GstVatTransactionFilterDto,
  ): Promise<{ items: GstVatTransactionResponseDto[]; total: number }> {
    const options: GstVatTransactionFilterOptions = {
      workspaceId: filter.workspaceId,
      direction: filter.direction,
      transactionType: filter.transactionType,
      transactionRef: filter.transactionRef,
      fromDate: filter.fromDate ? new Date(filter.fromDate) : null,
      toDate: filter.toDate ? new Date(filter.toDate) : null,
      page: filter.page,
      limit: filter.limit,
    };
    const [raws, total] = await this.repository.findTransactions(options);
    return {
      items: (raws as unknown as IGstVatTransaction[]).map((t) => GstVatTransactionResponseDto.from(t)),
      total,
    };
  }

  // ── Adjustments (credit/debit notes, reversals) ──────────

  async recordAdjustment(dto: RecordGstVatAdjustmentDto, userId?: string): Promise<GstVatAdjustmentResponseDto> {
    const transactionRaw = await this.repository.findTransactionById(dto.originalTransactionId);
    if (!transactionRaw) {
      throw new NotFoundException({
        message: `GST/VAT transaction '${dto.originalTransactionId}' not found`,
        code: GST_VAT_ERROR_CODES.TRANSACTION_NOT_FOUND,
      });
    }
    const original = transactionRaw as unknown as IGstVatTransaction;

    if (!Number.isFinite(dto.amount)) {
      throw new BadRequestException({
        message: `Adjustment amount must be a finite number (received ${dto.amount})`,
        code: GST_VAT_ERROR_CODES.INVALID_ADJUSTMENT,
      });
    }

    const request: RecordGstVatAdjustmentRequest = {
      workspaceId: original.workspaceId,
      originalTransactionId: dto.originalTransactionId,
      adjustmentType: dto.adjustmentType,
      reason: dto.reason,
      amount: dto.amount,
      currency: dto.currency,
      computeViaEngine: dto.computeViaEngine,
    };

    const raw = await this.repository.createAdjustment({
      workspaceId: request.workspaceId,
      originalTransactionId: request.originalTransactionId,
      adjustmentType: request.adjustmentType,
      reason: request.reason ?? null,
      taxCalculationRecordId: null,
      amount: request.amount,
      currency: request.currency,
      status: 'RECORDED',
      metadata: {},
      createdBy: userId ?? null,
    });

    const adjustment = raw as unknown as IGstVatAdjustment;

    const newStatus =
      request.adjustmentType === GstVatAdjustmentType.REVERSAL
        ? GstVatTransactionStatus.REVERSED
        : GstVatTransactionStatus.ADJUSTED;
    await this.repository.updateTransactionStatus(original.id, { status: newStatus });

    await this.publishEvent(GstVatEvent.ADJUSTMENT_RECORDED, {
      workspaceId: request.workspaceId,
      transactionId: original.id,
      changedBy: userId,
      metadata: { adjustmentType: request.adjustmentType, amount: request.amount, adjustmentId: adjustment.id },
    });
    await this.recordCentralAudit('gst_vat.adjustment_recorded', request.workspaceId, userId, {
      originalTransactionId: original.id,
      adjustmentType: request.adjustmentType,
    });

    return GstVatAdjustmentResponseDto.from(adjustment);
  }

  async getAdjustments(transactionId: string): Promise<GstVatAdjustmentResponseDto[]> {
    const raws = await this.repository.findAdjustmentsByTransaction(transactionId);
    return (raws as unknown as IGstVatAdjustment[]).map((a) => GstVatAdjustmentResponseDto.from(a));
  }

  // ── Helpers ───────────────────────────────────────────────

  private async requireRegistration(id: string): Promise<IGstVatRegistration> {
    const raw = await this.repository.findRegistrationById(id);
    if (!raw) {
      throw new NotFoundException({
        message: `GST/VAT registration '${id}' not found`,
        code: GST_VAT_ERROR_CODES.REGISTRATION_NOT_FOUND,
      });
    }
    return raw as unknown as IGstVatRegistration;
  }

  private async publishEvent(
    event: GstVatEvent,
    fields: {
      workspaceId?: string | null;
      jurisdictionCode?: string | null;
      taxType?: string | null;
      registrationId?: string | null;
      transactionId?: string | null;
      changedBy?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.enqueue({
      event,
      workspaceId: fields.workspaceId ?? null,
      jurisdictionCode: fields.jurisdictionCode ?? null,
      taxType: fields.taxType ?? null,
      registrationId: fields.registrationId ?? null,
      transactionId: fields.transactionId ?? null,
      changedBy: fields.changedBy ?? null,
      metadata: fields.metadata,
      timestamp: new Date(),
    });
  }

  private async recordCentralAudit(
    action: string,
    workspaceId: string,
    performedBy?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: GST_VAT_MODULE,
        entityType: 'GstVat',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
