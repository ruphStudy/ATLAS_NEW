import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateProductCostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  opportunityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  rfqId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  rfqSupplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({ description: 'Supplier quoted unit price in source currency' })
  @IsNumber()
  @IsPositive()
  supplierUnitPrice!: number;

  @ApiProperty({ description: 'Order quantity' })
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiPropertyOptional({ description: 'Supplier minimum order quantity' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  moq?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  freightCost?: number;

  @ApiPropertyOptional({ description: 'Customs duty as a percentage of supplier price subtotal' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  customsDutyPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  importCharges?: number;

  @ApiPropertyOptional({ description: 'Packaging cost per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  packagingCostPerUnit?: number;

  @ApiPropertyOptional({ description: 'Labeling cost per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  labelingCostPerUnit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  inspectionCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  miscCharges?: number;

  @ApiPropertyOptional({ description: 'ISO 4217 currency code of supplier price', default: 'USD' })
  @IsOptional()
  @IsString()
  sourceCurrency?: string;

  @ApiPropertyOptional({ description: 'ISO 4217 target currency for results', default: 'USD' })
  @IsOptional()
  @IsString()
  targetCurrency?: string;

  @ApiPropertyOptional({ description: 'Exchange rate from source to target currency', default: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Tax percentage applied after duties', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
