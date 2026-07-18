import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MarketplaceMappingRegistry } from './marketplace-mapping.registry';
import { TransformationEngine } from '../engines/transformation.engine';
import { ValidationRuleEngine } from '../engines/validation-rule.engine';
import {
  IMarketplaceSchema,
  ICategoryMapping,
  IAttributeMapping,
  UniversalListingInput,
  TransformationResult,
  MarketplaceValidationResult,
  TransformationOptions,
} from '../interfaces';

@Injectable()
export class MarketplaceMappingFactory {
  private readonly logger = new Logger(MarketplaceMappingFactory.name);

  constructor(
    private readonly registry: MarketplaceMappingRegistry,
    private readonly transformationEngine: TransformationEngine,
    private readonly validationEngine: ValidationRuleEngine,
  ) {}

  /**
   * Create a transformation for the given input + resolved schema + mappings.
   * Raises NotFoundException if the schema is not provided.
   */
  createTransformation(
    input: UniversalListingInput,
    schema: IMarketplaceSchema,
    categoryMappings: ICategoryMapping[],
    attributeMappings: IAttributeMapping[],
    options: TransformationOptions = {},
  ): TransformationResult {
    this.logger.log(
      `Creating transformation for listing ${input.listingId} → ${schema.marketplaceKey} (${schema.country})`,
    );

    return this.transformationEngine.transform(
      input,
      schema,
      categoryMappings,
      attributeMappings,
      options,
    );
  }

  /**
   * Create a dry-run preview transformation.
   */
  createPreview(
    input: UniversalListingInput,
    schema: IMarketplaceSchema,
    categoryMappings: ICategoryMapping[],
    attributeMappings: IAttributeMapping[],
  ): TransformationResult {
    return this.transformationEngine.preview(input, schema, categoryMappings, attributeMappings);
  }

  /**
   * Validate an already-transformed payload against the given schema.
   */
  validate(
    payload: Record<string, unknown>,
    schema: IMarketplaceSchema,
  ): MarketplaceValidationResult {
    return this.validationEngine.validate(payload, schema);
  }

  /**
   * Get the default schema partial from the registry for a given marketplace key.
   */
  getDefaultSchemaPartial(
    marketplaceKey: string,
    country: string,
    category?: string,
  ): Partial<IMarketplaceSchema> {
    return this.registry.getDefaultSchema(marketplaceKey, country, category);
  }

  /**
   * Check if a marketplace adapter is registered.
   */
  isMarketplaceSupported(marketplaceKey: string): boolean {
    return this.registry.has(marketplaceKey);
  }

  /**
   * List all registered marketplace keys.
   */
  listSupportedMarketplaces(): string[] {
    return this.registry.listKeys();
  }
}
