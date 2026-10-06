import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { SupplierStatus, SupplierTier, SupplierSourceProvider } from '../interfaces';

export class SupplierFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SupplierStatus })
  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

  @ApiPropertyOptional({ enum: SupplierTier })
  @IsOptional()
  @IsEnum(SupplierTier)
  tier?: SupplierTier;

  @ApiPropertyOptional({ enum: SupplierSourceProvider })
  @IsOptional()
  @IsEnum(SupplierSourceProvider)
  provider?: SupplierSourceProvider;

  @ApiPropertyOptional({ example: 'IN' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  country?: string;
}

export class SupplierSessionFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SupplierSourceProvider })
  @IsOptional()
  @IsEnum(SupplierSourceProvider)
  provider?: SupplierSourceProvider;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;
}
