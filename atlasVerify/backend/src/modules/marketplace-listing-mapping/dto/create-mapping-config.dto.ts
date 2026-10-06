import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { FieldType, MappingStatus, VariantStructureType } from '../interfaces';

// ── Field Definition ──────────────────────────────────────────

export class FieldConditionDto {
  @IsString()
  field!: string;

  @IsString()
  operator!: 'eq' | 'neq' | 'in' | 'nin' | 'exists' | 'not_exists';

  @IsOptional()
  value?: unknown;
}

export class MarketplaceFieldDefinitionDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  mappedFrom?: string;

  @IsEnum(FieldType)
  type!: FieldType;

  @IsString()
  label!: string;

  @IsBoolean()
  required!: boolean;

  @IsOptional()
  @IsNumber()
  maxLength?: number;

  @IsOptional()
  @IsNumber()
  minLength?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedValues?: string[];

  @IsOptional()
  defaultValue?: unknown;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  conditions?: FieldConditionDto[];
}

// ── Media Requirements ────────────────────────────────────────

export class MarketplaceMediaRequirementsDto {
  @IsBoolean()
  primaryImage!: boolean;

  @IsNumber() @Min(0)
  minImages!: number;

  @IsNumber() @Min(1)
  maxImages!: number;

  @IsArray() @IsString({ each: true })
  allowedFormats!: string[];

  @IsNumber() @Min(1)
  maxFileSizeKb!: number;

  @IsNumber() @Min(1)
  minWidth!: number;

  @IsNumber() @Min(1)
  minHeight!: number;

  @IsOptional() @IsNumber()
  maxWidth?: number;

  @IsOptional() @IsNumber()
  maxHeight?: number;

  @IsOptional() @IsBoolean()
  requireWhiteBackground?: boolean;

  @IsBoolean()
  videoAllowed!: boolean;

  @IsOptional() @IsNumber()
  maxVideos?: number;

  @IsBoolean()
  altTextRequired!: boolean;

  @IsBoolean()
  variantImagesAllowed!: boolean;
}

// ── Variant Rules ─────────────────────────────────────────────

export class MarketplaceVariantRulesDto {
  @IsBoolean()
  supported!: boolean;

  @IsEnum(VariantStructureType)
  structure!: VariantStructureType;

  @IsNumber() @Min(1)
  maxVariants!: number;

  @IsArray() @IsString({ each: true })
  allowedThemes!: string[];

  @IsBoolean()
  requiresParentSku!: boolean;

  @IsNumber() @Min(1)
  maxAttributesPerVariant!: number;
}

// ── Content Rules ─────────────────────────────────────────────

export class MarketplaceContentRulesDto {
  @IsNumber() @Min(1)
  maxTitleLength!: number;

  @IsOptional() @IsString()
  titleFormat?: string;

  @IsNumber() @Min(0)
  maxBulletPoints!: number;

  @IsNumber() @Min(1)
  maxBulletLength!: number;

  @IsNumber() @Min(1)
  maxDescriptionLength!: number;

  @IsBoolean()
  htmlInDescription!: boolean;

  @IsNumber() @Min(0)
  maxSearchTerms!: number;

  @IsNumber() @Min(1)
  maxSearchTermLength!: number;

  @IsOptional() @IsArray() @IsString({ each: true })
  restrictedWords?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  prohibitedClaims?: string[];

  @IsBoolean()
  allowCapitalization!: boolean;

  @IsBoolean()
  allowPromotionalText!: boolean;

  @IsBoolean()
  allowSpecialChars!: boolean;

  @IsBoolean()
  brandInTitle!: boolean;

  @IsOptional() @IsString()
  locale?: string;
}

// ── Pricing Requirements ──────────────────────────────────────

export class MarketplacePricingRequirementsDto {
  @IsBoolean()
  required!: boolean;

  @IsArray() @IsString({ each: true })
  allowedCurrencies!: string[];

  @IsOptional() @IsNumber()
  minPrice?: number;

