import {
  IsOptional,
  IsArray,
  IsEnum,
  IsString,
} from 'class-validator';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DescriptionSection, GenerationTone, AiProvider } from '../interfaces';
import { GeneratedContentDto } from './create-ai-description.dto';

export class RegenerateSectionsDto {
  @IsArray()
  @IsEnum(DescriptionSection, { each: true })
  sections!: DescriptionSection[];

  @IsOptional()
  @IsEnum(AiProvider)
  provider?: AiProvider;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsEnum(GenerationTone)
  tone?: GenerationTone;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ManualEditDto {
  @ValidateNested()
  @Type(() => GeneratedContentDto)
  content!: GeneratedContentDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveDescriptionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
