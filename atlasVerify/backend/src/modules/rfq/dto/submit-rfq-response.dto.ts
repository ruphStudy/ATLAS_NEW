import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RfqSupplierResponseStatus } from '../interfaces';

export class SubmitRfqResponseDto {
  @ApiProperty({ enum: RfqSupplierResponseStatus })
  @IsNotEmpty()
  @IsEnum(RfqSupplierResponseStatus)
  status!: RfqSupplierResponseStatus;

  @ApiPropertyOptional({ example: 14.50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quotedPrice?: number;

  @ApiPropertyOptional({ example: 21 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quotedLeadTimeDays?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quotedMoq?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  supplierNotes?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  counterOfferDetails?: Record<string, unknown>;
}
