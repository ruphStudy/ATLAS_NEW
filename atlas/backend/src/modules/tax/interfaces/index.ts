// =============================================================
// Tax Engine – Core Interfaces & Enums
// =============================================================

// ── Tax Type ──────────────────────────────────────────────────

export enum TaxType {
  SALES_TAX = 'SALES_TAX',
  GST = 'GST',
  VAT = 'VAT',
  SERVICE_TAX = 'SERVICE_TAX',
  WITHHOLDING = 'WITHHOLDING',
  CUSTOM = 'CUSTOM',
}

// ── Jurisdiction Level ────────────────────────────────────────

export enum JurisdictionLevel {
  COUNTRY = 'COUNTRY',
  STATE = 'STATE',
  REGION = 'REGION',
  CITY = 'CITY',
}

// ── Calculation Mode ──────────────────────────────────────────

export enum CalculationMode {
  INCLUSIVE = 'INCLUSIVE',
  EXCLUSIVE = 'EXCLUSIVE',
}

// ── Rule Lifecycle Status ─────────────────────────────────────

export enum TaxRuleStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

// ── Override Scope Type ───────────────────────────────────────

export enum TaxOverrideType {
  GLOBAL = 'GLOBAL',
  ORGANIZATION = 'ORGANIZATION',
  WORKSPACE = 'WORKSPACE',
}

// ── Transaction Type (what is being taxed) ────────────────────

export enum TaxTransactionType {
  PROCUREMENT = 'PROCUREMENT',
  PRICING = 'PRICING',
  ORDER = 'ORDER',
  INVOICE = 'INVOICE',
  REFUND = 'REFUND',
  SETTLEMENT = 'SETTLEMENT',
  SAAS_BILLING = 'SAAS_BILLING',
}

// ── Events ────────────────────────────────────────────────────

export enum TaxEvent {
  JURISDICTION_REGISTERED = 'tax-jurisdiction-registered',
  JURISDICTION_UPDATED = 'tax-jurisdiction-updated',
  RULE_CREATED = 'tax-rule-created',
  RULE_UPDATED = 'tax-rule-updated',
  RULE_APPROVED = 'tax-rule-approved',
  RULE_PUBLISHED = 'tax-rule-published',
  RULE_ARCHIVED = 'tax-rule-archived',
  RULE_ROLLED_BACK = 'tax-rule-rolled-back',
  OVERRIDE_CREATED = 'tax-override-created',
  CALCULATION_PERFORMED = 'tax-calculation-performed',
  VALIDATION_FAILED = 'tax-validation-failed',
  RULE_CONFLICT_DETECTED = 'tax-rule-conflict-detected',
  CACHE_INVALIDATED = 'tax-cache-invalidated',
}

// ── Validation Issue Type ─────────────────────────────────────

export enum TaxValidationIssueType {
  MISSING_RULE = 'MISSING_RULE',
  CONFLICTING_RULES = 'CONFLICTING_RULES',
  EXPIRED_RULE = 'EXPIRED_RULE',
  INVALID_RULE = 'INVALID_RULE',
  UNAUTHORIZED_OVERRIDE = 'UNAUTHORIZED_OVERRIDE',
}

// ── Core Entities ─────────────────────────────────────────────

