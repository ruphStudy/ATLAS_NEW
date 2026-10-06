import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { WarehouseLocationStatus, WarehouseLocationType } from '../interfaces';

export class WarehouseLocationFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(WarehouseLocationStatus)
  status?: WarehouseLocationStatus;

  @IsOptional()
  @IsEnum(WarehouseLocationType)
  type?: WarehouseLocationType;

  @IsOptional()
  @IsString()
  parentLocationId?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  barcode?: string;
}
