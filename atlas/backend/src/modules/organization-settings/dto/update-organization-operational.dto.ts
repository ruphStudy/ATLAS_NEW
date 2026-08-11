import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateOrganizationOperationalDto {
  @IsString()
  @IsOptional()
  defaultWorkspaceId?: string;

  @IsString()
  @IsOptional()
  defaultMarketplace?: string;

  @IsString()
  @IsOptional()
  defaultWarehouseId?: string;

  @IsString()
  @IsOptional()
  defaultSupplierId?: string;

  @IsObject()
  @IsOptional()
  aiPreferences?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  notificationPreferences?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  changeReason?: string;
}
