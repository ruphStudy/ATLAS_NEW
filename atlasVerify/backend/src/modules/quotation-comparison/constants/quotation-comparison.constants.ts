export const QUOTATION_COMPARISON_CONSTANTS = {
  EVENTS: {
    COMPARED: 'quotation.compared',
    SUPPLIER_SELECTED: 'quotation.supplier-selected',
    REVISED: 'quotation.revised',
  } as const,

  // Default weights (must sum to 1 — normalised automatically in engine)
  DEFAULT_WEIGHTS: {
    unitPrice: 0.20,
    totalCost: 0.15,
    moq: 0.08,
    leadTime: 0.10,
    paymentTerms: 0.07,
    shippingTerms: 0.05,
    certifications: 0.10,
    verificationScore: 0.10,
    riskScore: 0.08,
    performanceScore: 0.07,
  },

  // Score thresholds for recommendations
  RECOMMENDATION_THRESHOLDS: {
    STRONGLY_RECOMMENDED: 80,
    RECOMMENDED: 60,
    ACCEPTABLE: 40,
  },

  // Payment-terms quality map (higher = better buyer terms)
  PAYMENT_TERMS_SCORES: {
    NET90: 100,
    NET60: 90,
    NET45: 80,
    NET30: 70,
    NET15: 60,
    NET7: 50,
    IMMEDIATE: 30,
    ADVANCE: 10,
  } as Record<string, number>,

  // Shipping-terms quality map (lower risk = higher score)
  SHIPPING_TERMS_SCORES: {
    DDP: 100,
    DAP: 85,
    CIF: 75,
    FOB: 60,
    FCA: 55,
    EXW: 40,
  } as Record<string, number>,
} as const;

export const QUOTATION_COMPARISON_QUEUE_CONFIG = {
  CONCURRENCY: 5,
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5000,
  REMOVE_ON_COMPLETE_COUNT: 100,
  REMOVE_ON_FAIL_COUNT: 50,
} as const;

export const QUOTATION_COMPARISON_SORT_FIELDS = [
  'version',
  'status',
  'createdAt',
  'updatedAt',
] as const;
