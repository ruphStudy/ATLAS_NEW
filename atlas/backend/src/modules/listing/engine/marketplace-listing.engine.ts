import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceMappingFactory } from '@modules/marketplace-listing-mapping/registry/marketplace-mapping.factory';
import { MarketplaceListingMappingRepository } from '@modules/marketplace-listing-mapping/marketplace-listing-mapping.repository';
import {
  UniversalListingInput,
  TransformationResult,
  TransformationStatus,
  ValidationSeverity,
  ICategoryMapping,
  IAttributeMapping,
} from '@modules/marketplace-listing-mapping/interfaces';
import {
  ListingContent,
  ListingPricing,
  ListingImage,
  ListingVariant,
} from '../interfaces';

export interface MarketplaceTransformOptions {
  isDryRun?: boolean;
  country?: string;
  workspaceId?: string;
}

export interface MarketplaceTransformResult {
  marketplaceKey: string;
  country: string;
  isDryRun: boolean;
  transformationResult: TransformationResult;
  schemaVersion: string | null;
}

/**
 * MarketplaceListingEngine
 *
 * Bridges the universal Listing Module with the Marketplace Listing Mapping Foundation.
 * Converts universal ListingContent → UniversalListingInput → MarketplaceTransformResult.
 *
 * No marketplace-specific logic lives here.
 */
@Injectable()
export class MarketplaceListingEngine {
  private readonly logger = new Logger(MarketplaceListingEngine.name);

  constructor(
    private readonly mappingFactory: MarketplaceMappingFactory,
    private readonly mappingRepository: MarketplaceListingMappingRepository,
  ) {}

  async transform(
    universalListingId: string,
    catalogProductId: string,
    content: ListingContent,
    marketplaceKey: string,
    options: MarketplaceTransformOptions = {},
  ): Promise<MarketplaceTransformResult> {
    const { isDryRun = false, country = 'GLOBAL', workspaceId } = options;

    const schemaRaw = await this.mappingRepository.findActiveSchema(
      marketplaceKey,
      country,
      workspaceId,
    );

    const schema = schemaRaw as import('@modules/marketplace-listing-mapping/interfaces').IMarketplaceSchema | null;

    if (!schema) {
      this.logger.warn(
        `No active schema found for marketplace ${marketplaceKey}/${country} — using fallback`,
      );
    }

    const categoryMappings = schema
      ? await this.mappingRepository.findAllCategoryMappingsForResolution(
          marketplaceKey,
          workspaceId,
        )
      : [];

    const attributeMappings = schema
      ? await this.mappingRepository.findAllAttributeMappingsForResolution(
          marketplaceKey,
          country,
          workspaceId,
        )
      : [];

    const input = this.contentToUniversalInput(
      universalListingId,
      catalogProductId,
      workspaceId ?? '',
      content,
    );

    let result: TransformationResult;

    if (!schema) {
      result = {
        listingId: universalListingId,
        workspaceId: workspaceId ?? '',
        marketplaceKey,
        country,
        schemaVersion: '',
        status: TransformationStatus.FAILED,
        payload: {},
        fieldTrace: [],
        warnings: [],
        errors: [{
          field: 'schema',
          code: 'SCHEMA_NOT_FOUND',
          message: `No active schema for ${marketplaceKey}/${country}`,
          severity: ValidationSeverity.ERROR,
          section: null,
        }],
        isDryRun,
        sectionsTransformed: [],
        transformedAt: new Date(),
      };
    } else if (isDryRun) {
      result = this.mappingFactory.createPreview(
        input,
        schema,
        categoryMappings as unknown as ICategoryMapping[],
        attributeMappings as unknown as IAttributeMapping[],
      );
    } else {
      result = this.mappingFactory.createTransformation(
        input,
        schema,
        categoryMappings as unknown as ICategoryMapping[],
        attributeMappings as unknown as IAttributeMapping[],
      );
    }

    return {
      marketplaceKey,
      country,
      isDryRun,
      transformationResult: result,
      schemaVersion: schema?.schemaVersion ?? null,
    };
  }

  async transformMultiple(
    universalListingId: string,
    catalogProductId: string,
    content: ListingContent,
    targets: Array<{ marketplaceKey: string; country?: string }>,
    workspaceId?: string,
  ): Promise<MarketplaceTransformResult[]> {
    const results: MarketplaceTransformResult[] = [];

    for (const target of targets) {
      try {
        const result = await this.transform(
          universalListingId,
          catalogProductId,
          content,
          target.marketplaceKey,
          { country: target.country ?? 'GLOBAL', workspaceId },
        );
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Transformation failed for ${target.marketplaceKey}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return results;
  }

  // ── Private ───────────────────────────────────────────────

  private contentToUniversalInput(
    listingId: string,
    catalogProductId: string,
    workspaceId: string,
    content: ListingContent,
  ): UniversalListingInput {
    return {
      listingId,
      catalogProductId,
      workspaceId,
      title: content.title ?? undefined,
      brand: content.brand ?? undefined,
      category: content.category ?? undefined,
      description: content.description ?? undefined,
      bulletPoints: content.bulletPoints,
      searchTerms: content.searchTerms,
      images: content.images?.map((img: ListingImage) => ({
        id: img.imageId,
        url: img.url,
        isPrimary: img.isPrimary,
        position: img.position,
        format: img.format ?? 'JPEG',
        fileSizeKb: img.fileSizeKb ?? 0,
        width: img.width ?? 0,
        height: img.height ?? 0,
        altText: img.altText ?? undefined,
      })),
      attributes: content.attributes,
      specifications: content.specifications,
      pricingReference: content.pricing
        ? {
            sellingPrice: (content.pricing as ListingPricing).sellingPrice,
            compareAtPrice: (content.pricing as ListingPricing).compareAtPrice ?? undefined,
            currency: (content.pricing as ListingPricing).currency,
          }
        : undefined,
      variants: content.variants?.map((v: ListingVariant) => ({
        id: v.variantId,
        sku: v.sku,
        name: v.name,
        attributes: v.attributes,
        price: v.price ?? undefined,
        stockQty: v.stockQty ?? undefined,
      })),
      seoMetadata: content.seo
        ? {
            metaTitle: content.seo.metaTitle ?? undefined,
            metaDescription: content.seo.metaDescription ?? undefined,
          }
        : undefined,
    };
  }
}
