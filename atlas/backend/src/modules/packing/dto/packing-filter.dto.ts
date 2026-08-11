import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { PackingStatus, PackingType } from '../interfaces';

export class PackingFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PackingStatus)
  status?: PackingStatus;

  @IsOptional()
  @IsEnum(PackingType)
  packingType?: PackingType;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  pickingTaskId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  shipmentId?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}
