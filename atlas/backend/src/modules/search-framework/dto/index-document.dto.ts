import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MAX_BULK_INDEX_SIZE } from '../constants';

export class IndexDocumentDto {
  @IsString()
  @IsNotEmpty()
  module!: string;

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  summary?: string;

  /** Additional free-text content to match against — concatenated with title/summary at index time. */
  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsString()
  @IsOptional()
  marketplace?: string;

  @IsString()
  @IsOptional()
  warehouse?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  /** Opaque, owning-module-defined pointer used to navigate to the entity (e.g. { route, params }). */
  @IsObject()
  @IsNotEmpty()
  navigationRef!: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class BulkIndexDto {
  @IsArray()
  @ArrayMaxSize(MAX_BULK_INDEX_SIZE)
  @ValidateNested({ each: true })
  @Type(() => IndexDocumentDto)
  documents!: IndexDocumentDto[];
}
