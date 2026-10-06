import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SupplierSourceProvider, SupplierStatus, SupplierTier } from '../interfaces';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Acme Electronics Ltd.' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiPropertyOptional({ enum: SupplierSourceProvider, default: SupplierSourceProvider.MANUAL })
  @IsOptional()
  @IsEnum(SupplierSourceProvider)
  provider?: SupplierSourceProvider;

  @ApiPropertyOptional({ example: 'IN', description: 'ISO 3166-1 alpha-2 country code' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  country?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'https://acme-electronics.com' })
  @IsOptional()
  @IsUrl({}, { message: 'website must be a valid URL' })
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({ example: 'sales@acme-electronics.com' })
  @IsOptional()
  @IsEmail({}, { message: 'contactEmail must be a valid email' })
  @MaxLength(200)
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @ApiPropertyOptional({ enum: SupplierTier, default: SupplierTier.UNVERIFIED })
  @IsOptional()
  @IsEnum(SupplierTier)
  tier?: SupplierTier;

  @ApiPropertyOptional({ enum: SupplierStatus, default: SupplierStatus.PENDING_REVIEW })
  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

  @ApiPropertyOptional({ example: ['Electronics', 'Consumer Goods'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minOrderQuantity?: number;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  avgLeadTimeDays?: number;

  @ApiPropertyOptional({ example: 4.5, minimum: 0, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  overallRating?: number;

  @ApiPropertyOptional({ example: 'Verified OEM manufacturer. Handles export to US/EU.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
