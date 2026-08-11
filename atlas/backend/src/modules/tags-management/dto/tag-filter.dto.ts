import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { TagScope, TagStatus, TagManagedBy } from '../interfaces';
import { TAG_SORT_FIELDS } from '../constants';

export class TagFilterDto {
  @IsEnum(TagScope)
  @IsOptional()
  scope?: TagScope;

  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsOptional()
  groupId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(TagStatus)
  @IsOptional()
  status?: TagStatus;

  @IsEnum(TagManagedBy)
  @IsOptional()
  managedBy?: TagManagedBy;

  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(TAG_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof TAG_SORT_FIELDS)[number];

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(200)
  limit?: number;
}
