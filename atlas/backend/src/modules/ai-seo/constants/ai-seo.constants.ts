import { SeoStatus, SeoSection } from '../interfaces';

export const AI_SEO_CONSTANTS = {
  DEFAULT_MODEL_OPENAI: 'gpt-4o',
  DEFAULT_MODEL_ANTHROPIC: 'claude-3-5-sonnet-20241022',
  DEFAULT_MODEL_GOOGLE: 'gemini-1.5-pro',

  ALL_SECTIONS: Object.values(SeoSection),

  // Amazon marketplace character limits
  MARKETPLACE_LIMITS: {
    AMAZON: {
      PRODUCT_TITLE: 200,
      BULLET_POINTS_EACH: 500,
      DESCRIPTION: 2000,
      BACKEND_SEARCH_TERMS: 250,
    },
    EBAY: {
      PRODUCT_TITLE: 80,
      DESCRIPTION: 4000,
    },
    SHOPIFY: {
      PRODUCT_TITLE: 255,
      DESCRIPTION: 60000,
    },
  } as Record<string, Record<string, number>>,

  ALLOWED_TRANSITIONS: {
    [SeoStatus.PENDING]: [SeoStatus.ANALYZING, SeoStatus.FAILED],
    [SeoStatus.ANALYZING]: [SeoStatus.OPTIMIZED, SeoStatus.FAILED],
    [SeoStatus.OPTIMIZED]: [
      SeoStatus.MANUALLY_EDITED,
      SeoStatus.APPROVED,
      SeoStatus.ANALYZING,
    ],
    [SeoStatus.MANUALLY_EDITED]: [
      SeoStatus.APPROVED,
      SeoStatus.ANALYZING,
    ],
    [SeoStatus.APPROVED]: [SeoStatus.ANALYZING],
    [SeoStatus.FAILED]: [SeoStatus.ANALYZING],
  } as Record<SeoStatus, SeoStatus[]>,
} as const;

export const SEO_OPTIMIZATION_QUEUE_CONFIG = {
  ATTEMPTS: 2,
  BACKOFF_DELAY_MS: 10_000,
  REMOVE_ON_COMPLETE_COUNT: 30,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const SEO_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const AI_SEO_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  seoScore: 'seoScore',
  status: 'status',
  version: 'version',
  provider: 'provider',
  marketplace: 'marketplace',
};
