import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AiImageProvider,
  AspectRatio,
  ImageResolution,
  ImageStyle,
  ImageType,
} from '../interfaces';

export class BatchImageRequestDto {
  @IsEnum(ImageType)
  imageType!: ImageType;

  @IsEnum(ImageStyle)
  style!: ImageStyle;

  @IsEnum(AspectRatio)
  aspectRatio!: AspectRatio;

  @IsEnum(ImageResolution)
  resolution!: ImageResolution;

  @IsOptional()
  @IsString()
  promptOverride?: string;

  @IsOptional()
  @IsString()
  variantId?: string;
}

export class CreateAiImageSetDto {
  @IsString()
  catalogProductId!: string;

  @IsEnum(AiImageProvider)
  provider!: AiImageProvider;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  promptTemplateId?: string;

  @IsOptional()
  @IsString()
  basePrompt?: string;

  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchImageRequestDto)
  requests?: BatchImageRequestDto[];
}
