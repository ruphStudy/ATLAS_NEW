import {
  CalculationMode,
  ITaxCalculationRecord,
  ITaxJurisdiction,
  ITaxRule,
  JurisdictionLevel,
  TaxOverrideType,
  TaxRuleStatus,
  TaxTransactionType,
  TaxType,
} from '../interfaces';

// ── Jurisdiction ──────────────────────────────────────────────────

export class CreateJurisdictionDto {
  code!: string;
  name!: string;
  countryCode!: string;
  region?: string;
  level?: JurisdictionLevel;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

export class UpdateJurisdictionDto {
  name?: string;
  region?: string;
  level?: JurisdictionLevel;
  status?: string;
  metadata?: Record<string, unknown>;
}

export class JurisdictionFilterDto {
  countryCode?: string;
  level?: JurisdictionLevel;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ── Tax Rule ────────────────────────────────────────────────────

export class TaxThresholdsDto {
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
}

export class CreateTaxRuleDto {
  ruleKey!: string;
  name!: string;
  taxType!: TaxType;
  jurisdictionCode!: string;
  rate!: number;
  calculationMode?: CalculationMode;
  isCompound?: boolean;
  compoundOnRuleKeys?: string[];
  reverseCharge?: boolean;
  priority?: number;
  applicability?: Record<string, unknown>;
  exemptions?: string[];
  thresholds?: TaxThresholdsDto;
  workspaceId?: string;
  effectiveFrom!: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
}

export class UpdateTaxRuleDto {
  name?: string;
  rate?: number;
  calculationMode?: CalculationMode;
  isCompound?: boolean;
  compoundOnRuleKeys?: string[];
  reverseCharge?: boolean;
  priority?: number;
  applicability?: Record<string, unknown>;
  exemptions?: string[];
  thresholds?: TaxThresholdsDto;
  effectiveFrom?: string;
  effectiveTo?: string;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}

export class RollbackTaxRuleDto {
  toVersion!: number;
  reason?: string;
}

export class TaxRuleFilterDto {
  ruleKey?: string;
  taxType?: TaxType;
  jurisdictionCode?: string;
  status?: TaxRuleStatus;
  workspaceId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Override (authorized only) ───────────────────────────────────

export class CreateTaxOverrideDto {
  workspaceId?: string;
  organizationId?: string;
  ruleKey?: string;
  jurisdictionCode?: string;
  taxType?: TaxType;
  overrideType!: TaxOverrideType;
  overrideValue!: Record<string, unknown>;
  authorizedBy!: string;
  priority?: number;
  reason?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

// ── Calculation ───────────────────────────────────────────────────

export class TaxApplicabilityContextDto {
  marketplaceKey?: string;
  productCategory?: string;
  customerType?: string;
  transactionType?: TaxTransactionType;
  exemptionCodes?: string[];
}

export class CalculateTaxDto {
  workspaceId!: string;
  organizationId?: string;
  transactionType!: TaxTransactionType;
  transactionRef!: string;
  taxableBase!: number;
  currency!: string;
  jurisdictionCode!: string;
  taxType?: TaxType;
  context?: TaxApplicabilityContextDto;
  effectiveDate?: string;
  persist?: boolean;
}

export class TaxCalculationRecordFilterDto {
  workspaceId?: string;
  transactionType?: TaxTransactionType;
  transactionRef?: string;
  jurisdictionCode?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ── Response DTOs ─────────────────────────────────────────────────

export class TaxJurisdictionResponseDto {
  id!: string;
  code!: string;
  name!: string;
  countryCode!: string;
  region?: string | null;
  level!: JurisdictionLevel;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;

  static from(j: ITaxJurisdiction): TaxJurisdictionResponseDto {
    const dto = new TaxJurisdictionResponseDto();
    dto.id = j.id;
    dto.code = j.code;
    dto.name = j.name;
    dto.countryCode = j.countryCode;
    dto.region = j.region;
    dto.level = j.level;
    dto.status = j.status;
    dto.createdAt = j.createdAt;
    dto.updatedAt = j.updatedAt;
    return dto;
  }
}

export class TaxRuleResponseDto {
  id!: string;
  ruleKey!: string;
  name!: string;
  taxType!: TaxType | string;
  jurisdictionCode!: string;
  rate!: number;
  calculationMode!: CalculationMode;
  isCompound!: boolean;
  reverseCharge!: boolean;
  priority!: number;
  status!: TaxRuleStatus;
  version!: number;
  supersedesId?: string | null;
  effectiveFrom!: Date;
  effectiveTo?: Date | null;
  workspaceId?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(rule: ITaxRule): TaxRuleResponseDto {
    const dto = new TaxRuleResponseDto();
    dto.id = rule.id;
    dto.ruleKey = rule.ruleKey;
    dto.name = rule.name;
    dto.taxType = rule.taxType;
    dto.jurisdictionCode = rule.jurisdictionCode;
    dto.rate = rule.rate;
    dto.calculationMode = rule.calculationMode;
    dto.isCompound = rule.isCompound;
    dto.reverseCharge = rule.reverseCharge;
    dto.priority = rule.priority;
    dto.status = rule.status;
    dto.version = rule.version;
    dto.supersedesId = rule.supersedesId;
    dto.effectiveFrom = rule.effectiveFrom;
    dto.effectiveTo = rule.effectiveTo;
    dto.workspaceId = rule.workspaceId;
    dto.createdAt = rule.createdAt;
    dto.updatedAt = rule.updatedAt;
    return dto;
  }
}

export class TaxCalculationRecordResponseDto {
  id!: string;
  transactionType!: TaxTransactionType | string;
  transactionRef!: string;
  taxableBase!: number;
  currency!: string;
  jurisdictionCode!: string;
  taxAmount!: number;
  isReverseCharge!: boolean;
  isExempt!: boolean;
  calculatedAt!: Date;
  effectiveDate!: Date;

  static from(record: ITaxCalculationRecord): TaxCalculationRecordResponseDto {
    const dto = new TaxCalculationRecordResponseDto();
    dto.id = record.id;
    dto.transactionType = record.transactionType;
    dto.transactionRef = record.transactionRef;
    dto.taxableBase = record.taxableBase;
    dto.currency = record.currency;
    dto.jurisdictionCode = record.jurisdictionCode;
    dto.taxAmount = record.taxAmount;
    dto.isReverseCharge = record.isReverseCharge;
    dto.isExempt = record.isExempt;
    dto.calculatedAt = record.calculatedAt;
    dto.effectiveDate = record.effectiveDate;
    return dto;
  }
}

export class PaginatedTaxRuleResponseDto {
  items!: TaxRuleResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
