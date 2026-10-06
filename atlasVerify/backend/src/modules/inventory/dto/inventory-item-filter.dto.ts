import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { InventoryItemStatus, InventoryTrackingType } from '../interfaces';

export class InventoryItemFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InventoryItemStatus)
  status?: InventoryItemStatus;

  @IsOptional()
  @IsEnum(InventoryTrackingType)
  trackingType?: InventoryTrackingType;

  @IsOptional()
  @IsString()
  catalogProductId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;
}
