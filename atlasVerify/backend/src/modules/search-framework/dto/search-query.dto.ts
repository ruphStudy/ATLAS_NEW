import { IsString, IsOptional, IsEnum, IsArray, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SearchMode } from '../interfaces';
import { SEARCH_MAX_LIMIT } from '../constants';

const splitCsv = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value);

export class SearchQueryDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsEnum(SearchMode)
  @IsOptional()
  mode?: SearchMode;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(splitCsv)
  entityTypes?: string[];

  @IsString()
  @IsOptional()
  module?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(splitCsv)
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
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(SEARCH_MAX_LIMIT)
  limit?: number;
}
