import { IsOptional, IsEnum, IsString, IsArray } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { QualityInspectionStatus, InspectionType, SamplingMethod } from '../interfaces';

export class QualityInspectionFilterDto extends PaginationDto {
  @IsOptional()
  @IsArray()
  @IsEnum(QualityInspectionStatus, { each: true })
  status?: QualityInspectionStatus[];

  @IsOptional()
  @IsEnum(InspectionType)
  inspectionType?: InspectionType;

  @IsOptional()
  @IsEnum(SamplingMethod)
  samplingMethod?: SamplingMethod;

  @IsOptional()
  @IsString()
  shipmentId?: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  inspector?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
