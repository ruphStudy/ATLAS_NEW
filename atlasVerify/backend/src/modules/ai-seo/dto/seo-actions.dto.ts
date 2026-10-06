import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SeoProvider, SeoSection } from '../interfaces';

export class OptimizedContentDto {
  @IsOptional() @IsString() productTitle?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) bulletPoints?: string[];
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) backendSearchTerms?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) searchKeywords?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) brandKeywords?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) categoryKeywords?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) longTailKeywords?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) imageAltText?: string[];
}

export class RegenerateSeoSectionsDto {
  @IsArray()
  @IsEnum(SeoSection, { each: true })
  sections!: SeoSection[];

  @IsOptional()
  @IsEnum(SeoProvider)
  provider?: SeoProvider;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetKeywords?: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ManualSeoEditDto {
  @ValidateNested()
  @Type(() => OptimizedContentDto)
  content!: OptimizedContentDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveSeoDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
