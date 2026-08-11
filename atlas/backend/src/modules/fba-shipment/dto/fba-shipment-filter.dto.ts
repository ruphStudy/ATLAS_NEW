import { IsInt, IsOptional, IsString } from 'class-validator';

export class FBAShipmentFilterDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  marketplaceAccountId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  shipmentType?: string;

  @IsOptional()
  @IsString()
  externalShipmentId?: string;

  @IsOptional()
  @IsString()
  externalPlanId?: string;

  @IsOptional()
  @IsString()
  destinationFCId?: string;

  @IsOptional()
  @IsString()
  packingTaskId?: string;

  @IsOptional()
  @IsString()
  dispatchTaskId?: string;

  @IsOptional()
  @IsString()
  transferId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;
}
