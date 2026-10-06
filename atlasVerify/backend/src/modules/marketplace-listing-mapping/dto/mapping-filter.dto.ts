import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MappingStatus } from '../interfaces';

export class MappingFilterDto {
  @IsOptional() @IsString()
  marketplaceKey?: string;

  @IsOptional() @IsString()
  country?: string;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsEnum(MappingStatus)
  status?: MappingStatus;

  @IsOptional() @IsString()
  schemaVersion?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  sortBy?: string;

  @IsOptional() @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  limit?: number;

  get skip(): number {
    const p = this.page ?? 1;
    const l = this.limit ?? 20;
    return (p - 1) * l;
  }
}

export class CategoryMappingFilterDto {
  @IsOptional() @IsString()
  universalCategory?: string;

  @IsOptional() @IsString()
  marketplaceKey?: string;

  @IsOptional() @IsString()
  country?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  sortBy?: string;

  @IsOptional() @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  limit?: number;

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}

export class TransformationJobFilterDto {
  @IsOptional() @IsString()
  listingId?: string;

  @IsOptional() @IsString()
  marketplaceKey?: string;

  @IsOptional() @IsString()
  status?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  limit?: number;

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}
