import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  ArrayMaxSize,
} from 'class-validator';
import { FileCategory } from '../interfaces';

export class UploadFileDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  /** Base64-encoded file content — mirrors NotificationAttachmentDto.contentBase64. */
  @IsString()
  @IsNotEmpty()
  contentBase64: string;

  /** Client-computed sha256 checksum, cross-validated against the server-computed one when provided. */
  @IsString()
  @IsOptional()
  checksum?: string;

  @IsEnum(FileCategory)
  @IsOptional()
  category?: FileCategory;

  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  folderId?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
