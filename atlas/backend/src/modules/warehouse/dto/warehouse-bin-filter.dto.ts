import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { BinStatus, BinType, BinMode } from '../interfaces';

export class WarehouseBinFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(BinStatus)
  status?: BinStatus;

  @IsOptional()
  @IsEnum(BinType)
  type?: BinType;

  @IsOptional()
  @IsEnum(BinMode)
  mode?: BinMode;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  barcode?: string;
}
