import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { ZoneStatus, ZoneType } from '../interfaces';

export class WarehouseZoneFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ZoneStatus)
  status?: ZoneStatus;

  @IsOptional()
  @IsEnum(ZoneType)
  type?: ZoneType;
}
