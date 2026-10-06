import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DISCOVERY_CONSTANTS } from '../constants';

export class CreateDiscoverySessionDto {
  @ApiProperty({
    example: 'AMAZON',
    description: 'Target marketplace code (e.g. AMAZON, WALMART)',
  })
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  marketplace!: string;

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

  @ApiProperty({
    example: ['wireless earbuds', 'bluetooth speaker', 'phone stand'],
    description: `Keywords to discover (1–${DISCOVERY_CONSTANTS.MAX_KEYWORDS})`,
    minItems: 1,
    maxItems: DISCOVERY_CONSTANTS.MAX_KEYWORDS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(DISCOVERY_CONSTANTS.MAX_KEYWORDS)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(200, { each: true })
  keywords!: string[];

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
