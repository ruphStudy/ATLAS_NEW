import { Injectable, Logger } from '@nestjs/common';
import {
  IMarketplaceMappingAdapter,
  IMarketplaceSchema,
  MappingStatus,
  MarketplaceContentRules,
  MarketplaceMediaRequirements,
  MarketplaceVariantRules,
  VariantStructureType,
} from '../interfaces';

@Injectable()
export class MarketplaceMappingRegistry {
  private readonly logger = new Logger(MarketplaceMappingRegistry.name);
  private readonly adapters = new Map<string, IMarketplaceMappingAdapter>();

  register(adapter: IMarketplaceMappingAdapter): void {
    const key = adapter.marketplaceKey.toUpperCase();
    if (this.adapters.has(key)) {
      this.logger.warn(`Marketplace mapping adapter already registered for key: ${key}. Overwriting.`);
    }
    this.adapters.set(key, adapter);
    this.logger.log(`Registered marketplace mapping adapter: ${key}`);
  }

  get(marketplaceKey: string): IMarketplaceMappingAdapter | undefined {
    return this.adapters.get(marketplaceKey.toUpperCase());
  }

  has(marketplaceKey: string): boolean {
    return this.adapters.has(marketplaceKey.toUpperCase());
  }

  getAll(): IMarketplaceMappingAdapter[] {
    return [...this.adapters.values()];
  }

  listKeys(): string[] {
    return [...this.adapters.keys()];
  }

  /**
   * Get the default schema for a given marketplace.
   * Falls back to a generic schema if no adapter is registered.
   */
  getDefaultSchema(
    marketplaceKey: string,
    country: string,
    category?: string,
  ): Partial<IMarketplaceSchema> {
    const adapter = this.get(marketplaceKey);
    if (adapter) {
      return adapter.getDefaultSchema(country, category);
    }

    // Generic fallback
    return {
      marketplaceKey: marketplaceKey.toUpperCase(),
      country,
      locale: 'en-US',
      currency: 'USD',
      schemaVersion: '1.0.0',
      status: MappingStatus.PUBLISHED,
      isDefault: true,
      requiredFields: [],
      optionalFields: [],
      mediaRequirements: this.genericMediaRequirements(),
      variantRules: this.genericVariantRules(),
      contentRules: this.genericContentRules(),
      pricingRequirements: {
        required: true,
        allowedCurrencies: ['USD', 'EUR', 'GBP', 'INR'],
        requiresCompareAtPrice: false,
        requiresShippingPrice: false,
      },
    };
  }

  private genericContentRules(): MarketplaceContentRules {
    return {
      maxTitleLength: 500,
      maxBulletPoints: 10,
      maxBulletLength: 500,
      maxDescriptionLength: 5000,
      htmlInDescription: false,
      maxSearchTerms: 10,
      maxSearchTermLength: 50,
      allowCapitalization: true,
      allowPromotionalText: true,
      allowSpecialChars: true,
      brandInTitle: false,
    };
  }

  private genericMediaRequirements(): MarketplaceMediaRequirements {
    return {
      primaryImage: true,
      minImages: 1,
      maxImages: 10,
      allowedFormats: ['JPEG', 'JPG', 'PNG', 'WEBP'],
      maxFileSizeKb: 10_000,
      minWidth: 500,
      minHeight: 500,
      videoAllowed: false,
      altTextRequired: false,
      variantImagesAllowed: true,
    };
  }

  private genericVariantRules(): MarketplaceVariantRules {
    return {
      supported: true,
      structure: VariantStructureType.STANDALONE,
      maxVariants: 100,
      allowedThemes: [],
      requiresParentSku: false,
      maxAttributesPerVariant: 10,
    };
  }
}
