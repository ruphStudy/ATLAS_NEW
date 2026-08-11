import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateWarehouseLocationDto } from './create-warehouse-location.dto';
import { WarehouseLocationStatus } from '../interfaces';

export class UpdateWarehouseLocationDto extends PartialType(
  CreateWarehouseLocationDto,
) {
  @IsOptional()
  @IsEnum(WarehouseLocationStatus)
  status?: WarehouseLocationStatus;
}
