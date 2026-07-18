import { Injectable, Logger } from '@nestjs/common';
import { GeneratedContent, GenerationTone, DescriptionSection, FaqItem } from '../interfaces';

interface QualityInput {
  content: GeneratedContent;
  requestedSections: DescriptionSection[];
}

@Injectable()
export class AiQualityScoreEngine {
  private readonly logger = new Logger(AiQualityScoreEngine.name);

  /**
   * Calculates AI Quality Score (0–100) based on:
   *   - Coverage      : % of requested sections actually generated (40%)
   *   - Completeness  : average content length / richness of filled sections (40%)
   *   - Richness      : structured fields presence (20%)
   */
  calculate(input: QualityInput): number {
    const coverage = this.calcCoverage(input);
    const completeness = this.calcCompleteness(input.content);
    const richness = this.calcRichness(input.content);

    const score = Math.round(coverage * 0.4 + completeness * 0.4 + richness * 0.2);
    return Math.max(0, Math.min(100, score));
  }

  private calcCoverage({ content, requestedSections }: QualityInput): number {
    if (requestedSections.length === 0) return 100;
    let filled = 0;
    for (const section of requestedSections) {
      if (this.isSectionFilled(content, section)) filled++;
    }
    return (filled / requestedSections.length) * 100;
  }

  private isSectionFilled(content: GeneratedContent, section: DescriptionSection): boolean {
    switch (section) {
      case DescriptionSection.PRODUCT_TITLE:
        return !!content.productTitle?.trim();
      case DescriptionSection.SHORT_DESCRIPTION:
        return !!content.shortDescription?.trim();
      case DescriptionSection.LONG_DESCRIPTION:
        return !!content.longDescription?.trim();
      case DescriptionSection.BULLET_POINTS:
        return (content.bulletPoints?.length ?? 0) > 0;
      case DescriptionSection.KEY_FEATURES:
        return (content.keyFeatures?.length ?? 0) > 0;
      case DescriptionSection.KEY_BENEFITS:
        return (content.keyBenefits?.length ?? 0) > 0;
      case DescriptionSection.TECHNICAL_SPECIFICATIONS:
        return !!content.technicalSpecifications?.trim();
      case DescriptionSection.PACKAGE_CONTENTS:
        return !!content.packageContents?.trim();
      case DescriptionSection.USAGE_INSTRUCTIONS:
        return !!content.usageInstructions?.trim();
      case DescriptionSection.CARE_INSTRUCTIONS:
        return !!content.careInstructions?.trim();
      case DescriptionSection.WARRANTY_INFORMATION:
        return !!content.warrantyInformation?.trim();
      case DescriptionSection.FAQS:
        return (content.faqs?.length ?? 0) > 0;
      case DescriptionSection.SEARCH_KEYWORDS:
        return (content.searchKeywords?.length ?? 0) > 0;
      case DescriptionSection.BACKEND_SEARCH_TERMS:
        return (content.backendSearchTerms?.length ?? 0) > 0;
      default:
        return false;
    }
  }

  private calcCompleteness(content: GeneratedContent): number {
    const scores: number[] = [];

    if (content.productTitle) scores.push(Math.min(100, (content.productTitle.length / 80) * 100));
    if (content.shortDescription) scores.push(Math.min(100, (content.shortDescription.length / 200) * 100));
    if (content.longDescription) scores.push(Math.min(100, (content.longDescription.length / 1000) * 100));
    if (content.bulletPoints?.length) scores.push(Math.min(100, (content.bulletPoints.length / 6) * 100));
    if (content.keyFeatures?.length) scores.push(Math.min(100, (content.keyFeatures.length / 5) * 100));
    if (content.keyBenefits?.length) scores.push(Math.min(100, (content.keyBenefits.length / 5) * 100));
    if (content.searchKeywords?.length) scores.push(Math.min(100, (content.searchKeywords.length / 10) * 100));
    if (content.faqs?.length) scores.push(Math.min(100, (content.faqs.length / 5) * 100));

    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private calcRichness(content: GeneratedContent): number {
    let score = 0;
    const weights = [
      !!content.productTitle,
      !!content.longDescription,
      (content.faqs?.length ?? 0) > 0,
      (content.searchKeywords?.length ?? 0) > 3,
      !!content.technicalSpecifications,
      !!content.warrantyInformation,
    ];
    const trueCount = weights.filter(Boolean).length;
    score = (trueCount / weights.length) * 100;
    return score;
  }
}
