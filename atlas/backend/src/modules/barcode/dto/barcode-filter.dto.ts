import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { BarcodeType, BarcodeEntityType, BarcodeStatus } from '../interfaces';

export class BarcodeFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(BarcodeStatus)
  status?: BarcodeStatus;

  @IsOptional()
  @IsEnum(BarcodeType)
  type?: BarcodeType;

  @IsOptional()
  @IsEnum(BarcodeEntityType)
  entityType?: BarcodeEntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  value?: string;
}

export class LabelTemplateFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(BarcodeEntityType)
  entityType?: BarcodeEntityType;
}
