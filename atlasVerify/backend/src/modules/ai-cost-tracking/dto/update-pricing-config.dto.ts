import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsBoolean,
  IsInt,
  IsDateString,
  IsObject,
} from 'class-validator';

export class UpdatePricingConfigDto {
  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  inputPricePer1k?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  outputPricePer1k?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cachedInputPricePer1k?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  imagePriceUnit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  embeddingPricePer1k?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsInt()
  @IsOptional()
  priority?: number;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  changeReason?: string;

  @IsString()
  @IsOptional()
  changedBy?: string;
}
