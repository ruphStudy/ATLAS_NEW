import { Injectable, Logger } from '@nestjs/common';
import {
  IMarketplaceSchema,
  ICategoryMapping,
  IAttributeMapping,
  UniversalListingInput,
  TransformationResult,
  TransformationOptions,
  TransformationStatus,
  TransformationSection,
  FieldTrace,
  TransformationIssue,
  ValidationSeverity,
  AttributeTransformType,
} from '../interfaces';
import { CategoryMappingEngine } from './category-mapping.engine';
import { AttributeMappingEngine } from './attribute-mapping.engine';
import { VariantMappingEngine } from './variant-mapping.engine';
import { ContentRuleEngine } from './content-rule.engine';
import { MediaMappingEngine } from './media-mapping.engine';
import { ValidationRuleEngine } from './validation-rule.engine';
import { MAPPING_ERROR_CODES, MARKETPLACE_MAPPING_CONSTANTS } from '../constants';

const ALL_SECTIONS = Object.values(TransformationSection);

@Injectable()
export class TransformationEngine {
  private readonly logger = new Logger(TransformationEngine.name);

  constructor(
    private readonly categoryEngine: CategoryMappingEngine,
    private readonly attributeEngine: AttributeMappingEngine,
    private readonly variantEngine: VariantMappingEngine,
    private readonly contentEngine: ContentRuleEngine,
    private readonly mediaEngine: MediaMappingEngine,
    private readonly validationEngine: ValidationRuleEngine,
  ) {}

