import { Injectable, Logger } from '@nestjs/common';
import {
  ListingContent,
  ListingImage,
  ListingMarketplace,
  ListingPricing,
  ListingSeoMetadata,
  ListingSection,
  ListingVariant,
} from '../interfaces';

export interface SourceData {
  catalogProduct?: Record<string, unknown> | null;
  aiDescription?: Record<string, unknown> | null;
  aiImageSet?: Record<string, unknown> | null;
  aiSeo?: Record<string, unknown> | null;
  /** @deprecated marketplace is no longer used for content building — kept for backward compat */
  marketplace?: ListingMarketplace;
}

export interface BuildResult {
  content: ListingContent;
}

/**
 * ListingBuilderEngine
 *
 * Assembles UNIVERSAL ListingContent from AI and catalog source records.
 * Content produced here is marketplace-agnostic.
 * Marketplace-specific transformations are performed by the
 * Marketplace Listing Mapping Foundation (MarketplaceMappingFactory).
 */
@Injectable()
export class ListingBuilderEngine {
  private readonly logger = new Logger(ListingBuilderEngine.name);

  build(source: SourceData, sections: ListingSection[]): BuildResult {
    const sectSet = new Set(sections);
    const content: ListingContent = {};

    if (sectSet.has(ListingSection.TITLE)) {
      content.title = this.buildTitle(source);
    }
    if (sectSet.has(ListingSection.BRAND)) {
      content.brand = this.buildBrand(source);
    }
    if (sectSet.has(ListingSection.CATEGORY)) {
      content.category = this.buildCategory(source);
    }
    if (sectSet.has(ListingSection.DESCRIPTION)) {
      content.description = this.buildDescription(source);
    }
    if (sectSet.has(ListingSection.BULLET_POINTS)) {
      content.bulletPoints = this.buildBulletPoints(source);
    }
    if (sectSet.has(ListingSection.IMAGES)) {
      content.images = this.buildImages(source);
    }
    if (sectSet.has(ListingSection.VARIANTS)) {
      content.variants = this.buildVariants(source);
    }
    if (sectSet.has(ListingSection.ATTRIBUTES)) {
      content.attributes = this.buildAttributes(source);
    }
    if (sectSet.has(ListingSection.SPECIFICATIONS)) {
      content.specifications = this.buildSpecifications(source);
    }
    if (sectSet.has(ListingSection.SEARCH_TERMS)) {
      content.searchTerms = this.buildSearchTerms(source);
    }
    if (sectSet.has(ListingSection.PRICING)) {
      content.pricing = this.buildPricing(source);
    }
    if (sectSet.has(ListingSection.SEO)) {
      content.seo = this.buildSeo(source);
    }

    this.logger.log(`Built universal listing content: sections=${sections.join(',')}`);
    return { content };
  }

  private buildTitle(source: SourceData): string | null {
    const seo = source.aiSeo?.['optimizedContent'] as Record<string, unknown> | null;
    if (seo?.['productTitle']) return seo['productTitle'] as string;
    const catalog = source.catalogProduct;
    return (catalog?.['productName'] as string | null) ?? null;
  }

  private buildBrand(source: SourceData): string | null {
    return (source.catalogProduct?.['brand'] as string | null) ?? null;
  }

  private buildCategory(source: SourceData): string | null {
    return (source.catalogProduct?.['category'] as string | null) ?? null;
  }

  private buildDescription(source: SourceData): string | null {
    const desc = source.aiDescription?.['generatedContent'] as Record<string, unknown> | null;
    if (desc?.['mainDescription']) return desc['mainDescription'] as string;
    const seo = source.aiSeo?.['optimizedContent'] as Record<string, unknown> | null;
    if (seo?.['description']) return seo['description'] as string;
    return (source.catalogProduct?.['description'] as string | null) ?? null;
  }

  private buildBulletPoints(source: SourceData): string[] {
    const desc = source.aiDescription?.['generatedContent'] as Record<string, unknown> | null;
    if (Array.isArray(desc?.['bulletPoints'])) return desc!['bulletPoints'] as string[];
    const seo = source.aiSeo?.['optimizedContent'] as Record<string, unknown> | null;
    if (Array.isArray(seo?.['bulletPoints'])) return seo!['bulletPoints'] as string[];
    return [];
  }

  private buildImages(source: SourceData): ListingImage[] {
    const imageSet = source.aiImageSet?.['generatedImages'] as Array<Record<string, unknown>> | null;
    if (!imageSet || imageSet.length === 0) return [];
    return imageSet
      .filter((img) => img['status'] === 'APPROVED' || img['status'] === 'MANUALLY_UPLOADED')
      .map((img, idx) => ({
        imageId: img['imageId'] as string,
        url: img['url'] as string,
        altText: (img['altText'] as string | null) ?? null,
        type: (img['imageType'] as string) ?? 'MAIN',
        isPrimary: idx === 0,
        position: idx + 1,
        format: (img['format'] as string | undefined),
        fileSizeKb: (img['fileSizeKb'] as number | undefined),
        width: (img['width'] as number | undefined),
        height: (img['height'] as number | undefined),
      }));
  }

