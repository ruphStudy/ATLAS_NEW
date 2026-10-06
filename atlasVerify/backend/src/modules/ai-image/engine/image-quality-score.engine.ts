import { Injectable } from '@nestjs/common';
import {
  GeneratedImage,
  ImageResolution,
  ImageType,
} from '../interfaces';
import { AI_IMAGE_CONSTANTS } from '../constants';

interface QualityInput {
  images: GeneratedImage[];
  requestedImageTypes: ImageType[];
}

@Injectable()
export class ImageQualityScoreEngine {
  /**
   * Calculates Image Quality Score (0–100):
   *   - Coverage       : % of requested types present (40%)
   *   - Approved ratio : % of generated images approved (40%)
   *   - Resolution     : weighted average resolution score (20%)
   */
  calculate(input: QualityInput): number {
    const coverage = this.calcCoverage(input);
    const approvedRatio = this.calcApprovedRatio(input.images);
    const resolutionScore = this.calcResolutionScore(input.images);

    const score = Math.round(
      coverage * AI_IMAGE_CONSTANTS.QUALITY_WEIGHTS.COVERAGE +
      approvedRatio * AI_IMAGE_CONSTANTS.QUALITY_WEIGHTS.APPROVED_RATIO +
      resolutionScore * AI_IMAGE_CONSTANTS.QUALITY_WEIGHTS.RESOLUTION_SCORE,
    );

    return Math.max(0, Math.min(100, score));
  }

  private calcCoverage({ images, requestedImageTypes }: QualityInput): number {
    if (requestedImageTypes.length === 0) return 100;
    const generatedTypes = new Set(images.map((i) => i.imageType));
    const covered = requestedImageTypes.filter((t) => generatedTypes.has(t)).length;
    return (covered / requestedImageTypes.length) * 100;
  }

  private calcApprovedRatio(images: GeneratedImage[]): number {
    if (images.length === 0) return 0;
    const approved = images.filter((i) => i.isApproved).length;
    return (approved / images.length) * 100;
  }

  private calcResolutionScore(images: GeneratedImage[]): number {
    if (images.length === 0) return 0;

    const resolutionScore = (resolution: ImageResolution): number => {
      switch (resolution) {
        case ImageResolution.UHD_4096: return 100;
        case ImageResolution.FHD_2048: return 80;
        case ImageResolution.HD_1024: return 60;
        case ImageResolution.SD_512: return 40;
        default: return 40;
      }
    };

    const total = images.reduce((sum, img) => sum + resolutionScore(img.resolution), 0);
    return total / images.length;
  }
}
