import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DISCOVERY_CONSTANTS } from '../constants';
import { DiscoveryMode } from '../interfaces';

export class CreateDiscoverySessionDto {
  @ApiPropertyOptional({
    example: 'AMAZON',
    description: 'Target marketplace code (e.g. AMAZON, WALMART). Required for KEYWORD mode (the default); not used by TREND_COLD_START, which is marketplace-neutral.',
  })
  // Required only for the existing KEYWORD mode, mirroring `keywords` below.
  @ValidateIf((dto) => !dto.mode || dto.mode === DiscoveryMode.KEYWORD)
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  marketplace?: string;

  @ApiPropertyOptional({
    example: 'US',
    default: 'US',
    description: 'ISO 3166-1 alpha-2 country code',
  })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  country?: string;

  @ApiPropertyOptional({
    enum: DiscoveryMode,
    default: DiscoveryMode.KEYWORD,
    description:
      'How this run is initiated. KEYWORD (default) uses marketplace/country/keywords below. TREND_COLD_START runs the marketplace-neutral Wikipedia-based cold-start discovery instead (ignores marketplace/country/keywords). ASIN is a schema slot only — requesting it fails validation with 400 Bad Request rather than running an empty session.',
  })
  @IsOptional()
  @IsEnum(DiscoveryMode)
  mode?: DiscoveryMode;

  @ApiPropertyOptional({
    example: ['wireless earbuds', 'bluetooth speaker', 'phone stand'],
    description: `Keywords to discover (1–${DISCOVERY_CONSTANTS.MAX_KEYWORDS}). Required for KEYWORD mode (the default); not used by ASIN/TREND_COLD_START.`,
    minItems: 1,
    maxItems: DISCOVERY_CONSTANTS.MAX_KEYWORDS,
  })
  // Required only for the existing KEYWORD mode (default when `mode` is
  // omitted), so today's callers are fully unaffected.
  @ValidateIf((dto) => !dto.mode || dto.mode === DiscoveryMode.KEYWORD)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(DISCOVERY_CONSTANTS.MAX_KEYWORDS)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(200, { each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    example: ['Electronics', 'Home & Kitchen'],
    description: `Product categories to filter by (up to ${DISCOVERY_CONSTANTS.MAX_CATEGORIES})`,
    maxItems: DISCOVERY_CONSTANTS.MAX_CATEGORIES,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(DISCOVERY_CONSTANTS.MAX_CATEGORIES)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  categories?: string[];
}
