import { IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class ApproveRecommendationDto {
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsNumber()
  overrideQuantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectRecommendationDto {
  @IsString()
  rejectionReason!: string;

  @IsOptional()
  @IsString()
  rejectedBy?: string;
}

export class SnoozeRecommendationDto {
  @IsDateString()
  snoozedUntil!: string;

  @IsOptional()
  @IsString()
  snoozeReason?: string;

  @IsOptional()
  @IsString()
  snoozedBy?: string;
}

export class ResolveRecommendationDto {
  @IsOptional()
  @IsString()
  resolvedBy?: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @IsOptional()
  @IsString()
  procurementDraftId?: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;
}

export class RecalculateRecommendationsDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}
