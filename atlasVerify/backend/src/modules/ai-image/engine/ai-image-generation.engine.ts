import { Injectable, Logger } from '@nestjs/common';
import {
  AiImageProvider,
  AspectRatio,
  BatchImageRequest,
  GeneratedImage,
  ImageResolution,
  ImageStyle,
  ImageType,
} from '../interfaces';
import { AI_IMAGE_CONSTANTS } from '../constants';
import { v4 as uuidv4 } from 'uuid';

export interface ImageGenerationContext {
  productName: string;
  brand?: string;
  category?: string;
  description?: string;
  primaryColor?: string;
}

export interface ImageGenerationResponse {
  images: GeneratedImage[];
  imagesGenerated: number;
  model: string;
}

/**
 * Prompt builder + provider adapter.
 * Replace the mock stub with real provider SDK calls in production.
 */
@Injectable()
export class AiImageGenerationEngine {
  private readonly logger = new Logger(AiImageGenerationEngine.name);

  async generate(
    provider: AiImageProvider,
    model: string,
    requests: BatchImageRequest[],
    context: ImageGenerationContext,
    basePrompt?: string,
    negativePrompt?: string,
  ): Promise<ImageGenerationResponse> {
    this.logger.log(
      `Generating ${requests.length} images via ${provider}/${model} for product: ${context.productName}`,
    );

    const images = requests.map((req) =>
      this.generateMockImage(req, context, basePrompt, negativePrompt, model),
    );

    return {
      images,
      imagesGenerated: images.length,
      model,
    };
  }

  buildPrompt(
    req: BatchImageRequest,
    context: ImageGenerationContext,
    basePrompt?: string,
  ): string {
    const styleInstruction = this.styleInstruction(req.style);
    const typeInstruction = this.typeInstruction(req.imageType);
    const aspectRatioLabel = AI_IMAGE_CONSTANTS.ASPECT_RATIO_MAP[req.aspectRatio] ?? '1:1';

    if (req.promptOverride) return req.promptOverride;

    const parts = [
      basePrompt ?? `Professional product photography of ${context.productName}`,
      context.brand ? `by ${context.brand}` : '',
      typeInstruction,
      styleInstruction,
      `Aspect ratio: ${aspectRatioLabel}`,
      'High quality, commercial grade',
    ].filter(Boolean);

    return parts.join(', ');
  }

  private styleInstruction(style: ImageStyle): string {
    const map: Record<ImageStyle, string> = {
      [ImageStyle.PHOTOREALISTIC]: 'photorealistic photography',
      [ImageStyle.STUDIO]: 'studio lighting, white background',
      [ImageStyle.LIFESTYLE]: 'lifestyle setting, natural environment',
      [ImageStyle.FLAT_LAY]: 'flat lay composition, top-down view',
      [ImageStyle.MINIMALIST]: 'minimalist, clean background',
      [ImageStyle.LUXURY]: 'luxury brand aesthetic, elegant',
      [ImageStyle.VIBRANT]: 'vibrant colors, energetic',
      [ImageStyle.TECHNICAL]: 'technical diagram style, precise',
    };
    return map[style] ?? 'professional product photo';
  }

  private typeInstruction(imageType: ImageType): string {
    const map: Record<ImageType, string> = {
      [ImageType.MAIN_PRODUCT]: 'main hero product shot',
      [ImageType.WHITE_BACKGROUND]: 'isolated on pure white background',
      [ImageType.LIFESTYLE]: 'lifestyle in use context',
      [ImageType.INFOGRAPHIC]: 'infographic with text callouts',
      [ImageType.FEATURE_HIGHLIGHT]: 'close-up feature detail shot',
      [ImageType.DIMENSION]: 'dimension diagram with measurements',
      [ImageType.PACKAGING]: 'product in packaging',
      [ImageType.VARIANT]: 'product variant display',
      [ImageType.BRAND]: 'brand lifestyle composition',
      [ImageType.PROMOTIONAL]: 'promotional banner composition',
    };
    return map[imageType] ?? 'product image';
  }

  private generateMockImage(
    req: BatchImageRequest,
    context: ImageGenerationContext,
    basePrompt: string | undefined,
    negativePrompt: string | undefined,
    model: string,
  ): GeneratedImage {
    const dims = AI_IMAGE_CONSTANTS.RESOLUTION_DIMENSIONS[req.resolution] ?? { width: 1024, height: 1024 };
    const prompt = this.buildPrompt(req, context, basePrompt);

    return {
      imageId: uuidv4(),
      imageType: req.imageType,
      url: `https://placeholder.atlas.ai/images/${req.imageType.toLowerCase()}-${Date.now()}.png`,
      thumbnailUrl: `https://placeholder.atlas.ai/images/thumb/${req.imageType.toLowerCase()}-${Date.now()}.jpg`,
      style: req.style,
      aspectRatio: req.aspectRatio,
      resolution: req.resolution,
      dimensions: dims,
      fileSizeBytes: dims.width * dims.height * 3,
      mimeType: 'image/png',
      prompt,
      revisedPrompt: prompt,
      qualityScore: 75,
      isApproved: false,
      generatedAt: new Date(),
    };
  }

  defaultModel(provider: AiImageProvider): string {
    const key = `DEFAULT_MODEL_${provider}` as keyof typeof AI_IMAGE_CONSTANTS;
    return (AI_IMAGE_CONSTANTS[key] as string | undefined) ?? 'dall-e-3';
  }
}
