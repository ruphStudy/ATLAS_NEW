import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  IsUrl,
  Min,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType } from '../interfaces';

export class ProductDimensionsDto {
  @IsNumber() @Min(0) length!: number;
  @IsNumber() @Min(0) width!: number;
  @IsNumber() @Min(0) height!: number;
  @IsEnum(['cm', 'in']) unit!: 'cm' | 'in';
}

export class ProductWeightDto {
  @IsNumber() @Min(0) value!: number;
  @IsEnum(['kg', 'lb', 'g', 'oz']) unit!: 'kg' | 'lb' | 'g' | 'oz';
}

export class PackagingDetailsDto {
  @IsOptional() @IsNumber() @Min(0) unitsPerCarton?: number;
  @IsOptional() @IsNumber() @Min(0) cartonWeight?: number;
  @IsOptional() @ValidateNested() @Type(() => ProductDimensionsDto) cartonDimensions?: ProductDimensionsDto;
  @IsOptional() @IsString() packagingType?: string;
  @IsOptional() @IsNumber() @Min(0) innerBoxQty?: number;
}

export class ProductVariantDto {
  @IsString() variantId!: string;
  @IsString() sku!: string;
  @IsString() name!: string;
  @IsObject() attributes!: Record<string, string>;
  @IsOptional() @IsNumber() @Min(0) purchaseCost?: number;
  @IsOptional() @IsNumber() @Min(0) landedCost?: number;
  @IsOptional() @IsNumber() @Min(0) suggestedSellingPrice?: number;
  @IsOptional() @IsArray() @IsUrl({}, { each: true }) images?: string[];
  @IsOptional() @IsNumber() @Min(0) stockQty?: number;
}

export class ProductSpecificationDto {
  @IsString() key!: string;
  @IsString() value!: string;
  @IsOptional() @IsString() unit?: string;
}

export class ProductAttributeDto {
  @IsString() key!: string;
  @IsString() value!: string;
}

export class CatalogAttachmentDto {
  @IsString() name!: string;
  @IsUrl() url!: string;
  @IsEnum(['image', 'document', 'video']) type!: 'image' | 'document' | 'video';
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class CreateCatalogProductDto {
  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsEnum(ProductType)
  productType!: ProductType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  // Source references
  @IsOptional()
  @IsString()
  procurementId?: string;

  @IsOptional()
  @IsString()
  qualityInspectionId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  // Classification
  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @IsOptional()
  @IsString()
  hsCode?: string;

  // Specifications
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationDto)
  specifications?: ProductSpecificationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes?: ProductAttributeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  // Media
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogAttachmentDto)
  documents?: CatalogAttachmentDto[];

  // Pricing
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  landedCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  suggestedSellingPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  // Physical
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductDimensionsDto)
  dimensions?: ProductDimensionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductWeightDto)
  weight?: ProductWeightDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PackagingDetailsDto)
  packagingDetails?: PackagingDetailsDto;
}