  @IsOptional() @IsNumber()
  maxPrice?: number;

  @IsBoolean()
  requiresCompareAtPrice!: boolean;

  @IsBoolean()
  requiresShippingPrice!: boolean;
}

// ── Create Schema ─────────────────────────────────────────────

export class CreateMarketplaceSchemaDto {
  @IsString()
  marketplaceKey!: string;

  @IsOptional() @IsString()
  country?: string;

  @IsOptional() @IsString()
  region?: string;

  @IsOptional() @IsString()
  locale?: string;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  schemaVersion?: string;

  @IsOptional() @IsEnum(MappingStatus)
  status?: MappingStatus;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;

  @IsOptional() @IsArray()
  requiredFields?: MarketplaceFieldDefinitionDto[];

  @IsOptional() @IsArray()
  optionalFields?: MarketplaceFieldDefinitionDto[];

  @IsOptional() @IsObject()
  mediaRequirements?: MarketplaceMediaRequirementsDto;

  @IsOptional() @IsObject()
  variantRules?: MarketplaceVariantRulesDto;

  @IsOptional() @IsObject()
  contentRules?: MarketplaceContentRulesDto;

  @IsOptional() @IsObject()
  pricingRequirements?: MarketplacePricingRequirementsDto;

  @IsOptional() @IsDateString()
  effectiveFrom?: string;

  @IsOptional() @IsDateString()
  effectiveTo?: string;
}

export class UpdateMarketplaceSchemaDto extends CreateMarketplaceSchemaDto {}

// ── Create Mapping Config ─────────────────────────────────────

export class CreateMappingConfigDto {
  @IsString()
  marketplaceKey!: string;

  @IsOptional() @IsString()
  country?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsString()
  schemaVersion?: string;

  @IsOptional() @IsEnum(MappingStatus)
  status?: MappingStatus;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;

  @IsOptional() @IsObject()
  overrides?: Record<string, unknown>;

  @IsOptional() @IsDateString()
  effectiveFrom?: string;

  @IsOptional() @IsDateString()
  effectiveTo?: string;
}

export class PublishMappingConfigDto {
  @IsOptional() @IsString()
  changeNote?: string;
}

export class RollbackMappingConfigDto {
  @IsNumber() @Min(1)
  targetVersion!: number;

  @IsOptional() @IsString()
  reason?: string;
}

// ── Category Mapping ──────────────────────────────────────────

export class CreateCategoryMappingDto {
  @IsString()
  universalCategory!: string;

  @IsString()
  marketplaceKey!: string;

  @IsOptional() @IsString()
  country?: string;

  @IsString()
  marketplaceCategory!: string;

  @IsOptional() @IsString()
  marketplaceCategoryId?: string;

  @IsOptional() @IsString()
  categoryPath?: string;

  @IsOptional() @IsNumber() @Min(0) @Max(100)
  confidence?: number;

  @IsOptional() @IsBoolean()
  isManualOverride?: boolean;
}

export class UpdateCategoryMappingDto extends CreateCategoryMappingDto {}

// ── Attribute Mapping ─────────────────────────────────────────

export class CreateAttributeMappingDto {
  @IsString()
  marketplaceKey!: string;

  @IsOptional() @IsString()
  country?: string;

  @IsString()
  universalAttribute!: string;

  @IsString()
  marketplaceAttribute!: string;

  @IsString()
  transformType!: string;

  @IsOptional() @IsObject()
  valueMapping?: Record<string, unknown>;

  @IsOptional() @IsObject()
  unitConversion?: Record<string, unknown>;

  @IsOptional()
  defaultValue?: unknown;

  @IsOptional() @IsBoolean()
  isRequired?: boolean;

  @IsOptional() @IsBoolean()
  isManualOverride?: boolean;

  @IsOptional() @IsArray()
  conditions?: FieldConditionDto[];

  @IsOptional() @IsString()
  derivedExpression?: string;
}

export class UpdateAttributeMappingDto extends CreateAttributeMappingDto {}