  private buildVariants(source: SourceData): ListingVariant[] {
    const catalog = source.catalogProduct;
    const variants = catalog?.['variants'] as Array<Record<string, unknown>> | null;
    if (!variants || variants.length === 0) return [];
    return variants.map((v) => ({
      variantId: v['variantId'] as string,
      sku: v['sku'] as string,
      name: v['name'] as string,
      attributes: (v['attributes'] as Record<string, string>) ?? {},
      price: (v['suggestedSellingPrice'] as number | null) ?? null,
      compareAtPrice: null,
      images: (v['images'] as string[]) ?? [],
      stockQty: (v['stockQty'] as number | null) ?? null,
    }));
  }

  private buildAttributes(source: SourceData): Record<string, string> {
    const catalog = source.catalogProduct;
    const attrs = catalog?.['attributes'] as Array<{ name: string; value: string }> | null;
    if (!attrs) return {};
    return Object.fromEntries(attrs.map((a) => [a.name, a.value]));
  }

  private buildSpecifications(source: SourceData): Record<string, string> {
    const catalog = source.catalogProduct;
    const specs = catalog?.['specifications'] as Array<{ name: string; value: string; unit?: string }> | null;
    if (!specs) return {};
    return Object.fromEntries(specs.map((s) => [s.name, s.unit ? `${s.value} ${s.unit}` : s.value]));
  }

  private buildSearchTerms(source: SourceData): string[] {
    const seo = source.aiSeo?.['optimizedContent'] as Record<string, unknown> | null;
    const keywords: string[] = [];
    if (Array.isArray(seo?.['backendSearchTerms'])) keywords.push(...(seo!['backendSearchTerms'] as string[]));
    if (Array.isArray(seo?.['searchKeywords'])) keywords.push(...(seo!['searchKeywords'] as string[]));
    return [...new Set(keywords)];
  }

  private buildPricing(source: SourceData): ListingPricing | null {
    const catalog = source.catalogProduct;
    const sellingPrice =
      (catalog?.['suggestedSellingPrice'] as number | null) ??
      (catalog?.['targetSellingPrice'] as number | null);
    if (!sellingPrice) return null;
    return {
      sellingPrice,
      compareAtPrice: null,
      costPrice: (catalog?.['totalLandedCostUsd'] as number | null) ?? null,
      currency: 'USD',
      marketplaceFeePercent: null,
      estimatedProfit: null,
    };
  }

  private buildSeo(source: SourceData): ListingSeoMetadata | null {
    const seo = source.aiSeo?.['optimizedContent'] as Record<string, unknown> | null;
    if (!seo) return null;
    return {
      metaTitle: (seo['metaTitle'] as string | null) ?? (seo['productTitle'] as string | null) ?? null,
      metaDescription: (seo['metaDescription'] as string | null) ?? (seo['description'] as string | null) ?? null,
      canonicalUrl: (seo['canonicalUrl'] as string | null) ?? null,
      ogTitle: (seo['ogTitle'] as string | null) ?? null,
      ogDescription: (seo['ogDescription'] as string | null) ?? null,
      schema: (seo['schema'] as Record<string, unknown> | null) ?? null,
    };
  }
}


export interface SourceData {
  catalogProduct?: Record<string, unknown> | null;
  aiDescription?: Record<string, unknown> | null;
  aiImageSet?: Record<string, unknown> | null;
  aiSeo?: Record<string, unknown> | null;
  marketplace: ListingMarketplace;
}

export interface BuildResult {
  content: ListingContent;
}

/**
 * Assembles ListingContent from source records.
 * In production, extend each section builder to apply marketplace-specific
 * transformation rules from a template repository.
 */
@Injectable()
export class ListingBuilderEngine {
  private readonly logger = new Logger(ListingBuilderEngine.name);

  build(source: SourceData, sections: ListingSection[]): BuildResult {
    const sectSet = new Set(sections);
    const content: ListingContent = {};

    if (sectSet.has(ListingSection.TITLE)) {
      content.title = this.buildTitle(source);
    }
    if (sectSet.has(ListingSection.BRAND)) {
      content.brand = this.buildBrand(source);
    }
    if (sectSet.has(ListingSection.CATEGORY)) {
      content.category = this.buildCategory(source);
    }
    if (sectSet.has(ListingSection.DESCRIPTION)) {
      content.description = this.buildDescription(source);
    }
    if (sectSet.has(ListingSection.BULLET_POINTS)) {
      content.bulletPoints = this.buildBulletPoints(source);
    }
    if (sectSet.has(ListingSection.IMAGES)) {
      content.images = this.buildImages(source);
    }
    if (sectSet.has(ListingSection.VARIANTS)) {
      content.variants = this.buildVariants(source);
    }
    if (sectSet.has(ListingSection.ATTRIBUTES)) {
      content.attributes = this.buildAttributes(source);
    }
    if (sectSet.has(ListingSection.SPECIFICATIONS)) {
      content.specifications = this.buildSpecifications(source);
    }
    if (sectSet.has(ListingSection.SEARCH_TERMS)) {
      content.searchTerms = this.buildSearchTerms(source);
    }
    if (sectSet.has(ListingSection.PRICING)) {
      content.pricing = this.buildPricing(source);
    }

    this.logger.log(`Built listing content for ${source.marketplace}: sections=${sections.join(',')}`);
    return { content };
  }

