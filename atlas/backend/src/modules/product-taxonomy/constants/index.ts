/**
 * Cold-start trend discovery tuning constants.
 *
 * SEED_CATEGORIES are a configurable TAXONOMY starting point — real,
 * human-curated Wikipedia category names, not trend results. They decide
 * where discovery *looks*, never what counts as "trending" (Prompt 6 §7).
 */
export const TREND_DISCOVERY_CONSTANTS = {
  SEED_CATEGORIES: [
    'Consumer electronics',
    'Clothing',
    'Home appliances',
    'Personal care',
    'Toys',
  ] as string[],

  /** How many category levels to walk below each seed (1 = seed's own articles only, 2 = also one level of subcategories). */
  MAX_CATEGORY_LEVELS: 2,

  /** Bound per-category fan-out so one cold-start run can't balloon into hundreds of Wikimedia calls. */
  MAX_SUBCATEGORIES_PER_SEED: 3,
  MAX_ARTICLES_PER_CATEGORY: 6,
  MAX_TOTAL_CONCEPTS_PER_RUN: 20,

  /** Pageviews window for the ATTENTION growth calculation. */
  PAGEVIEWS_WINDOW_DAYS: 30,
  /** Wikimedia pageviews data has a processing lag; stop this many days before "today". */
  PAGEVIEWS_LAG_DAYS: 3,

  /** Skip re-fetching a signal for a concept if one this fresh already exists — the real cross-run cost control. */
  SIGNAL_FRESHNESS_HOURS: 12,

  /** Required by Wikimedia's API etiquette policy — identifies the caller, never omitted. */
  WIKI_USER_AGENT: 'ATLAS-TrendDiscovery/1.0 (contact: dev@atlas.local)',

  HTTP_TIMEOUT_MS: 15_000,
} as const;
