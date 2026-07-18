import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiProvider, DescriptionSection, GenerationTone } from '../interfaces';

export class FaqItemDto {
  @IsString() question!: string;
  @IsString() answer!: string;
}

export class GeneratedContentDto {
  @IsOptional() @IsString() productTitle?: string;
  @IsOptional() @IsString() shortDescription?: string;
  @IsOptional() @IsString() longDescription?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) bulletPoints?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) keyFeatures?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) keyBenefits?: string[];
  @IsOptional() @IsString() technicalSpecifications?: string;
  @IsOptional() @IsString() packageContents?: string;
  @IsOptional() @IsString() usageInstructions?: string;
  @IsOptional() @IsString() careInstructions?: string;
  @IsOptional() @IsString() warrantyInformation?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => FaqItemDto) faqs?: FaqItemDto[];
  @IsOptional() @IsArray() @IsString({ each: true }) searchKeywords?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) backendSearchTerms?: string[];
}

export class CreateAiDescriptionDto {
  @IsString()
  catalogProductId!: string;

  @IsEnum(AiProvider)
  provider!: AiProvider;

  @IsOptional()
  @IsString()
  model?: string;

  @IsEnum(GenerationTone)
  tone!: GenerationTone;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  promptTemplateId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(DescriptionSection, { each: true })
  sections?: DescriptionSection[];
}
