import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUrl,
  IsBoolean,
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
import { BatchImageRequestDto } from './create-ai-image.dto';

export class RegenerateImagesDto {
  @IsArray()
  @IsEnum(ImageType, { each: true })
  imageTypes!: ImageType[];

  @IsOptional()
  @IsEnum(AiImageProvider)
  provider?: AiImageProvider;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchImageRequestDto)
  requests?: BatchImageRequestDto[];

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ManualUploadImageDto {
  @IsString()
  imageId!: string;

  @IsEnum(ImageType)
  imageType!: ImageType;

  @IsUrl()
  url!: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsEnum(ImageStyle)
  style!: ImageStyle;

  @IsEnum(AspectRatio)
  aspectRatio!: AspectRatio;

  @IsEnum(ImageResolution)
  resolution!: ImageResolution;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveImageDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approvedImageIds?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveAllImagesDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
