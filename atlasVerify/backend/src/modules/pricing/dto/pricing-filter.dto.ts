import { IsOptional, IsEnum, IsString, IsArray, IsBoolean } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { PricingStatus, PricingStrategy } from '../interfaces';

export class PricingRecordFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  catalogProductId?: string;

  @IsOptional()
  @IsString()
  marketplaceKey?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(PricingStatus, { each: true })
  status?: PricingStatus[];

  @IsOptional()
  @IsEnum(PricingStrategy)
  strategy?: PricingStrategy;
}

export class PricingConfigFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  marketplaceKey?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(PricingStrategy)
  strategy?: PricingStrategy;
}
