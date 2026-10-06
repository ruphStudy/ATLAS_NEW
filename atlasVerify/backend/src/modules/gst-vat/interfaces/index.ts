// =============================================================
// GST/VAT Framework – Core Interfaces & Enums
// (built on top of the Tax Engine — no rate/rule storage here)
// =============================================================

import { TaxCalculationResult, TaxTransactionType, TaxType } from '../../tax/interfaces';

// ── Re-export foundation types ────────────────────────────────

export { CalculationMode, TaxTransactionType, TaxType } from '../../tax/interfaces';

// ── Registration Status ──────────────────────────────────────

export enum GstVatRegistrationStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

// ── Direction (input vs output tax) ──────────────────────────

export enum GstVatDirection {
  INPUT = 'INPUT', // tax paid on procurement/purchases — a candidate for input tax credit
  OUTPUT = 'OUTPUT', // tax collected on sales — a liability
}

// ── Treatment ─────────────────────────────────────────────────

export enum GstVatTreatment {
  STANDARD = 'STANDARD',
  INTRA_REGION = 'INTRA_REGION',
  INTER_REGION = 'INTER_REGION',
  REVERSE_CHARGE = 'REVERSE_CHARGE',
  ZERO_RATED = 'ZERO_RATED',
  EXEMPT = 'EXEMPT',
}

// ── Transaction / Adjustment Status ──────────────────────────

export enum GstVatTransactionStatus {
  RECORDED = 'RECORDED',
  ADJUSTED = 'ADJUSTED',
  REVERSED = 'REVERSED',
}

export enum GstVatAdjustmentType {
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
  REVERSAL = 'REVERSAL',
}

// ── Events ────────────────────────────────────────────────────

export enum GstVatEvent {
  REGISTRATION_CREATED = 'gst-vat-registration-created',
  REGISTRATION_UPDATED = 'gst-vat-registration-updated',
  REGISTRATION_SUSPENDED = 'gst-vat-registration-suspended',
  REGISTRATION_CANCELLED = 'gst-vat-registration-cancelled',
  TAX_CODE_CREATED = 'gst-vat-tax-code-created',
  TAX_CODE_UPDATED = 'gst-vat-tax-code-updated',
  TAX_APPLIED = 'gst-vat-tax-applied',
  ADJUSTMENT_RECORDED = 'gst-vat-adjustment-recorded',
  VALIDATION_FAILED = 'gst-vat-validation-failed',
}

// ── Validation Issue Type ─────────────────────────────────────

export enum GstVatValidationIssueType {
  MISSING_REGISTRATION = 'MISSING_REGISTRATION',
  INVALID_TAX_CODE = 'INVALID_TAX_CODE',
  CONFLICTING_RULES = 'CONFLICTING_RULES',
  EXPIRED_CONFIGURATION = 'EXPIRED_CONFIGURATION',
}

// ── Core Entities ─────────────────────────────────────────────

export interface IGstVatRegistration {
  id: string;
  workspaceId: string;
  jurisdictionCode: string;
  taxType: TaxType | string;
  registrationNumber: string;
  registrationType?: string | null;
  status: GstVatRegistrationStatus;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IGstVatTaxCode {
  id: string;
  code: string;
  description: string;
  category?: string | null;
  taxType: TaxType | string;
  jurisdictionCode?: string | null;
  ruleKey?: string | null;
  isZeroRated: boolean;
  status: string;
  workspaceId?: string | null;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IGstVatTransaction {
  id: string;
  workspaceId: string;
  taxCalculationRecordId: string;
  direction: GstVatDirection;
  treatment: GstVatTreatment;
  registrationId?: string | null;
  taxCodeId?: string | null;
  originJurisdictionCode?: string | null;
  destinationJurisdictionCode: string;
  isItcEligible: boolean;
  itcAmount?: number | null;
  transactionType: TaxTransactionType | string;
  transactionRef: string;
  status: GstVatTransactionStatus;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: Date;
}

export interface IGstVatAdjustment {
  id: string;
  workspaceId: string;
  originalTransactionId: string;
  adjustmentType: GstVatAdjustmentType;
  reason?: string | null;
  taxCalculationRecordId?: string | null;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: Date;
}

// ── Tax Application Request/Result ───────────────────────────

export interface ApplyGstVatContext {
  productCategory?: string | null;
  customerType?: string | null;
  taxCodeCode?: string | null; // a GstVatTaxCode.code to classify the line item
  exemptionCodes?: string[];
  isReverseChargeEligible?: boolean; // caller-declared — e.g. B2B cross-border service per configured policy
}

export interface ApplyGstVatRequest {
  workspaceId: string;
  organizationId?: string | null;
  taxType: TaxType;
  direction: GstVatDirection;
  transactionType: TaxTransactionType;
  transactionRef: string;
  taxableBase: number;
  currency: string;
  originJurisdictionCode?: string | null;
  destinationJurisdictionCode: string;
  context?: ApplyGstVatContext;
  effectiveDate?: Date | null;
  persist?: boolean;
}

export interface GstVatApplicationResult {
  workspaceId: string;
  direction: GstVatDirection;
  treatment: GstVatTreatment;
  taxCalculation: TaxCalculationResult;
  transactionId?: string | null;
  registrationId?: string | null;
  isItcEligible: boolean;
  itcAmount?: number | null;
  warnings: string[];
}

// ── Adjustment Request ────────────────────────────────────────

export interface RecordGstVatAdjustmentRequest {
  workspaceId: string;
  originalTransactionId: string;
  adjustmentType: GstVatAdjustmentType;
  reason?: string | null;
  amount: number;
  currency: string;
  computeViaEngine?: boolean;
}

// ── Filters ───────────────────────────────────────────────────

export interface GstVatRegistrationFilterOptions {
  workspaceId?: string | null;
  jurisdictionCode?: string | null;
  taxType?: TaxType | string | null;
  status?: GstVatRegistrationStatus | null;
  page?: number;
  limit?: number;
}

export interface GstVatTaxCodeFilterOptions {
  code?: string | null;
  taxType?: TaxType | string | null;
  jurisdictionCode?: string | null;
  workspaceId?: string | null;
  status?: string | null;
  page?: number;
  limit?: number;
}

export interface GstVatTransactionFilterOptions {
  workspaceId?: string | null;
  direction?: GstVatDirection | null;
  transactionType?: TaxTransactionType | string | null;
  transactionRef?: string | null;
  fromDate?: Date | null;
  toDate?: Date | null;
  page?: number;
  limit?: number;
}

// ── Validation ────────────────────────────────────────────────

export interface GstVatValidationIssue {
  type: GstVatValidationIssueType;
  message: string;
}

export interface GstVatValidationResult {
  valid: boolean;
  issues: GstVatValidationIssue[];
  warnings: string[];
}

// ── Event Payload ─────────────────────────────────────────────

export interface GstVatEventPayload {
  event: GstVatEvent;
  workspaceId?: string | null;
  jurisdictionCode?: string | null;
  taxType?: string | null;
  registrationId?: string | null;
  transactionId?: string | null;
  changedBy?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
