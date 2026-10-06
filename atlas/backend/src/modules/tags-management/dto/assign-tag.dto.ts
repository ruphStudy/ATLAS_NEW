import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { MAX_BULK_TAG_OPERATION_SIZE } from '../constants';

export class AssignTagDto {
  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;
}

export class BulkAssignTagsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_TAG_OPERATION_SIZE)
  @IsString({ each: true })
  tagIds!: string[];

  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;
}

export class BulkRemoveTagsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_TAG_OPERATION_SIZE)
  @IsString({ each: true })
  tagIds!: string[];

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;
}
