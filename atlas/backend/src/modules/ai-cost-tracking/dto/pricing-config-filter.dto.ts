import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PricingConfigFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  modelKey?: string;

  @IsString()
  @IsOptional()
  capability?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}
