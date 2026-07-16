export const DISCOVERY_CONSTANTS = {
  QUEUE_NAME: 'discovery',
  JOB_NAME: 'run-discovery',
  DEFAULT_COUNTRY: 'US',
  MAX_KEYWORDS: 50,
  MAX_CATEGORIES: 20,
  WORKER_CONCURRENCY: 2,
} as const;

export const MARKETPLACE_CODES = {
  AMAZON: 'AMAZON',
  FLIPKART: 'FLIPKART',
  WALMART: 'WALMART',
  ETSY: 'ETSY',
  SHOPIFY: 'SHOPIFY',
} as const;

export type MarketplaceCode =
  (typeof MARKETPLACE_CODES)[keyof typeof MARKETPLACE_CODES];

export const SUPPORTED_COUNTRIES = [
  'US', 'CA', 'UK', 'DE', 'FR', 'JP', 'AU', 'IN', 'SG', 'AE',
] as const;

// Score weights for final score computation
export const SCORE_WEIGHTS = {
  DEMAND: 0.30,
  COMPETITION_INVERSE: 0.25, // higher competition = lower score
  PROFIT: 0.25,
  AI: 0.20,
} as const;
