import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { SeoProvider, SeoSection } from '../interfaces';

export class CreateSeoOptimizationDto {
  @IsString()
  catalogProductId!: string;

  @IsEnum(SeoProvider)
  provider!: SeoProvider;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  marketplace?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetKeywords?: string[];

  @IsOptional()
  @IsString()
  promptTemplateId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(SeoSection, { each: true })
  sections?: SeoSection[];
}
