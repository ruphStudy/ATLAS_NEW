import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { ReceivingStatus, ReceiptType } from '../interfaces';

export class ReceivingFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ReceivingStatus)
  status?: ReceivingStatus;

  @IsOptional()
  @IsEnum(ReceiptType)
  type?: ReceiptType;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  shipmentId?: string;

  @IsOptional()
  @IsString()
  transferId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsDateString()
  scheduledFrom?: string;

  @IsOptional()
  @IsDateString()
  scheduledTo?: string;
}
