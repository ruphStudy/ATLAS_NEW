import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateWarehouseDto } from './create-warehouse.dto';
import { WarehouseStatus } from '../interfaces';

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {
  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;
}
