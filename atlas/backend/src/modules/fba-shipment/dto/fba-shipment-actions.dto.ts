import { IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class PlanShipmentDto {
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
  destinationFCName?: string;

  @IsOptional()
  @IsObject()
  destinationAddress?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  shipmentPlanUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ApproveShipmentDto {
  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PrepareShipmentDto {
  @IsOptional()
  @IsString()
  packingTaskId?: string;

  @IsOptional()
  @IsString()
  transferId?: string;

  @IsOptional()
  @IsString()
  reservationId?: string;
}

export class DispatchShipmentDto {
  @IsOptional()
  @IsString()
  dispatchTaskId?: string;

  @IsOptional()
  @IsString()
  dispatchedBy?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class TrackShipmentDto {
  @IsOptional()
  @IsString()
  externalShipmentId?: string;

  @IsOptional()
  @IsObject()
  trackingReferences?: unknown[];

  @IsOptional()
  @IsObject()
  externalReferences?: unknown[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ReconcileShipmentDto {
  @IsOptional()
  @IsInt()
  receivedUnits?: number;

  @IsOptional()
  @IsObject()
  itemReceipts?: Record<string, number>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CloseShipmentDto {
  @IsOptional()
  @IsString()
  closedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelShipmentDto {
  @IsString()
  cancelReason!: string;

  @IsOptional()
  @IsString()
  cancelledBy?: string;
}

export class UpdateFBAShipmentItemDto {
  @IsOptional()
  @IsInt()
  requestedQuantity?: number;

  @IsOptional()
  @IsInt()
  shippedQuantity?: number;

  @IsOptional()
  @IsInt()
  receivedQuantity?: number;

  @IsOptional()
  @IsString()
  prepType?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateFBAShipmentBoxDto {
  @IsString()
  boxNumber!: string;

  @IsOptional()
  @IsString()
  externalBoxId?: string;

  @IsOptional()
  @IsString()
  packageId?: string;

  @IsOptional()
  @IsString()
  packingPackageId?: string;

  @IsOptional()
  @IsString()
  packageType?: string;

  @IsOptional()
  @IsObject()
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    dimensionUnit?: string;
  };

  @IsOptional()
  @IsObject()
  weight?: {
    weight?: number;
    weightUnit?: string;
  };

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class AddBoxContentDto {
  @IsString()
  itemId!: string;

  @IsInt()
  quantity!: number;
}

export class RecordDiscrepancyDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsString()
  discrepancyType!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  fnsku?: string;

  @IsOptional()
  @IsInt()
  expectedQuantity?: number;

  @IsOptional()
  @IsInt()
  shippedQuantity?: number;

  @IsOptional()
  @IsInt()
  receivedQuantity?: number;

  @IsOptional()
  @IsInt()
  varianceQuantity?: number;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ReconcileDiscrepancyDto {
  @IsOptional()
  @IsString()
  reconciledBy?: string;

  @IsOptional()
  @IsString()
  reconciliationNotes?: string;

  @IsOptional()
  @IsString()
  adjustmentId?: string;
}
