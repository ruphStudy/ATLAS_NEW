import { AiImageStatus, ImageType } from '../interfaces';

export const AI_IMAGE_CONSTANTS = {
  DEFAULT_MODEL_OPENAI_DALLE: 'dall-e-3',
  DEFAULT_MODEL_STABILITY_AI: 'stable-diffusion-xl-1024-v1-0',
  DEFAULT_MODEL_MIDJOURNEY: 'midjourney-v6',
  DEFAULT_MODEL_GOOGLE_IMAGEN: 'imagen-3.0-generate-001',

  RESOLUTION_DIMENSIONS: {
    SD_512: { width: 512, height: 512 },
    HD_1024: { width: 1024, height: 1024 },
    FHD_2048: { width: 2048, height: 2048 },
    UHD_4096: { width: 4096, height: 4096 },
  } as Record<string, { width: number; height: number }>,

  ASPECT_RATIO_MAP: {
    SQUARE_1_1: '1:1',
    LANDSCAPE_16_9: '16:9',
    PORTRAIT_4_5: '4:5',
    PORTRAIT_9_16: '9:16',
    LANDSCAPE_4_3: '4:3',
    BANNER_3_1: '3:1',
  } as Record<string, string>,

  ALL_IMAGE_TYPES: Object.values(ImageType),

  ALLOWED_TRANSITIONS: {
    [AiImageStatus.PENDING]: [AiImageStatus.GENERATING, AiImageStatus.FAILED],
    [AiImageStatus.GENERATING]: [AiImageStatus.GENERATED, AiImageStatus.FAILED],
    [AiImageStatus.GENERATED]: [
      AiImageStatus.MANUALLY_UPLOADED,
      AiImageStatus.APPROVED,
      AiImageStatus.GENERATING,
    ],
    [AiImageStatus.MANUALLY_UPLOADED]: [
      AiImageStatus.APPROVED,
      AiImageStatus.GENERATING,
    ],
    [AiImageStatus.APPROVED]: [AiImageStatus.GENERATING],
    [AiImageStatus.FAILED]: [AiImageStatus.GENERATING],
  } as Record<AiImageStatus, AiImageStatus[]>,

  // Quality score weights
  QUALITY_WEIGHTS: {
    COVERAGE: 0.4,
    APPROVED_RATIO: 0.4,
    RESOLUTION_SCORE: 0.2,
  },
} as const;

export const AI_IMAGE_GENERATION_QUEUE_CONFIG = {
  ATTEMPTS: 2,
  BACKOFF_DELAY_MS: 15_000,
  REMOVE_ON_COMPLETE_COUNT: 30,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const AI_IMAGE_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const AI_IMAGE_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  imageQualityScore: 'imageQualityScore',
  status: 'status',
  version: 'version',
  provider: 'provider',
  imagesGenerated: 'imagesGenerated',
};
