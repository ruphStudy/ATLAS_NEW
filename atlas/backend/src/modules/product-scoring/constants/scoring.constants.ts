export const SCORING_CONSTANTS = {
  DEFAULT_VERSION: 1,
  SCORE_MIN: 0,
  SCORE_MAX: 100,

  // Default weights (sum must equal 1.0)
  DEFAULT_WEIGHTS: {
    DEMAND: 0.30,
    COMPETITION: 0.25,
    PROFIT: 0.25,
    SUPPLIER: 0.20,
  },

  // Recommendation thresholds
  BUY_THRESHOLD: 70,
  REVIEW_THRESHOLD: 45,
  // Below REVIEW_THRESHOLD → REJECT

  // Risk thresholds
  LOW_RISK_THRESHOLD: 70,
  MEDIUM_RISK_THRESHOLD: 45,

  // Confidence thresholds
  HIGH_CONFIDENCE_MIN_INPUTS: 4,   // all 4 scores present
  MEDIUM_CONFIDENCE_MIN_INPUTS: 2,
} as const;

export const SCORING_QUEUE_CONFIG = {
  CONCURRENCY: 10,
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 3000,
  REMOVE_ON_COMPLETE_COUNT: 100,
  REMOVE_ON_FAIL_COUNT: 50,
} as const;
