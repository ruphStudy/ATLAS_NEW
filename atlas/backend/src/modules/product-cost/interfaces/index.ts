// ── Cost component inputs ─────────────────────────────────────

export interface CostComponents {
  /** Supplier quoted unit price in source currency */
  supplierUnitPrice: number;
  /** Order quantity */
  quantity: number;
  /** Supplier MOQ — used to compute MOQ premium when qty < MOQ */
  moq?: number | null;

  // Logistics
  shippingCost?: number | null;
  freightCost?: number | null;
  customsDutyPercent?: number | null;  // % of supplier price subtotal
  importCharges?: number | null;

  // Prep / compliance
  packagingCostPerUnit?: number | null;
  labelingCostPerUnit?: number | null;
  inspectionCost?: number | null;

  // Catch-all
  miscCharges?: number | null;

  // Currency
  sourceCurrency?: string | null;       // currency of supplierUnitPrice
  targetCurrency?: string | null;       // currency of the result
  exchangeRate?: number | null;         // sourceCurrency → targetCurrency

  // Tax
  taxPercent?: number | null;           // % applied to total after duties
}

// ── Computed result ───────────────────────────────────────────

export interface CostBreakdown {
  // Inputs (echoed back)
  supplierUnitPrice: number;
  quantity: number;
  moq: number | null;

  // Derived line items (all in targetCurrency)
  supplierPriceSubtotal: number;   // supplierUnitPrice × quantity × exchangeRate
  moqImpact: number;               // additional cost when qty < MOQ
  shippingCost: number;
  freightCost: number;
  customsDuty: number;             // customsDutyPercent × supplierPriceSubtotal
  importCharges: number;
  packagingCost: number;           // packagingCostPerUnit × quantity
  labelingCost: number;            // labelingCostPerUnit × quantity
  inspectionCost: number;
  miscCharges: number;
  tax: number;                     // taxPercent × preTaxTotal

  // Totals
  totalLandedCost: number;
  costPerUnit: number;

  // Currency
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRate: number;
}

// ── Persisted record ──────────────────────────────────────────

export interface IProductCostCalculation {
  id: string;
  workspaceId: string;
  productId?: string | null;
  opportunityId?: string | null;
  rfqId?: string | null;
  rfqSupplierId?: string | null;
  supplierId?: string | null;
  version: number;
  inputs: CostComponents;
  breakdown: CostBreakdown;
  totalLandedCost: number;
  costPerUnit: number;
  targetCurrency: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// ── Queue job ─────────────────────────────────────────────────

export interface ProductCostJobPayload {
  calculationId: string;
  workspaceId: string;
  event: string;
  productId?: string | null;
}
