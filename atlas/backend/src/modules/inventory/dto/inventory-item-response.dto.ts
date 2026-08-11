import { InventoryItemStatus, InventoryTrackingType } from '../interfaces';

export class InventoryItemResponseDto {
  id!: string;
  workspaceId!: string;
  sku!: string;
  skuSequence!: number;
  catalogProductId?: string | null;
  variantId?: string | null;
  name!: string;
  status!: InventoryItemStatus;
  trackingType!: InventoryTrackingType;
  baseUom!: string;
  reorderPoint!: number;
  safetyStock!: number;
  reorderQuantity!: number;
  isExpiryTracked!: boolean;
  shelfLifeDays?: number | null;
  version!: number;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): InventoryItemResponseDto {
    const dto = new InventoryItemResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.sku = raw['sku'] as string;
    dto.skuSequence = raw['skuSequence'] as number;
    dto.catalogProductId = (raw['catalogProductId'] as string | null) ?? null;
    dto.variantId = (raw['variantId'] as string | null) ?? null;
    dto.name = raw['name'] as string;
    dto.status = raw['status'] as InventoryItemStatus;
    dto.trackingType = raw['trackingType'] as InventoryTrackingType;
    dto.baseUom = raw['baseUom'] as string;
    dto.reorderPoint = raw['reorderPoint'] as number;
    dto.safetyStock = raw['safetyStock'] as number;
    dto.reorderQuantity = raw['reorderQuantity'] as number;
    dto.isExpiryTracked = raw['isExpiryTracked'] as boolean;
    dto.shelfLifeDays = (raw['shelfLifeDays'] as number | null) ?? null;
    dto.version = raw['version'] as number;
    dto.metadata = (raw['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class InventoryItemListResponseDto {
  data!: InventoryItemResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventoryItemListResponseDto {
    const dto = new InventoryItemListResponseDto();
    dto.data = items.map(InventoryItemResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class InventoryItemHistoryResponseDto {
  id!: string;
  inventoryItemId!: string;
  workspaceId!: string;
  fromStatus!: InventoryItemStatus;
  toStatus!: InventoryItemStatus;
  version!: number;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): InventoryItemHistoryResponseDto {
    const dto = new InventoryItemHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.inventoryItemId = raw['inventoryItemId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = raw['fromStatus'] as InventoryItemStatus;
    dto.toStatus = raw['toStatus'] as InventoryItemStatus;
    dto.version = raw['version'] as number;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshot = raw['snapshot'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}
