import { IsNotEmpty, IsOptional, IsString, IsInt, Min, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProfitProvider } from '../interfaces';

export class CreateProfitCalculationDto {
  @ApiProperty({
    description: 'Opportunity ID to calculate profit for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  opportunityId!: string;

  @ApiPropertyOptional({
    description: 'Profit provider to use',
    enum: ProfitProvider,
    default: ProfitProvider.AMAZON_FBA,
  })
  @IsOptional()
  @IsEnum(ProfitProvider)
  provider?: ProfitProvider;

  @ApiPropertyOptional({ description: 'Calculation version (defaults to next)', example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  // ── Caller overrides ─────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Product cost override (USD)', example: 8.50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  productCost?: number;

  @ApiPropertyOptional({ description: 'Shipping cost override (USD)', example: 2.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional({ description: 'Packaging cost override (USD)', example: 0.50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  packagingCost?: number;

  @ApiPropertyOptional({ description: 'Advertising cost override (USD)', example: 1.50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  advertisingCost?: number;

  @ApiPropertyOptional({ description: 'Tax rate override (decimal, e.g. 0.08 for 8%)', example: 0.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Target selling price override (USD)', example: 29.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;
}
