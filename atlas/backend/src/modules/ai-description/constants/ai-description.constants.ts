import { AiDescriptionStatus, DescriptionSection } from '../interfaces';

export const AI_DESCRIPTION_CONSTANTS = {
  DEFAULT_LANGUAGE: 'en',
  DEFAULT_MODEL_OPENAI: 'gpt-4o',
  DEFAULT_MODEL_ANTHROPIC: 'claude-3-5-sonnet-20241022',
  DEFAULT_MODEL_GOOGLE: 'gemini-1.5-pro',

  ALL_SECTIONS: Object.values(DescriptionSection),

  ALLOWED_TRANSITIONS: {
    [AiDescriptionStatus.PENDING]: [AiDescriptionStatus.GENERATING, AiDescriptionStatus.FAILED],
    [AiDescriptionStatus.GENERATING]: [AiDescriptionStatus.GENERATED, AiDescriptionStatus.FAILED],
    [AiDescriptionStatus.GENERATED]: [
      AiDescriptionStatus.MANUALLY_EDITED,
      AiDescriptionStatus.APPROVED,
      AiDescriptionStatus.GENERATING, // re-generation
    ],
    [AiDescriptionStatus.MANUALLY_EDITED]: [
      AiDescriptionStatus.APPROVED,
      AiDescriptionStatus.GENERATING,
    ],
    [AiDescriptionStatus.APPROVED]: [AiDescriptionStatus.GENERATING],
    [AiDescriptionStatus.FAILED]: [AiDescriptionStatus.GENERATING],
  } as Record<AiDescriptionStatus, AiDescriptionStatus[]>,
} as const;

export const AI_GENERATION_QUEUE_CONFIG = {
  ATTEMPTS: 2,
  BACKOFF_DELAY_MS: 10_000,
  REMOVE_ON_COMPLETE_COUNT: 30,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const AI_DESCRIPTION_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const AI_DESCRIPTION_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  aiQualityScore: 'aiQualityScore',
  status: 'status',
  version: 'version',
  tone: 'tone',
  language: 'language',
};
