import { IsString, IsOptional, IsEnum, IsArray, IsObject, IsDateString, ArrayMaxSize } from 'class-validator';
import { DocumentType } from '../interfaces';

export class UpdateDocumentDto {
  @IsEnum(DocumentType)
  @IsOptional()
  documentType?: DocumentType;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