  private buildTitle(source: SourceData): string | null {
    // Prefer SEO-optimized title → AI description title → catalog product name
    const seo = source.aiSeo?.['optimizedContent'] as Record<string, unknown> | null;
    if (seo?.['productTitle']) return seo['productTitle'] as string;

    const catalog = source.catalogProduct;
    return (catalog?.['productName'] as string | null) ?? null;
  }

  private buildBrand(source: SourceData): string | null {
    const catalog = source.catalogProduct;
    return (catalog?.['brand'] as string | null) ?? null;
  }

  private buildCategory(source: SourceData): string | null {
    const catalog = source.catalogProduct;
    return (catalog?.['category'] as string | null) ?? null;
  }

  private buildDescription(source: SourceData): string | null {
    const desc = source.aiDescription?.['generatedContent'] as Record<string, unknown> | null;
    if (desc?.['mainDescription']) return desc['mainDescription'] as string;

    const seo = source.aiSeo?.['optimizedContent'] as Record<string, unknown> | null;
    if (seo?.['description']) return seo['description'] as string;

    return (source.catalogProduct?.['description'] as string | null) ?? null;
  }

  private buildBulletPoints(source: SourceData): string[] {
    const desc = source.aiDescription?.['generatedContent'] as Record<string, unknown> | null;
    if (Array.isArray(desc?.['bulletPoints'])) return desc!['bulletPoints'] as string[];

    const seo = source.aiSeo?.['optimizedContent'] as Record<string, unknown> | null;
    if (Array.isArray(seo?.['bulletPoints'])) return seo!['bulletPoints'] as string[];

    return [];
  }

  private buildImages(source: SourceData): ListingImage[] {
    const imageSet = source.aiImageSet?.['generatedImages'] as
      | Array<Record<string, unknown>>
      | null;
    if (!imageSet || imageSet.length === 0) return [];

    return imageSet
      .filter((img) => img['status'] === 'APPROVED' || img['status'] === 'MANUALLY_UPLOADED')
      .map((img, idx) => ({
        imageId: img['imageId'] as string,
        url: img['url'] as string,
        altText: (img['altText'] as string | null) ?? null,
        type: (img['imageType'] as string) ?? 'MAIN',
        isPrimary: idx === 0,
        position: idx + 1,
      }));
  }

  private buildVariants(source: SourceData): ListingVariant[] {
    const catalog = source.catalogProduct;
    const variants = catalog?.['variants'] as Array<Record<string, unknown>> | null;
    if (!variants || variants.length === 0) return [];

    return variants.map((v) => ({
      variantId: v['variantId'] as string,
      sku: v['sku'] as string,
      name: v['name'] as string,
      attributes: (v['attributes'] as Record<string, string>) ?? {},
      price: (v['suggestedSellingPrice'] as number | null) ?? null,
      compareAtPrice: null,
      images: (v['images'] as string[]) ?? [],
      stockQty: (v['stockQty'] as number | null) ?? null,
    }));
  }

  private buildAttributes(source: SourceData): Record<string, string> {
    const catalog = source.catalogProduct;
    const attrs = catalog?.['attributes'] as
      | Array<{ name: string; value: string }>
      | null;
    if (!attrs) return {};
    return Object.fromEntries(attrs.map((a) => [a.name, a.value]));
  }

  private buildSpecifications(source: SourceData): Record<string, string> {
    const catalog = source.catalogProduct;
    const specs = catalog?.['specifications'] as
      | Array<{ name: string; value: string; unit?: string }>
      | null;
    if (!specs) return {};
    return Object.fromEntries(
      specs.map((s) => [s.name, s.unit ? `${s.value} ${s.unit}` : s.value]),
    );
  }

  private buildSearchTerms(source: SourceData): string[] {
    const seo = source.aiSeo?.['optimizedContent'] as Record<string, unknown> | null;
    const keywords: string[] = [];
    if (Array.isArray(seo?.['backendSearchTerms'])) keywords.push(...(seo!['backendSearchTerms'] as string[]));
    if (Array.isArray(seo?.['searchKeywords'])) keywords.push(...(seo!['searchKeywords'] as string[]));
    return [...new Set(keywords)];
  }

  private buildPricing(source: SourceData): ListingPricing | null {
    const catalog = source.catalogProduct;
    const sellingPrice =
      (catalog?.['suggestedSellingPrice'] as number | null) ??
      (catalog?.['targetSellingPrice'] as number | null);
    if (!sellingPrice) return null;

    return {
      sellingPrice,
      compareAtPrice: null,
      costPrice: (catalog?.['totalLandedCostUsd'] as number | null) ?? null,
      currency: 'USD',
      marketplaceFeePercent: null,
      estimatedProfit: null,
    };
  }
}
