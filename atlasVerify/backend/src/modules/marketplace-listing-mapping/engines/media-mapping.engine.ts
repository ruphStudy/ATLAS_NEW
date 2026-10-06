import { Injectable } from '@nestjs/common';
import {
  IUniversalImage,
  IUniversalVideo,
  MarketplaceMediaRequirements,
  MediaMappingResult,
  MappedImage,
  TransformationIssue,
  ValidationSeverity,
} from '../interfaces';
import { MAPPING_ERROR_CODES } from '../constants';

@Injectable()
export class MediaMappingEngine {
  /**
   * Build a media payload from universal images/videos without modifying originals.
   */
  buildMediaPayload(
    images: IUniversalImage[],
    videos: IUniversalVideo[],
    requirements: MarketplaceMediaRequirements,
  ): MediaMappingResult {
    const warnings: TransformationIssue[] = [];
    const errors: TransformationIssue[] = [];

    // Sort by position, primary first
    const sorted = [...images].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.position - b.position;
    });

    // Filter to allowed formats
    const formatFiltered = sorted.filter((img) => {
      if (!img.format) return true; // no format info – pass through
      const fmt = img.format.toUpperCase().replace('.', '');
      const allowed = requirements.allowedFormats.map((f) => f.toUpperCase().replace('.', ''));
      if (!allowed.includes(fmt)) {
        warnings.push({
          field: `images[${img.id}]`,
          code: MAPPING_ERROR_CODES.MEDIA_VALIDATION_FAILED,
          message: `Image ${img.id} format ${img.format} not in allowed formats: ${requirements.allowedFormats.join(', ')}`,
          severity: ValidationSeverity.WARNING,
        });
        return false;
      }
      return true;
    });

    // Filter by file size
    const sizeFiltered = formatFiltered.filter((img) => {
      if (!img.fileSizeKb) return true;
      if (img.fileSizeKb > requirements.maxFileSizeKb) {
        warnings.push({
          field: `images[${img.id}]`,
          code: MAPPING_ERROR_CODES.MEDIA_VALIDATION_FAILED,
          message: `Image ${img.id} size ${img.fileSizeKb}KB exceeds max ${requirements.maxFileSizeKb}KB`,
          severity: ValidationSeverity.WARNING,
        });
        return false;
      }
      return true;
    });

    // Filter by dimensions
    const dimFiltered = sizeFiltered.filter((img) => {
      if (!img.width || !img.height) return true;
      if (img.width < requirements.minWidth || img.height < requirements.minHeight) {
        warnings.push({
          field: `images[${img.id}]`,
          code: MAPPING_ERROR_CODES.MEDIA_VALIDATION_FAILED,
          message: `Image ${img.id} dimensions ${img.width}x${img.height} below minimum ${requirements.minWidth}x${requirements.minHeight}`,
          severity: ValidationSeverity.WARNING,
        });
        return false;
      }
      return true;
    });

    // Enforce max images
    let finalImages = dimFiltered;
    if (finalImages.length > requirements.maxImages) {
      warnings.push({
        field: 'images',
        code: MAPPING_ERROR_CODES.MEDIA_VALIDATION_FAILED,
        message: `Image count ${finalImages.length} exceeds max ${requirements.maxImages}. Truncating.`,
        severity: ValidationSeverity.WARNING,
      });
      finalImages = finalImages.slice(0, requirements.maxImages);
    }

    // Check minimum images
    if (finalImages.length < requirements.minImages) {
      errors.push({
        field: 'images',
        code: MAPPING_ERROR_CODES.MEDIA_VALIDATION_FAILED,
        message: `Image count ${finalImages.length} is below required minimum ${requirements.minImages}`,
        severity: ValidationSeverity.ERROR,
      });
    }

    // Check primary image
    if (requirements.primaryImage && !finalImages.some((i) => i.isPrimary)) {
      errors.push({
        field: 'images',
        code: MAPPING_ERROR_CODES.MEDIA_VALIDATION_FAILED,
        message: 'Primary image is required but not provided',
        severity: ValidationSeverity.ERROR,
      });
    }

    // Alt text check
    if (requirements.altTextRequired) {
      finalImages.forEach((img) => {
        if (!img.altText) {
          warnings.push({
            field: `images[${img.id}]`,
            code: MAPPING_ERROR_CODES.MEDIA_VALIDATION_FAILED,
            message: `Image ${img.id} is missing required alt text`,
            severity: ValidationSeverity.WARNING,
          });
        }
      });
    }

    // Videos
    let finalVideos = videos;
    if (!requirements.videoAllowed && videos.length > 0) {
      warnings.push({
        field: 'videos',
        code: MAPPING_ERROR_CODES.MEDIA_VALIDATION_FAILED,
        message: 'Videos are not allowed for this marketplace. Videos will be excluded.',
        severity: ValidationSeverity.WARNING,
      });
      finalVideos = [];
    } else if (
      requirements.maxVideos !== null &&
      requirements.maxVideos !== undefined &&
      videos.length > requirements.maxVideos
    ) {
      warnings.push({
        field: 'videos',
        code: MAPPING_ERROR_CODES.MEDIA_VALIDATION_FAILED,
        message: `Video count ${videos.length} exceeds max ${requirements.maxVideos}. Truncating.`,
        severity: ValidationSeverity.WARNING,
      });
      finalVideos = videos.slice(0, requirements.maxVideos);
    }

    const mappedImages: MappedImage[] = finalImages.map((img) => ({
      url: img.url,
      altText: img.altText ?? null,
      isPrimary: img.isPrimary,
      position: img.position,
      variantId: img.variantId ?? null,
    }));

    return { images: mappedImages, videos: finalVideos, warnings, errors };
  }

  /**
   * Validate media without building payload – for validation-only flow.
   */
  validateMedia(
    images: IUniversalImage[],
    videos: IUniversalVideo[],
    requirements: MarketplaceMediaRequirements,
  ): TransformationIssue[] {
    const result = this.buildMediaPayload(images, videos, requirements);
    return [...result.errors, ...result.warnings];
  }

  /**
   * Detect missing required media.
   */
  detectMissingMedia(
    images: IUniversalImage[],
    requirements: MarketplaceMediaRequirements,
  ): { missing: boolean; reason: string | null } {
    if (requirements.primaryImage && !images.some((i) => i.isPrimary)) {
      return { missing: true, reason: 'Primary image is required' };
    }
    if (images.length < requirements.minImages) {
      return {
        missing: true,
        reason: `At least ${requirements.minImages} image(s) required, ${images.length} provided`,
      };
    }
    return { missing: false, reason: null };
  }
}
