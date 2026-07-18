import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '@common/dto/pagination.dto';
import { SupplierManagementStatus } from '../constants';

export class SupplierFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Full-text search across name, email, phone' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: SupplierManagementStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(SupplierManagementStatus, { each: true })
  status?: SupplierManagementStatus[];

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  country?: string;

  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 'INDIAMART' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ type: [String], example: ['verified'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 50, description: 'Min verification score' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minVerificationScore?: number;

  @ApiPropertyOptional({ example: 50, description: 'Min performance score' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minPerformanceScore?: number;
}
