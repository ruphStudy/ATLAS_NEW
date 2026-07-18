import { PaginationDto } from '@common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PurchaseOrderStatus } from '../interfaces';

export class PurchaseOrderFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus, isArray: true })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus, { each: true })
  status?: PurchaseOrderStatus | PurchaseOrderStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  procurementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;
}
