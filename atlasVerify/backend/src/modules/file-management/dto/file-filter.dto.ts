import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { FileCategory, FileStatus } from '../interfaces';

export class FileFilterDto {
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

  @IsEnum(FileCategory)
  @IsOptional()
  category?: FileCategory;

  @IsEnum(FileStatus)
  @IsOptional()
  status?: FileStatus;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Type(() => String)
  tags?: string[];

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsIn(['createdAt', 'updatedAt', 'name', 'sizeBytes'])
  @IsOptional()
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'sizeBytes';

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
