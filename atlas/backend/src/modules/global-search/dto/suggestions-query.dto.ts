import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MAX_RECENT_LIMIT } from '../constants';

export class SuggestionsQueryDto {
  @IsString()
  @IsNotEmpty()
  q!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_RECENT_LIMIT)
  @IsOptional()
  limit?: number;
}

export class RecentQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_RECENT_LIMIT)
  @IsOptional()
  limit?: number;
}
