import { PaginationDto } from '@common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProcurementStatus } from '../interfaces';

export class ProcurementFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProcurementStatus, isArray: true })
  @IsOptional()
  @IsEnum(ProcurementStatus, { each: true })
  status?: ProcurementStatus | ProcurementStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  rfqId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  procurementOwner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}
