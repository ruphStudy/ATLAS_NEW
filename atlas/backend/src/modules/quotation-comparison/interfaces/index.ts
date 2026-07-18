// ── Comparison status ─────────────────────────────────────────

export enum ComparisonStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REVISED = 'REVISED',
  ARCHIVED = 'ARCHIVED',
}

// ── Recommendation ────────────────────────────────────────────

export enum ComparisonRecommendation {
  STRONGLY_RECOMMENDED = 'STRONGLY_RECOMMENDED',
  RECOMMENDED = 'RECOMMENDED',
  ACCEPTABLE = 'ACCEPTABLE',
  NOT_RECOMMENDED = 'NOT_RECOMMENDED',
}

// ── Weight dimension keys ─────────────────────────────────────

export interface ComparisonWeights {
  unitPrice: number;
  totalCost: number;
  moq: number;
  leadTime: number;
  paymentTerms: number;
  shippingTerms: number;
  certifications: number;
  verificationScore: number;
  riskScore: number;
  performanceScore: number;
}

// ── Per-supplier score breakdown ──────────────────────────────

export interface SupplierScoreBreakdown {
  supplierId: string;
  rfqSupplierId: string;

  // Provider attribution — null for manual/internal quotations
  providerCode: string | null;
  providerQuotationRef: string | null;

  // Raw values from the RfqSupplier quote
  quotedUnitPrice: number | null;
  quotedTotalCost: number | null;
  quotedMoq: number | null;
  quotedLeadTimeDays: number | null;
  paymentTerms: string | null;
  shippingTerms: string | null;
  certifications: string[];

  // Supplier-profile scores (0–100)
  verificationScore: number | null;
  riskScore: number | null;
  performanceScore: number | null;

  // Normalised dimension scores (0–100)
  unitPriceScore: number;
  totalCostScore: number;
  moqScore: number;
  leadTimeScore: number;
  paymentTermsScore: number;
  shippingTermsScore: number;
  certificationsScore: number;
  verificationScoreNorm: number;
  riskScoreNorm: number;
  performanceScoreNorm: number;

  // Final composite score (0–100)
  comparisonScore: number;
  recommendation: ComparisonRecommendation;
  rank: number;
}

// ── Comparison record ─────────────────────────────────────────

export interface IQuotationComparison {
  id: string;
  workspaceId: string;
  rfqId: string;
  version: number;
  status: ComparisonStatus;
  weights: ComparisonWeights;
  supplierBreakdowns: SupplierScoreBreakdown[];
  recommendedSupplierId: string | null;
  selectedSupplierId: string | null;
  selectionReason: string | null;
  selectionBy: string | null;
  selectionAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ── Engine input ──────────────────────────────────────────────

export interface ComparisonEngineInput {
  supplierId: string;
  rfqSupplierId: string;

  // Provider attribution
  providerCode: string | null;
  providerQuotationRef: string | null;

  quotedUnitPrice: number | null;
  quotedQuantity: number;
  quotedMoq: number | null;
  quotedLeadTimeDays: number | null;
  paymentTerms: string | null;
  shippingTerms: string | null;
  certifications: string[];
  verificationScore: number | null;
  riskScore: number | null;
  performanceScore: number | null;
}

// ── Queue job ─────────────────────────────────────────────────

export interface QuotationComparedJobPayload {
  comparisonId: string;
  rfqId: string;
  workspaceId: string;
  event: string;
  selectedSupplierId?: string;
}
