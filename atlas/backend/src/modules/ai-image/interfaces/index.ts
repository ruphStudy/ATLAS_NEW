// =============================================================
// AI Image Generator – Interfaces & Types
// =============================================================

export enum AiImageStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  MANUALLY_UPLOADED = 'MANUALLY_UPLOADED',
  APPROVED = 'APPROVED',
  FAILED = 'FAILED',
}

export enum ImageType {
  MAIN_PRODUCT = 'MAIN_PRODUCT',
  WHITE_BACKGROUND = 'WHITE_BACKGROUND',
  LIFESTYLE = 'LIFESTYLE',
  INFOGRAPHIC = 'INFOGRAPHIC',
  FEATURE_HIGHLIGHT = 'FEATURE_HIGHLIGHT',
  DIMENSION = 'DIMENSION',
  PACKAGING = 'PACKAGING',
  VARIANT = 'VARIANT',
  BRAND = 'BRAND',
  PROMOTIONAL = 'PROMOTIONAL',
}

export enum ImageStyle {
  PHOTOREALISTIC = 'PHOTOREALISTIC',
  STUDIO = 'STUDIO',
  LIFESTYLE = 'LIFESTYLE',
  FLAT_LAY = 'FLAT_LAY',
  MINIMALIST = 'MINIMALIST',
  LUXURY = 'LUXURY',
  VIBRANT = 'VIBRANT',
  TECHNICAL = 'TECHNICAL',
}

export enum AspectRatio {
  SQUARE_1_1 = 'SQUARE_1_1',
  LANDSCAPE_16_9 = 'LANDSCAPE_16_9',
  PORTRAIT_4_5 = 'PORTRAIT_4_5',
  PORTRAIT_9_16 = 'PORTRAIT_9_16',
  LANDSCAPE_4_3 = 'LANDSCAPE_4_3',
  BANNER_3_1 = 'BANNER_3_1',
}

export enum ImageResolution {
  SD_512 = 'SD_512',
  HD_1024 = 'HD_1024',
  FHD_2048 = 'FHD_2048',
  UHD_4096 = 'UHD_4096',
}

export enum AiImageProvider {
  OPENAI_DALLE = 'OPENAI_DALLE',
  STABILITY_AI = 'STABILITY_AI',
  MIDJOURNEY = 'MIDJOURNEY',
  GOOGLE_IMAGEN = 'GOOGLE_IMAGEN',
  CUSTOM = 'CUSTOM',
}

export enum AiImageEvent {
  GENERATED = 'ai-image.generated',
  REGENERATED = 'ai-image.regenerated',
  APPROVED = 'ai-image.approved',
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface GeneratedImage {
  imageId: string;
  imageType: ImageType;
  url: string;
  thumbnailUrl?: string;
  style: ImageStyle;
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  dimensions?: ImageDimensions;
  fileSizeBytes?: number;
  mimeType?: string;
  prompt?: string;
  revisedPrompt?: string;
  qualityScore?: number;
  isApproved: boolean;
  generatedAt: Date;
}

export interface BatchImageRequest {
  imageType: ImageType;
  style: ImageStyle;
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  promptOverride?: string;
  variantId?: string;
}

export interface IAiImageSet {
  id: string;
  workspaceId: string;
  catalogProductId: string;
  status: AiImageStatus;
  version: number;

  // Configuration
  provider: AiImageProvider;
  model?: string | null;
  promptTemplateId?: string | null;
  basePrompt?: string | null;
  negativePrompt?: string | null;

  // Generated images (JSON array of GeneratedImage)
  images: GeneratedImage[];

  // Quality
  imageQualityScore?: number | null;

  // Usage tracking
  imagesGenerated?: number | null;
  generationCostUsd?: number | null;

  // Error
  errorMessage?: string | null;
  failedAt?: Date | null;

  // Timing
  generationStartedAt?: Date | null;
  generationCompletedAt?: Date | null;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IAiImageHistory {
  id: string;
  imageSetId: string;
  workspaceId: string;
  fromStatus: AiImageStatus;
  toStatus: AiImageStatus;
  version: number;
  imageTypesRegenerated?: ImageType[];
  reason?: string | null;
  changedBy?: string | null;
  snapshotImageUrls?: unknown;
  createdAt: Date;
}

export interface AiImageEventPayload {
  imageSetId: string;
  catalogProductId: string;
  workspaceId: string;
  event: AiImageEvent;
  imageTypes?: ImageType[];
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export interface AiImageGenerationJobPayload {
  imageSetId: string;
  catalogProductId: string;
  workspaceId: string;
  provider: AiImageProvider;
  model?: string;
  requests: BatchImageRequest[];
  basePrompt?: string;
  negativePrompt?: string;
  isRegeneration: boolean;
  triggeredBy?: string;
}
