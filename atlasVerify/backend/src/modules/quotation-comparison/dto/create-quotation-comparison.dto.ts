import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ComparisonWeightsDto {
  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  unitPrice?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  totalCost?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.08 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  moq?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  leadTime?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.07 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  paymentTerms?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.05 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  shippingTerms?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  certifications?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  verificationScore?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.08 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  riskScore?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, default: 0.07 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  performanceScore?: number;
}

export class CreateQuotationComparisonDto {
  @ApiProperty({ description: 'RFQ id to compare quotations for' })
  @IsUUID()
  rfqId!: string;

  @ApiPropertyOptional({ description: 'Configurable scoring weights — automatically normalised' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComparisonWeightsDto)
  weights?: ComparisonWeightsDto;

  @ApiPropertyOptional({ description: 'Free-text notes attached to this comparison' })
  @IsOptional()
  @IsString()
  notes?: string;
}