export interface ITaxJurisdiction {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  region?: string | null;
  level: JurisdictionLevel;
  parentId?: string | null;
  status: string;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ITaxThresholds {
  minAmount?: number | null;
  maxAmount?: number | null;
  currency?: string | null;
}

export interface ITaxRule {
  id: string;
  ruleKey: string;
  name: string;
  taxType: TaxType | string;
  jurisdictionCode: string;
  rate: number;
  calculationMode: CalculationMode;
  isCompound: boolean;
  compoundOnRuleKeys: string[];
  reverseCharge: boolean;
  priority: number;
  applicability: Record<string, unknown>;
  exemptions: string[];
  thresholds: ITaxThresholds;
  workspaceId?: string | null;
  status: TaxRuleStatus;
  version: number;
  supersedesId?: string | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  publishedAt?: Date | null;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ITaxRuleHistory {
  id: string;
  ruleId: string;
  ruleKey: string;
  version: number;
  status: TaxRuleStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface ITaxOverride {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  ruleKey?: string | null;
  jurisdictionCode?: string | null;
  taxType?: TaxType | string | null;
  overrideType: TaxOverrideType;
  overrideValue: Record<string, unknown>;
  authorizedBy: string;
  priority: number;
  reason?: string | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ITaxCalculationRecord {
  id: string;
  workspaceId: string;
  transactionType: TaxTransactionType | string;
  transactionRef: string;
  taxableBase: number;
  currency: string;
  jurisdictionCode: string;
  taxType: TaxType | string;
  rate: number;
  taxAmount: number;
  calculationMode: CalculationMode;
  ruleId?: string | null;
  ruleKey?: string | null;
  ruleVersion?: number | null;
  isReverseCharge: boolean;
  isExempt: boolean;
  breakdown: ITaxLineBreakdown[];
  calculatedAt: Date;
  effectiveDate: Date;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: Date;
}

// ── Calculation ───────────────────────────────────────────────

export interface TaxApplicabilityContext {
  marketplaceKey?: string | null;
  productCategory?: string | null;
  customerType?: string | null;
  transactionType?: TaxTransactionType | null;
  exemptionCodes?: string[];
}

export interface TaxCalculationRequest {
  workspaceId: string;
  organizationId?: string | null;
  transactionType: TaxTransactionType;
  transactionRef: string;
  taxableBase: number;
  currency: string;
  jurisdictionCode: string;
  taxType?: TaxType | null; // omit to resolve every applicable tax type for the jurisdiction
  context?: TaxApplicabilityContext;
  effectiveDate?: Date | null; // omit for "now" — supports historical/backdated calculation
  persist?: boolean; // when true (default), writes an immutable TaxCalculationRecord
}

export interface ITaxLineBreakdown {
  ruleKey: string;
  ruleVersion: number;
  taxType: TaxType | string;
  base: number;
  rate: number;
  amount: number;
  isCompound: boolean;
  isReverseCharge: boolean;
}

export interface TaxCalculationResult {
  workspaceId: string;
  transactionType: TaxTransactionType;
  transactionRef: string;
  taxableBase: number;
  currency: string;
  jurisdictionCode: string;
  totalTaxAmount: number;
  totalReverseChargeAmount: number;
  calculationMode: CalculationMode;
  isExempt: boolean;
  breakdown: ITaxLineBreakdown[];
  effectiveDate: Date;
  calculatedAt: Date;
  recordId?: string | null;
  warnings: string[];
}

// ── Rule Resolution ───────────────────────────────────────────

export interface TaxRuleResolutionRequest {
  workspaceId: string;
  organizationId?: string | null;
  jurisdictionCode: string;
  taxType?: TaxType | null;
  effectiveDate?: Date | null;
  context?: TaxApplicabilityContext;
}

export interface ResolvedTaxRule {
  rule: ITaxRule;
  effectiveRate: number; // after applying any authorized override
  overrideApplied: boolean;
  exempt: boolean;
}

// ── Validation ────────────────────────────────────────────────

export interface TaxValidationIssue {
  type: TaxValidationIssueType;
  message: string;
}

export interface TaxValidationResult {
  valid: boolean;
  issues: TaxValidationIssue[];
  warnings: string[];
}

// ── Filters ───────────────────────────────────────────────────

export interface TaxJurisdictionFilterOptions {
  countryCode?: string | null;
  level?: JurisdictionLevel | null;
  status?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
}

export interface TaxRuleFilterOptions {
  ruleKey?: string | null;
  taxType?: TaxType | string | null;
  jurisdictionCode?: string | null;
  status?: TaxRuleStatus | null;
  workspaceId?: string | null;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaxCalculationRecordFilterOptions {
  workspaceId?: string | null;
  transactionType?: TaxTransactionType | string | null;
  transactionRef?: string | null;
  jurisdictionCode?: string | null;
  fromDate?: Date | null;
  toDate?: Date | null;
  page?: number;
  limit?: number;
}

// ── Cache Entries ─────────────────────────────────────────────

export interface CachedTaxRuleSet {
  rules: ITaxRule[];
  cachedAt: number;
}

export interface CachedTaxCalculation {
  result: TaxCalculationResult;
  cachedAt: number;
}

// ── Event Payload ─────────────────────────────────────────────

export interface TaxEventPayload {
  event: TaxEvent;
  ruleKey?: string | null;
  ruleId?: string | null;
  jurisdictionCode?: string | null;
  taxType?: string | null;
  workspaceId?: string | null;
  changedBy?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
