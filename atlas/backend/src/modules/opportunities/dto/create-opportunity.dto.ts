import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { OPPORTUNITY_CONSTANTS } from '../constants';
import { OpportunityStatus } from '../interfaces';

export class CreateOpportunityDto {
  @ApiProperty({ example: 'wireless earbuds', description: 'Target search keyword' })
  @IsString()
  @MinLength(OPPORTUNITY_CONSTANTS.KEYWORD_MIN)
  @MaxLength(OPPORTUNITY_CONSTANTS.KEYWORD_MAX)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  keyword!: string;

  @ApiProperty({ example: 'AMAZON_US', description: 'Target marketplace code' })
  @IsString()
  @MaxLength(OPPORTUNITY_CONSTANTS.MARKETPLACE_MAX)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  marketplace!: string;

  @ApiPropertyOptional({ example: 'US', description: 'ISO 3166-1 alpha-2 country code' })
  @IsOptional()
  @IsString()
  @MaxLength(OPPORTUNITY_CONSTANTS.COUNTRY_MAX)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  country?: string;

  @ApiPropertyOptional({ example: 'Electronics', description: 'Product category' })
  @IsOptional()
  @IsString()
  @MaxLength(OPPORTUNITY_CONSTANTS.CATEGORY_MAX)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  category?: string;

  @ApiPropertyOptional({ example: 78.5, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(OPPORTUNITY_CONSTANTS.SCORE_MIN)
  @Max(OPPORTUNITY_CONSTANTS.SCORE_MAX)
  demandScore?: number;

  @ApiPropertyOptional({ example: 42.0, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(OPPORTUNITY_CONSTANTS.SCORE_MIN)
  @Max(OPPORTUNITY_CONSTANTS.SCORE_MAX)
  competitionScore?: number;

  @ApiPropertyOptional({ example: 65.0, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(OPPORTUNITY_CONSTANTS.SCORE_MIN)
  @Max(OPPORTUNITY_CONSTANTS.SCORE_MAX)
  supplierScore?: number;

  @ApiPropertyOptional({ example: 55.0, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(OPPORTUNITY_CONSTANTS.SCORE_MIN)
  @Max(OPPORTUNITY_CONSTANTS.SCORE_MAX)
  profitScore?: number;

  @ApiPropertyOptional({ example: 82.0, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(OPPORTUNITY_CONSTANTS.SCORE_MIN)
  @Max(OPPORTUNITY_CONSTANTS.SCORE_MAX)
  aiScore?: number;

  @ApiPropertyOptional({ example: 68.5, minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(OPPORTUNITY_CONSTANTS.SCORE_MIN)
  @Max(OPPORTUNITY_CONSTANTS.SCORE_MAX)
  finalScore?: number;

  @ApiPropertyOptional({ example: 'Strong demand with moderate competition. Recommend sourcing.' })
  @IsOptional()
  @IsString()
  @MaxLength(OPPORTUNITY_CONSTANTS.RECOMMENDATION_MAX)
  recommendation?: string;

  @ApiPropertyOptional({ enum: OpportunityStatus, default: OpportunityStatus.DISCOVERED })
  @IsOptional()
  @IsEnum(OpportunityStatus)
  status?: OpportunityStatus;

  @ApiPropertyOptional({ example: 'Initial discovery via keyword research tool.' })
  @IsOptional()
  @IsString()
  @MaxLength(OPPORTUNITY_CONSTANTS.NOTES_MAX)
  notes?: string;
}
