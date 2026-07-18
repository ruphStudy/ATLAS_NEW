// =============================================================
// Pricing Engine – Interfaces & Types
// =============================================================

export enum PricingStrategy {
  FIXED = 'FIXED',
  MARGIN_BASED = 'MARGIN_BASED',
  ROI_BASED = 'ROI_BASED',
  COMPETITIVE = 'COMPETITIVE',
  RULE_BASED = 'RULE_BASED',
  COST_PLUS = 'COST_PLUS',
  MARKETPLACE_SPECIFIC = 'MARKETPLACE_SPECIFIC',
  REGIONAL = 'REGIONAL',
}

export enum PricingStatus {
  DRAFT = 'DRAFT',
  CALCULATING = 'CALCULATING',
  CALCULATED = 'CALCULATED',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  FAILED = 'FAILED',
}

export enum PricingEvent {
  GENERATED = 'pricing.generated',
  UPDATED = 'pricing.updated',
  APPROVED = 'pricing.approved',
  VALIDATION_FAILED = 'pricing.validation-failed',
}

// ── Fee Components ────────────────────────────────────────────

export interface PricingFeeComponents {
  commissionPct?: number | null;
  fulfilmentFeeFlat?: number | null;
  shippingFeeFlat?: number | null;
  paymentProcessingPct?: number | null;
  packagingCostFlat?: number | null;
  advertisingCostPct?: number | null;
  taxPct?: number | null;
  promotionalDiscount?: number | null;
  marketplacePriceAdjustmentPct?: number | null;
  regionalPriceAdjustmentPct?: number | null;
  currencyConversionRate?: number | null;
}

export interface PricingThresholds {
  targetMarginPct?: number | null;
  targetRoi?: number | null;
  minProfitFlat?: number | null;
  minMarginPct?: number | null;
}

// ── Config ────────────────────────────────────────────────────

export interface IPricingConfig {
  id: string;
  workspaceId: string;
  marketplaceKey: string;
  country: string;
  currency: string;
  strategy: PricingStrategy;
  isDefault: boolean;
  isActive: boolean;
  feeComponents: PricingFeeComponents;
  thresholds: PricingThresholds;
  rules?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Input ─────────────────────────────────────────────────────

export interface PricingInput {
  catalogProductId: string;
  workspaceId: string;
  marketplaceKey: string;
  country?: string;
  currency?: string;
  strategy?: PricingStrategy;

  // Cost inputs
  baseCost?: number | null;
  landedCost?: number | null;
  procurementCost?: number | null;

  // Override fee components (merged with config)
  feeOverrides?: Partial<PricingFeeComponents>;

  // Manual override price (bypasses calculation)
  manualOverridePrice?: number | null;
  manualOverrideBy?: string | null;

  // Competitive reference
  competitorPrice?: number | null;

  // Scheduled price change
  scheduledPrice?: number | null;
  scheduledAt?: Date | null;
}

// ── Calculation ───────────────────────────────────────────────

export interface PricingCalculationDetail {
  component: string;
  inputValue: number | null;
  computedAmount: number;
  note?: string;
}

export interface PricingCalculationResult {
  totalCost: number;
  suggestedSellingPrice: number;
  marketplaceSellingPrice: number;
  compareAtPrice: number | null;
  estimatedProfit: number;
  estimatedMarginPct: number;
  estimatedRoi: number;
  breakdown: PricingCalculationDetail[];
  warnings: string[];
  isValid: boolean;
  validationErrors: string[];
}

// ── Record ────────────────────────────────────────────────────

export interface IPricingRecord {
  id: string;
  workspaceId: string;
  catalogProductId: string;
  configId?: string | null;
  marketplaceKey: string;
  country: string;
  currency: string;
  strategy: PricingStrategy;
  status: PricingStatus;
  version: number;

  // Input costs
  baseCost?: number | null;
  landedCost?: number | null;
  procurementCost?: number | null;

  // Fee amounts
  commissionAmount?: number | null;
  fulfilmentFeeAmount?: number | null;
  shippingFeeAmount?: number | null;
  paymentProcessingAmount?: number | null;
  packagingCostAmount?: number | null;
  advertisingCostAmount?: number | null;
  taxAmount?: number | null;
  promotionalDiscount?: number | null;

  // Outputs
  totalCost?: number | null;
  suggestedSellingPrice?: number | null;
  marketplaceSellingPrice?: number | null;
  compareAtPrice?: number | null;
  estimatedProfit?: number | null;
  estimatedMarginPct?: number | null;
  estimatedRoi?: number | null;

  manualOverridePrice?: number | null;
  manualOverrideBy?: string | null;
  manualOverrideAt?: Date | null;
  scheduledPrice?: number | null;
  scheduledAt?: Date | null;

  isValid: boolean;
  validationErrors?: string[] | null;
  calculationMeta?: Record<string, unknown> | null;
  calculationSource?: string | null;

  errorMessage?: string | null;
  failedAt?: Date | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;

  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IPricingHistory {
  id: string;
  pricingRecordId: string;
  workspaceId: string;
  version: number;
  strategy: PricingStrategy;
  status: PricingStatus;
  snapshotData: Record<string, unknown>;
  changedBy?: string | null;
  changeNote?: string | null;
  createdAt: Date;
}

// ── Bulk Pricing ──────────────────────────────────────────────

export interface BulkPricingInput {
  items: PricingInput[];
  defaultStrategy?: PricingStrategy;
  triggeredBy?: string;
}

export interface BulkPricingResult {
  succeeded: number;
  failed: number;
  results: Array<{ catalogProductId: string; recordId?: string; error?: string }>;
}

// ── Simulation ────────────────────────────────────────────────

export interface PricingSimulationInput {
  baseCost: number;
  landedCost?: number | null;
  strategy: PricingStrategy;
  marketplaceKey: string;
  country?: string;
  feeOverrides?: Partial<PricingFeeComponents>;
  thresholdOverrides?: Partial<PricingThresholds>;
}

export interface PricingComparisonRow {
  marketplaceKey: string;
  country: string;
  strategy: PricingStrategy;
  sellingPrice: number;
  profit: number;
  marginPct: number;
  roi: number;
  isViable: boolean;
}

// ── Job Payloads ──────────────────────────────────────────────

export interface PricingCalculationJobPayload {
  pricingRecordId: string;
  catalogProductId: string;
  workspaceId: string;
  marketplaceKey: string;
  input: PricingInput;
  triggeredBy?: string;
}

export interface PricingEventPayload {
  pricingRecordId: string;
  catalogProductId: string;
  workspaceId: string;
  marketplaceKey: string;
  event: PricingEvent;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}
