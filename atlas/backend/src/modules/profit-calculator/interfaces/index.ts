import { AnalysisStatus } from '@prisma/client';

export { AnalysisStatus };

// ── Provider types ───────────────────────────────────────────

export enum ProfitProvider {
  AMAZON_FBA = 'AMAZON_FBA',
  AMAZON_FBM = 'AMAZON_FBM',
  MANUAL = 'MANUAL',
}

// ── Cost breakdown ───────────────────────────────────────────

export interface CostBreakdown {
  productCost: number;
  shippingCost: number;
  packagingCost: number;
  advertisingCost: number;
  tax: number;
  marketplaceFees: number;
  fbaFees: number;
  totalLandedCost: number;
}

// ── Revenue & profit ─────────────────────────────────────────

export interface ProfitBreakdown {
  sellingPrice: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;   // percentage
  roi: number;            // percentage
  breakEvenPrice: number;
}

// ── Full calculation result ──────────────────────────────────

export interface ProfitCalculationData {
  costs: CostBreakdown;
  profit: ProfitBreakdown;
  profitScore: number;
  rawData: Record<string, unknown>;
}

// ── Provider input options ───────────────────────────────────

export interface ProfitProviderOptions {
  keyword: string;
  marketplace: string;
  country: string;
  category?: string | null;
  // Caller-supplied overrides
  productCost?: number;
  shippingCost?: number;
  packagingCost?: number;
  advertisingCost?: number;
  taxRate?: number;
  sellingPrice?: number;
}

// ── Provider interface ───────────────────────────────────────

export interface IProfitProvider {
  readonly providerName: ProfitProvider;
  calculate(options: ProfitProviderOptions): Promise<ProfitCalculationData>;
  isAvailable(): boolean;
}

// ── Job payload ──────────────────────────────────────────────

export interface ProfitCalculationJobPayload {
  calculationId: string;
  opportunityId: string;
  workspaceId: string;
  version: number;
  provider: ProfitProvider;
}

// ── Internal record ──────────────────────────────────────────

export interface IProfitCalculation {
  id: string;
  workspaceId: string;
  opportunityId: string;
  version: number;
  provider: string;
  status: AnalysisStatus;
  productCost?: number | null;
  shippingCost?: number | null;
  packagingCost?: number | null;
  advertisingCost?: number | null;
  tax?: number | null;
  marketplaceFees?: number | null;
  fbaFees?: number | null;
  totalLandedCost?: number | null;
  sellingPrice?: number | null;
  grossProfit?: number | null;
  netProfit?: number | null;
  profitMargin?: number | null;
  roi?: number | null;
  breakEvenPrice?: number | null;
  profitScore?: number | null;
  rawData?: unknown;
  startedAt?: Date | null;
  completedAt?: Date | null;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
