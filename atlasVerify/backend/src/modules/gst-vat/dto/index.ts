import {
  GstVatAdjustmentType,
  GstVatDirection,
  GstVatRegistrationStatus,
  GstVatTransactionStatus,
  GstVatTreatment,
  IGstVatAdjustment,
  IGstVatRegistration,
  IGstVatTaxCode,
  IGstVatTransaction,
  TaxTransactionType,
  TaxType,
} from '../interfaces';

// ── Registration ──────────────────────────────────────────────────

export class CreateGstVatRegistrationDto {
  workspaceId!: string;
  jurisdictionCode!: string;
  taxType!: TaxType;
  registrationNumber!: string;
  registrationType?: string;
  effectiveFrom!: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export class UpdateGstVatRegistrationDto {
  registrationNumber?: string;
  registrationType?: string;
  status?: GstVatRegistrationStatus;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export class GstVatRegistrationFilterDto {
  workspaceId?: string;
  jurisdictionCode?: string;
  taxType?: TaxType;
  status?: GstVatRegistrationStatus;
  page?: number;
  limit?: number;
}

// ── Tax Code ──────────────────────────────────────────────────────

export class CreateGstVatTaxCodeDto {
  code!: string;
  description!: string;
  category?: string;
  taxType!: TaxType;
  jurisdictionCode?: string;
  ruleKey?: string;
  isZeroRated?: boolean;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
}

export class UpdateGstVatTaxCodeDto {
  description?: string;
  category?: string;
  ruleKey?: string;
  isZeroRated?: boolean;
  status?: string;
  metadata?: Record<string, unknown>;
}

export class GstVatTaxCodeFilterDto {
  code?: string;
  taxType?: TaxType;
  jurisdictionCode?: string;
  workspaceId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ── Apply GST/VAT ─────────────────────────────────────────────────

export class ApplyGstVatContextDto {
  productCategory?: string;
  customerType?: string;
  taxCodeCode?: string;
  exemptionCodes?: string[];
  isReverseChargeEligible?: boolean;
}

export class ApplyGstVatDto {
  workspaceId!: string;
  organizationId?: string;
  taxType!: TaxType;
  direction!: GstVatDirection;
  transactionType!: TaxTransactionType;
  transactionRef!: string;
  taxableBase!: number;
  currency!: string;
  originJurisdictionCode?: string;
  destinationJurisdictionCode!: string;
  context?: ApplyGstVatContextDto;
  effectiveDate?: string;
  persist?: boolean;
}

export class GstVatTransactionFilterDto {
  workspaceId?: string;
  direction?: GstVatDirection;
  transactionType?: TaxTransactionType;
  transactionRef?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ── Adjustments ───────────────────────────────────────────────────

export class RecordGstVatAdjustmentDto {
  originalTransactionId!: string;
  adjustmentType!: GstVatAdjustmentType;
  reason?: string;
  amount!: number;
  currency!: string;
  computeViaEngine?: boolean;
}

// ── Response DTOs ─────────────────────────────────────────────────

export class GstVatRegistrationResponseDto {
  id!: string;
  workspaceId!: string;
  jurisdictionCode!: string;
  taxType!: TaxType | string;
  registrationNumber!: string;
  registrationType?: string | null;
  status!: GstVatRegistrationStatus;
  effectiveFrom!: Date;
  effectiveTo?: Date | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(r: IGstVatRegistration): GstVatRegistrationResponseDto {
    const dto = new GstVatRegistrationResponseDto();
    dto.id = r.id;
    dto.workspaceId = r.workspaceId;
    dto.jurisdictionCode = r.jurisdictionCode;
    dto.taxType = r.taxType;
    dto.registrationNumber = r.registrationNumber;
    dto.registrationType = r.registrationType;
    dto.status = r.status;
    dto.effectiveFrom = r.effectiveFrom;
    dto.effectiveTo = r.effectiveTo;
    dto.metadata = r.metadata;
    dto.createdAt = r.createdAt;
    dto.updatedAt = r.updatedAt;
    return dto;
  }
}

export class GstVatTaxCodeResponseDto {
  id!: string;
  code!: string;
  description!: string;
  category?: string | null;
  taxType!: TaxType | string;
  jurisdictionCode?: string | null;
  ruleKey?: string | null;
  isZeroRated!: boolean;
  status!: string;
  workspaceId?: string | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(t: IGstVatTaxCode): GstVatTaxCodeResponseDto {
    const dto = new GstVatTaxCodeResponseDto();
    dto.id = t.id;
    dto.code = t.code;
    dto.description = t.description;
    dto.category = t.category;
    dto.taxType = t.taxType;
    dto.jurisdictionCode = t.jurisdictionCode;
    dto.ruleKey = t.ruleKey;
    dto.isZeroRated = t.isZeroRated;
    dto.status = t.status;
    dto.workspaceId = t.workspaceId;
    dto.metadata = t.metadata;
    dto.createdAt = t.createdAt;
    dto.updatedAt = t.updatedAt;
    return dto;
  }
}

export class GstVatTransactionResponseDto {
  id!: string;
  workspaceId!: string;
  taxCalculationRecordId!: string;
  direction!: GstVatDirection;
  treatment!: GstVatTreatment;
  registrationId?: string | null;
  taxCodeId?: string | null;
  originJurisdictionCode?: string | null;
  destinationJurisdictionCode!: string;
  isItcEligible!: boolean;
  itcAmount?: number | null;
  transactionType!: TaxTransactionType | string;
  transactionRef!: string;
  status!: GstVatTransactionStatus;
  createdAt!: Date;

  static from(t: IGstVatTransaction): GstVatTransactionResponseDto {
    const dto = new GstVatTransactionResponseDto();
    dto.id = t.id;
    dto.workspaceId = t.workspaceId;
    dto.taxCalculationRecordId = t.taxCalculationRecordId;
    dto.direction = t.direction;
    dto.treatment = t.treatment;
    dto.registrationId = t.registrationId;
    dto.taxCodeId = t.taxCodeId;
    dto.originJurisdictionCode = t.originJurisdictionCode;
    dto.destinationJurisdictionCode = t.destinationJurisdictionCode;
    dto.isItcEligible = t.isItcEligible;
    dto.itcAmount = t.itcAmount;
    dto.transactionType = t.transactionType;
    dto.transactionRef = t.transactionRef;
    dto.status = t.status;
    dto.createdAt = t.createdAt;
    return dto;
  }
}

export class GstVatAdjustmentResponseDto {
  id!: string;
  workspaceId!: string;
  originalTransactionId!: string;
  adjustmentType!: GstVatAdjustmentType;
  reason?: string | null;
  taxCalculationRecordId?: string | null;
  amount!: number;
  currency!: string;
  status!: string;
  createdAt!: Date;

  static from(a: IGstVatAdjustment): GstVatAdjustmentResponseDto {
    const dto = new GstVatAdjustmentResponseDto();
    dto.id = a.id;
    dto.workspaceId = a.workspaceId;
    dto.originalTransactionId = a.originalTransactionId;
    dto.adjustmentType = a.adjustmentType;
    dto.reason = a.reason;
    dto.taxCalculationRecordId = a.taxCalculationRecordId;
    dto.amount = a.amount;
    dto.currency = a.currency;
    dto.status = a.status;
    dto.createdAt = a.createdAt;
    return dto;
  }
}
