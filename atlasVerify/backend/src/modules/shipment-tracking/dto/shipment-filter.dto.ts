import { PaginationDto } from '@common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ShipmentStatus } from '../interfaces';

export class ShipmentFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ShipmentStatus, isArray: true })
  @IsOptional()
  @IsEnum(ShipmentStatus, { each: true })
  status?: ShipmentStatus | ShipmentStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}
