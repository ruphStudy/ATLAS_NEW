import { IsOptional, IsEnum, IsString, IsArray, IsBoolean } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { CatalogStatus, ProductType } from '../interfaces';

export class CatalogFilterDto extends PaginationDto {
  @IsOptional()
  @IsArray()
  @IsEnum(CatalogStatus, { each: true })
  status?: CatalogStatus[];

  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  procurementId?: string;

  @IsOptional()
  @IsString()
  qualityInspectionId?: string;

  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  @IsOptional()
  @IsString()
  hsCode?: string;

  @IsOptional()
  @IsBoolean()
  isDuplicate?: boolean;
}
