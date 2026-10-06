import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { TransformationSection } from '../interfaces';

export class UniversalProductDto {
  @IsString() id!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() barcode?: string;
}

export class UniversalPricingDto {
  sellingPrice!: number;
  currency!: string;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  taxCode?: string | null;
}

export class TransformListingDto {
  @IsString()
  listingId!: string;

  @IsString()
  marketplaceKey!: string;

  @IsOptional() @IsString()
  country?: string;

  @IsOptional() @IsString()
  schemaVersion?: string;

  @IsOptional() @IsObject()
  input?: Record<string, unknown>;

  @IsOptional() @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(TransformationSection, { each: true })
  sections?: TransformationSection[];

  @IsOptional() @IsObject()
  workspaceOverrides?: Record<string, unknown>;

  @IsOptional() @IsBoolean()
  skipValidation?: boolean;
}

export class ValidateTransformedListingDto {
  @IsObject()
  payload!: Record<string, unknown>;

  @IsString()
  marketplaceKey!: string;

  @IsOptional() @IsString()
  country?: string;

  @IsOptional() @IsString()
  schemaVersion?: string;
}

export class PreviewMappingDto extends TransformListingDto {}
