import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { SupplierManagementStatus } from '../constants';
import type {
  SupplierAddress,
  SupplierCertification,
  SupplierContactPerson,
  SupplierBusinessRegistration,
  SupplierTaxIdentifier,
  SupplierPaymentTerms,
  SupplierShippingTerms,
} from '../interfaces';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Acme Manufacturing Ltd.' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiPropertyOptional({ example: 'Acme Manufacturing Private Limited' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  legalName?: string;

  @ApiPropertyOptional({ enum: SupplierManagementStatus, default: SupplierManagementStatus.PROSPECT })
  @IsOptional()
  @IsEnum(SupplierManagementStatus)
  status?: SupplierManagementStatus;

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

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsOptional()
  @IsUrl({}, { message: 'website must be a valid URL' })
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({ example: 'sales@acme.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @ApiPropertyOptional({ type: [Object], description: 'List of address objects' })
  @IsOptional()
  @IsArray()
  addresses?: SupplierAddress[];

  @ApiPropertyOptional({ type: [Object], description: 'Contact persons' })
  @IsOptional()
  @IsArray()
  contactPersons?: SupplierContactPerson[];

  @ApiPropertyOptional({ type: Object, description: 'Business registration details' })
  @IsOptional()
  @IsObject()
  businessRegistration?: SupplierBusinessRegistration;

  @ApiPropertyOptional({ type: [Object], description: 'Tax identifiers (GST, VAT, etc.)' })
  @IsOptional()
  @IsArray()
  taxIdentifiers?: SupplierTaxIdentifier[];

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

  @ApiPropertyOptional({ type: Object, description: 'Payment terms' })
  @IsOptional()
  @IsObject()
  paymentTerms?: SupplierPaymentTerms;

  @ApiPropertyOptional({ type: Object, description: 'Shipping terms' })
  @IsOptional()
  @IsObject()
  shippingTerms?: SupplierShippingTerms;

  @ApiPropertyOptional({ type: [Object], description: 'Certifications (ISO, CE, etc.)' })
  @IsOptional()
  @IsArray()
  certifications?: SupplierCertification[];

  @ApiPropertyOptional({ example: 4.5, minimum: 0, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  overallRating?: number;

  @ApiPropertyOptional({ type: [String], example: ['verified', 'high-volume'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // Allows importing from discovery with a source provider ID
  @ApiPropertyOptional({ example: 'INDIAMART' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerSupplierId?: string;
}
