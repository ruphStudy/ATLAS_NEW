import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { PickingStatus, PickingType, PickingStrategy } from '../interfaces';

export class PickingFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PickingStatus)
  status?: PickingStatus;

  @IsOptional()
  @IsEnum(PickingType)
  pickingType?: PickingType;

  @IsOptional()
  @IsEnum(PickingStrategy)
  strategy?: PickingStrategy;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  transferId?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  waveId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;
}
