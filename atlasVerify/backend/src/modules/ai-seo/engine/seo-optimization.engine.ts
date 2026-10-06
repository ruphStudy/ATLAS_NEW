import { Injectable, Logger } from '@nestjs/common';
import {
  OptimizedContent,
  SeoProvider,
  SeoSection,
} from '../interfaces';
import { AI_SEO_CONSTANTS } from '../constants';

export interface SeoOptimizationContext {
  productName: string;
  brand?: string;
  category?: string;
  description?: string;
  existingContent?: OptimizedContent;
  marketplace?: string;
}

export interface SeoOptimizationResult {
  optimizedContent: OptimizedContent;
  tokensUsed: number;
  model: string;
}

/**
 * Prompt builder + provider adapter.
 * Replace the mock stub with real provider SDK calls in production.
 */
@Injectable()
export class SeoOptimizationEngine {
  private readonly logger = new Logger(SeoOptimizationEngine.name);

  async optimize(
    provider: SeoProvider,
    model: string,
    sections: SeoSection[],
    context: SeoOptimizationContext,
    targetKeywords: string[],
  ): Promise<SeoOptimizationResult> {
    const prompt = this.buildPrompt(sections, context, targetKeywords);
    this.logger.log(
      `Optimizing SEO via ${provider}/${model} for sections: ${sections.join(', ')}`,
    );

    // In production, call the real provider SDK here.
    const optimizedContent = this.buildMockContent(sections, context, targetKeywords);

    return {
      optimizedContent,
      tokensUsed: Math.round(prompt.length / 4),
      model,
    };
  }

  buildPrompt(
    sections: SeoSection[],
    context: SeoOptimizationContext,
    targetKeywords: string[],
  ): string {
    const limits = context.marketplace
      ? AI_SEO_CONSTANTS.MARKETPLACE_LIMITS[context.marketplace.toUpperCase()] ?? {}
      : {};

    const sectionInstructions = sections.map((s) => this.sectionInstruction(s, limits)).join('\n');
    const keywordList = targetKeywords.length > 0
      ? `Target keywords: ${targetKeywords.join(', ')}`
      : '';

    return [
      `You are an expert marketplace SEO copywriter.`,
      context.marketplace ? `Marketplace: ${context.marketplace}` : '',
      `Product: ${context.productName}`,
      context.brand ? `Brand: ${context.brand}` : '',
      context.category ? `Category: ${context.category}` : '',
      keywordList,
      ``,
      `Optimize the following sections as a JSON object:`,
      sectionInstructions,
    ].filter(Boolean).join('\n');
  }

  private sectionInstruction(section: SeoSection, limits: Record<string, number>): string {
    const map: Record<SeoSection, string> = {
      [SeoSection.PRODUCT_TITLE]: `- productTitle: SEO-optimized title${limits['PRODUCT_TITLE'] ? ` (max ${limits['PRODUCT_TITLE']} chars)` : ''}`,
      [SeoSection.BULLET_POINTS]: `- bulletPoints: Array of 5–7 SEO bullet points${limits['BULLET_POINTS_EACH'] ? ` (max ${limits['BULLET_POINTS_EACH']} chars each)` : ''}`,
      [SeoSection.DESCRIPTION]: `- description: SEO-optimized description${limits['DESCRIPTION'] ? ` (max ${limits['DESCRIPTION']} chars)` : ''}`,
      [SeoSection.BACKEND_SEARCH_TERMS]: `- backendSearchTerms: Array of backend search terms${limits['BACKEND_SEARCH_TERMS'] ? ` (total max ${limits['BACKEND_SEARCH_TERMS']} chars)` : ''}`,
      [SeoSection.SEARCH_KEYWORDS]: `- searchKeywords: Array of 8–15 primary search keywords`,
      [SeoSection.BRAND_KEYWORDS]: `- brandKeywords: Array of 5–10 brand-related keywords`,
      [SeoSection.CATEGORY_KEYWORDS]: `- categoryKeywords: Array of 5–10 category keywords`,
      [SeoSection.LONG_TAIL_KEYWORDS]: `- longTailKeywords: Array of 10–20 long-tail keyword phrases`,
      [SeoSection.IMAGE_ALT_TEXT]: `- imageAltText: Array of SEO alt text strings for product images`,
    };
    return map[section] ?? `- ${section}: Optimize this section`;
  }

  private buildMockContent(
    sections: SeoSection[],
    ctx: SeoOptimizationContext,
    targetKeywords: string[],
  ): OptimizedContent {
    const content: OptimizedContent = {};
    const primaryKeyword = targetKeywords[0] ?? ctx.productName;

    for (const section of sections) {
      switch (section) {
        case SeoSection.PRODUCT_TITLE:
          content.productTitle = `${ctx.brand ? ctx.brand + ' ' : ''}${ctx.productName} – ${primaryKeyword}`;
          break;
        case SeoSection.BULLET_POINTS:
          content.bulletPoints = [
            `✓ Premium ${ctx.productName} for superior performance`,
            `✓ ${primaryKeyword} designed for maximum efficiency`,
            `✓ Trusted by thousands of customers worldwide`,
            `✓ Compatible with all standard configurations`,
            `✓ Backed by manufacturer warranty`,
          ];
          break;
        case SeoSection.DESCRIPTION:
          content.description = ctx.description ?? `Discover the premium ${ctx.productName}. ${primaryKeyword} solution built for quality and durability.`;
          break;
        case SeoSection.BACKEND_SEARCH_TERMS:
          content.backendSearchTerms = [primaryKeyword, ctx.productName, ctx.brand ?? '', ctx.category ?? ''].filter(Boolean);
          break;
        case SeoSection.SEARCH_KEYWORDS:
          content.searchKeywords = [primaryKeyword, ctx.productName, ...(targetKeywords.slice(1, 5))];
          break;
        case SeoSection.BRAND_KEYWORDS:
          content.brandKeywords = ctx.brand ? [`${ctx.brand}`, `${ctx.brand} ${ctx.productName}`] : [ctx.productName];
          break;
        case SeoSection.CATEGORY_KEYWORDS:
          content.categoryKeywords = [ctx.category ?? ctx.productName, `best ${ctx.category ?? ctx.productName}`];
          break;
        case SeoSection.LONG_TAIL_KEYWORDS:
          content.longTailKeywords = [
            `best ${primaryKeyword} for sale`,
            `buy ${primaryKeyword} online`,
            `${primaryKeyword} with free shipping`,
            `affordable ${ctx.productName}`,
            `${ctx.productName} review`,
          ];
          break;
        case SeoSection.IMAGE_ALT_TEXT:
          content.imageAltText = [
            `${ctx.productName} main product image`,
            `${primaryKeyword} white background`,
            `${ctx.brand ? ctx.brand + ' ' : ''}${ctx.productName} lifestyle`,
          ];
          break;
      }
    }
    return content;
  }

  defaultModel(provider: SeoProvider): string {
    const key = `DEFAULT_MODEL_${provider}` as keyof typeof AI_SEO_CONSTANTS;
    return (AI_SEO_CONSTANTS[key] as string | undefined) ?? 'gpt-4o';
  }
}