  /**
   * Full transformation – universal listing → marketplace-ready payload.
   */
  transform(
    input: UniversalListingInput,
    schema: IMarketplaceSchema,
    categoryMappings: ICategoryMapping[],
    attributeMappings: IAttributeMapping[],
    options: TransformationOptions = {},
  ): TransformationResult {
    const sections = options.sections ?? ALL_SECTIONS;
    const trace: FieldTrace[] = [];
    const warnings: TransformationIssue[] = [];
    const errors: TransformationIssue[] = [];
    const payload: Record<string, unknown> = {};

    try {
      // ── Title ──────────────────────────────────────────────
      if (sections.includes(TransformationSection.TITLE)) {
        const contentResult = this.contentEngine.applyRules(
          {
            title: input.title ?? null,
            description: null,
            bulletPoints: [],
            searchTerms: [],
            brand: input.brand ?? null,
          },
          schema.contentRules,
        );
        if (contentResult.title !== null) {
          payload['title'] = contentResult.title;
          trace.push({
            marketplaceField: 'title',
            universalSource: 'title',
            transformType: AttributeTransformType.DIRECT,
            originalValue: input.title,
            transformedValue: contentResult.title,
            section: TransformationSection.TITLE,
          });
        }
        warnings.push(...contentResult.warnings.map((w) => ({
          ...w, section: TransformationSection.TITLE,
        })));
        errors.push(...contentResult.errors.map((e) => ({
          ...e, section: TransformationSection.TITLE,
        })));
      }

      // ── Brand ──────────────────────────────────────────────
      if (sections.includes(TransformationSection.BRAND) && input.brand) {
        payload['brand'] = input.brand;
        trace.push({
          marketplaceField: 'brand',
          universalSource: 'brand',
          transformType: AttributeTransformType.DIRECT,
          originalValue: input.brand,
          transformedValue: input.brand,
          section: TransformationSection.BRAND,
        });
      }

      // ── Category ───────────────────────────────────────────
      if (sections.includes(TransformationSection.CATEGORY) && input.category) {
        const resolved = this.categoryEngine.resolve(
          input.category,
          schema.marketplaceKey,
          schema.country,
          categoryMappings,
          input.workspaceId,
        );

        if (resolved.marketplaceCategory) {
          payload['category'] = resolved.marketplaceCategory;
          if (resolved.marketplaceCategoryId) {
            payload['categoryId'] = resolved.marketplaceCategoryId;
          }
          trace.push({
            marketplaceField: 'category',
            universalSource: 'category',
            transformType: AttributeTransformType.ENUM_MAP,
            originalValue: input.category,
            transformedValue: resolved.marketplaceCategory,
            section: TransformationSection.CATEGORY,
          });
        } else {
          warnings.push({
            field: 'category',
            code: MAPPING_ERROR_CODES.CATEGORY_MAPPING_MISSING,
            message: `No category mapping found for "${input.category}" in ${schema.marketplaceKey}`,
            severity: ValidationSeverity.WARNING,
            section: TransformationSection.CATEGORY,
          });
        }
      }

      // ── Description + Bullet Points + Search Terms ─────────
      if (
        sections.includes(TransformationSection.DESCRIPTION) ||
        sections.includes(TransformationSection.BULLET_POINTS) ||
        sections.includes(TransformationSection.SEARCH_TERMS)
      ) {
        const contentResult = this.contentEngine.applyRules(
          {
            title: null,
            description: input.description ?? null,
            bulletPoints: input.bulletPoints ?? [],
            searchTerms: input.searchTerms ?? [],
            brand: input.brand ?? null,
          },
          schema.contentRules,
        );

        if (sections.includes(TransformationSection.DESCRIPTION) && contentResult.description !== null) {
          payload['description'] = contentResult.description;
          trace.push({
            marketplaceField: 'description',
            universalSource: 'description',
            transformType: AttributeTransformType.DIRECT,
            originalValue: input.description,
            transformedValue: contentResult.description,
            section: TransformationSection.DESCRIPTION,
          });
        }

        if (sections.includes(TransformationSection.BULLET_POINTS) && contentResult.bulletPoints.length > 0) {
          payload['bulletPoints'] = contentResult.bulletPoints;
          trace.push({
            marketplaceField: 'bulletPoints',
            universalSource: 'bulletPoints',
            transformType: AttributeTransformType.DIRECT,
            originalValue: input.bulletPoints,
            transformedValue: contentResult.bulletPoints,
            section: TransformationSection.BULLET_POINTS,
          });
        }

        if (sections.includes(TransformationSection.SEARCH_TERMS) && contentResult.searchTerms.length > 0) {
          payload['searchTerms'] = contentResult.searchTerms;
          trace.push({
            marketplaceField: 'searchTerms',
            universalSource: 'searchTerms',
            transformType: AttributeTransformType.DIRECT,
            originalValue: input.searchTerms,
            transformedValue: contentResult.searchTerms,
            section: TransformationSection.SEARCH_TERMS,
          });
        }

        warnings.push(...contentResult.warnings.map((w) => ({ ...w, section: TransformationSection.DESCRIPTION })));
        errors.push(...contentResult.errors.map((e) => ({ ...e, section: TransformationSection.DESCRIPTION })));
      }

      // ── Images + Videos ────────────────────────────────────
      if (
        sections.includes(TransformationSection.IMAGES) ||
        sections.includes(TransformationSection.VIDEOS)
      ) {
        const mediaResult = this.mediaEngine.buildMediaPayload(
          input.images ?? [],
          input.videos ?? [],
          schema.mediaRequirements,
        );

        if (sections.includes(TransformationSection.IMAGES)) {
          payload['images'] = mediaResult.images;
          trace.push({
            marketplaceField: 'images',
            universalSource: 'images',
            transformType: AttributeTransformType.DIRECT,
            originalValue: (input.images ?? []).map((i) => i.url),
            transformedValue: mediaResult.images.map((i) => i.url),
            section: TransformationSection.IMAGES,
          });
        }

        if (sections.includes(TransformationSection.VIDEOS)) {
          payload['videos'] = mediaResult.videos;
        }

        warnings.push(...mediaResult.warnings.map((w) => ({ ...w, section: TransformationSection.IMAGES })));
        errors.push(...mediaResult.errors.map((e) => ({ ...e, section: TransformationSection.IMAGES })));
      }

      // ── Variants ───────────────────────────────────────────
      if (sections.includes(TransformationSection.VARIANTS) && (input.variants?.length ?? 0) > 0) {
        const parentSku = input.product?.sku ?? null;
        const variantResult = this.variantEngine.mapVariants(
          input.variants!,
          schema.variantRules,
          parentSku,
        );

        payload['variants'] = variantResult.variants;
        if (variantResult.parentRecord) {
          payload['parentVariantRecord'] = variantResult.parentRecord;
        }

        trace.push({
          marketplaceField: 'variants',
          universalSource: 'variants',
          transformType: AttributeTransformType.DIRECT,
          originalValue: input.variants!.map((v) => v.sku),
          transformedValue: variantResult.variants.map((v) => v.childSku),
          section: TransformationSection.VARIANTS,
        });

        warnings.push(...variantResult.warnings.map((w) => ({ ...w, section: TransformationSection.VARIANTS })));
      }

      // ── Attributes + Specifications ────────────────────────
      if (
        sections.includes(TransformationSection.ATTRIBUTES) ||
        sections.includes(TransformationSection.SPECIFICATIONS)
      ) {
        const combinedAttrs: Record<string, unknown> = {
          ...(input.attributes ?? {}),
          ...(input.specifications ?? {}),
        };

        const { resolved, unsupported, warnings: attrWarnings } =
          this.attributeEngine.resolveAttributes(combinedAttrs, attributeMappings, input.workspaceId);

        const attrPayload: Record<string, unknown> = {};
        for (const r of resolved) {
          attrPayload[r.marketplaceAttribute] = r.value;
          trace.push({
            marketplaceField: r.marketplaceAttribute,
            universalSource: r.sourceAttribute,
            transformType: r.transformType,
            originalValue: r.originalValue,
            transformedValue: r.value,
            section: TransformationSection.ATTRIBUTES,
          });
        }

        payload['attributes'] = attrPayload;

        for (const u of unsupported) {
          warnings.push({
            field: u,
            code: MAPPING_ERROR_CODES.ATTRIBUTE_UNMAPPED,
            message: `Attribute "${u}" has no marketplace mapping and will be excluded`,
            severity: ValidationSeverity.INFO,
            section: TransformationSection.ATTRIBUTES,
          });
        }

        warnings.push(...attrWarnings.map((w) => ({ ...w, section: TransformationSection.ATTRIBUTES })));
      }

      // ── Pricing ────────────────────────────────────────────
      if (sections.includes(TransformationSection.PRICING) && input.pricingReference) {
        const pr = input.pricingReference;
        payload['price'] = pr.sellingPrice;
        payload['currency'] = pr.currency;
        if (pr.compareAtPrice !== null && pr.compareAtPrice !== undefined) {
          payload['compareAtPrice'] = pr.compareAtPrice;
        }
        trace.push({
          marketplaceField: 'price',
          universalSource: 'pricingReference.sellingPrice',
          transformType: AttributeTransformType.DIRECT,
          originalValue: pr.sellingPrice,
          transformedValue: pr.sellingPrice,
          section: TransformationSection.PRICING,
        });
      }

      // ── Dimensions + Weight + Packaging ───────────────────
      if (sections.includes(TransformationSection.DIMENSIONS) && input.dimensions) {
        payload['dimensions'] = {
          length: input.dimensions.length,
          width: input.dimensions.width,
          height: input.dimensions.height,
          unit: input.dimensions.unit,
        };
      }

      if (sections.includes(TransformationSection.WEIGHT) && input.weight) {
        payload['weight'] = { value: input.weight.value, unit: input.weight.unit };
      }

      if (sections.includes(TransformationSection.PACKAGING) && input.packaging) {
        payload['packaging'] = {
          type: input.packaging.type ?? null,
          unitsPerPack: input.packaging.unitsPerPack ?? null,
        };
      }

      // ── Compliance ─────────────────────────────────────────
      if (sections.includes(TransformationSection.COMPLIANCE) && input.compliance) {
        payload['compliance'] = {
          certifications: input.compliance.certifications ?? [],
          countryOfOrigin: input.compliance.countryOfOrigin ?? null,
          hazmatCategory: input.compliance.hazmatCategory ?? null,
        };
      }

      // ── Validation (unless skipped or dry-run) ────────────
      const hasErrors = errors.filter((e) => e.severity === ValidationSeverity.ERROR).length > 0;
      const status = hasErrors ? TransformationStatus.PARTIAL : TransformationStatus.COMPLETED;

      if (!options.skipValidation) {
        const validationResult = this.validationEngine.validate(payload, schema);
        for (const e of validationResult.errors) {
          errors.push({ ...e, section: null });
        }
        for (const w of validationResult.warnings) {
          warnings.push({ ...w, section: null });
        }
      }

      return {
        listingId: input.listingId,
        workspaceId: input.workspaceId,
        marketplaceKey: schema.marketplaceKey,
        country: schema.country,
        schemaVersion: schema.schemaVersion,
        status,
        payload,
        fieldTrace: trace,
        warnings,
        errors,
        isDryRun: options.dryRun ?? false,
        sectionsTransformed: sections,
        transformedAt: new Date(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown transformation error';
      this.logger.error(`Transformation failed for listing ${input.listingId}: ${message}`);
      return {
        listingId: input.listingId,
        workspaceId: input.workspaceId,
        marketplaceKey: schema.marketplaceKey,
        country: schema.country,
        schemaVersion: schema.schemaVersion,
        status: TransformationStatus.FAILED,
        payload: {},
        fieldTrace: trace,
        warnings,
        errors: [
          ...errors,
          {
            field: 'transformation',
            code: 'TRANSFORMATION_FAILED',
            message,
            severity: ValidationSeverity.ERROR,
            section: null,
          },
        ],
        isDryRun: options.dryRun ?? false,
        sectionsTransformed: [],
        transformedAt: new Date(),
      };
    }
  }

  /**
   * Dry-run: same as transform but marks result as dry-run (no persistence).
   */
  dryRun(
    input: UniversalListingInput,
    schema: IMarketplaceSchema,
    categoryMappings: ICategoryMapping[],
    attributeMappings: IAttributeMapping[],
    options: TransformationOptions = {},
  ): TransformationResult {
    return this.transform(input, schema, categoryMappings, attributeMappings, {
      ...options,
      dryRun: true,
    });
  }

  /**
   * Preview: dry-run + skip persistence side-effects.
   */
  preview(
    input: UniversalListingInput,
    schema: IMarketplaceSchema,
    categoryMappings: ICategoryMapping[],
    attributeMappings: IAttributeMapping[],
  ): TransformationResult {
    return this.dryRun(input, schema, categoryMappings, attributeMappings, {
      skipValidation: false,
    });
  }
}
