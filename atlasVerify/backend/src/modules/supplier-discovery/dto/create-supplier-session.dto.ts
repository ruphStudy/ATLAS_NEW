import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { SupplierDiscoverySessionStatus, SupplierSourceProvider } from '../interfaces';

export class CreateSupplierDiscoverySessionDto {
  @ApiProperty({ enum: SupplierSourceProvider, example: SupplierSourceProvider.INDIAMART })
  @IsEnum(SupplierSourceProvider, { message: 'provider must be a valid SupplierSourceProvider' })
  provider!: SupplierSourceProvider;

  @ApiProperty({ example: 'wireless earbuds', description: 'Keyword to search suppliers for' })
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  keyword!: string;

  @ApiPropertyOptional({ example: 'IN', default: 'IN' })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  country?: string;

  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  category?: string;
}
