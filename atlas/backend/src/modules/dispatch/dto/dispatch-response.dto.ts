import { DispatchStatus, DispatchType, DispatchExceptionType } from '../interfaces';

export class DispatchPackageResponseDto {
  id!: string;
  taskId!: string;
  packageId!: string;
  packingPackageId!: string | null;
  orderId!: string | null;
  shipmentId!: string | null;
  trackingNumber!: string | null;
  weight!: number | null;
  weightUnit!: string;
  dispatched!: boolean;
  dispatchedAt!: Date | null;
  scannedBarcodes!: unknown[];
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: Record<string, unknown>): DispatchPackageResponseDto {
    const dto = new DispatchPackageResponseDto();
    dto.id = record['id'] as string;
    dto.taskId = record['taskId'] as string;
    dto.packageId = record['packageId'] as string;
    dto.packingPackageId = (record['packingPackageId'] as string) ?? null;
    dto.orderId = (record['orderId'] as string) ?? null;
    dto.shipmentId = (record['shipmentId'] as string) ?? null;
    dto.trackingNumber = (record['trackingNumber'] as string) ?? null;
    dto.weight = (record['weight'] as number) ?? null;
    dto.weightUnit = record['weightUnit'] as string;
    dto.dispatched = record['dispatched'] as boolean;
    dto.dispatchedAt = (record['dispatchedAt'] as Date) ?? null;
    dto.scannedBarcodes = (record['scannedBarcodes'] as unknown[]) ?? [];
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    return dto;
  }
}

export class DispatchExceptionResponseDto {
  id!: string;
  taskId!: string;
  packageId!: string | null;
  exceptionType!: DispatchExceptionType;
  description!: string;
  evidenceUrls!: string[];
  resolution!: string | null;
  resolvedBy!: string | null;
  resolvedAt!: Date | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;

  static from(record: Record<string, unknown>): DispatchExceptionResponseDto {
    const dto = new DispatchExceptionResponseDto();
    dto.id = record['id'] as string;
    dto.taskId = record['taskId'] as string;
    dto.packageId = (record['packageId'] as string) ?? null;
    dto.exceptionType = record['exceptionType'] as DispatchExceptionType;
    dto.description = record['description'] as string;
    dto.evidenceUrls = (record['evidenceUrls'] as string[]) ?? [];
    dto.resolution = (record['resolution'] as string) ?? null;
    dto.resolvedBy = (record['resolvedBy'] as string) ?? null;
    dto.resolvedAt = (record['resolvedAt'] as Date) ?? null;
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = record['createdAt'] as Date;
    return dto;
  }
}

export class DispatchResponseDto {
  id!: string;
  workspaceId!: string;
  taskNumber!: string;
  taskSequence!: number;
  status!: DispatchStatus;
  dispatchType!: DispatchType;
  warehouseId!: string;
  packingTaskId!: string | null;
  orderId!: string | null;
  shipmentId!: string | null;
  sourceType!: string;
  sourceId!: string | null;
  assignedTo!: string | null;
  assignedAt!: Date | null;
  startedAt!: Date | null;
  completedAt!: Date | null;
  totalPackages!: number;
  dispatchedPackages!: number;
  carrierId!: string | null;
  carrierName!: string | null;
  serviceType!: string | null;
  manifestId!: string | null;
  manifestUrl!: string | null;
  pickupReference!: string | null;
  dispatchReference!: string | null;
  dispatchNoteUrl!: string | null;
  handoverUrl!: string | null;
  dispatchLocationId!: string | null;
  priority!: number;
  notes!: string | null;
  metadata!: Record<string, unknown>;
  cancelReason!: string | null;
  cancelledBy!: string | null;
  cancelledAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt!: Date | null;
  packages?: DispatchPackageResponseDto[];
  exceptions?: DispatchExceptionResponseDto[];

  static from(record: Record<string, unknown>, includePackages = false, includeExceptions = false): DispatchResponseDto {
    const dto = new DispatchResponseDto();
    dto.id = record['id'] as string;
    dto.workspaceId = record['workspaceId'] as string;
    dto.taskNumber = record['taskNumber'] as string;
    dto.taskSequence = record['taskSequence'] as number;
    dto.status = record['status'] as DispatchStatus;
    dto.dispatchType = record['dispatchType'] as DispatchType;
    dto.warehouseId = record['warehouseId'] as string;
    dto.packingTaskId = (record['packingTaskId'] as string) ?? null;
    dto.orderId = (record['orderId'] as string) ?? null;
    dto.shipmentId = (record['shipmentId'] as string) ?? null;
    dto.sourceType = record['sourceType'] as string;
    dto.sourceId = (record['sourceId'] as string) ?? null;
    dto.assignedTo = (record['assignedTo'] as string) ?? null;
    dto.assignedAt = (record['assignedAt'] as Date) ?? null;
    dto.startedAt = (record['startedAt'] as Date) ?? null;
    dto.completedAt = (record['completedAt'] as Date) ?? null;
    dto.totalPackages = record['totalPackages'] as number;
    dto.dispatchedPackages = record['dispatchedPackages'] as number;
    dto.carrierId = (record['carrierId'] as string) ?? null;
    dto.carrierName = (record['carrierName'] as string) ?? null;
    dto.serviceType = (record['serviceType'] as string) ?? null;
    dto.manifestId = (record['manifestId'] as string) ?? null;
    dto.manifestUrl = (record['manifestUrl'] as string) ?? null;
    dto.pickupReference = (record['pickupReference'] as string) ?? null;
    dto.dispatchReference = (record['dispatchReference'] as string) ?? null;
    dto.dispatchNoteUrl = (record['dispatchNoteUrl'] as string) ?? null;
    dto.handoverUrl = (record['handoverUrl'] as string) ?? null;
    dto.dispatchLocationId = (record['dispatchLocationId'] as string) ?? null;
    dto.priority = record['priority'] as number;
    dto.notes = (record['notes'] as string) ?? null;
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.cancelReason = (record['cancelReason'] as string) ?? null;
    dto.cancelledBy = (record['cancelledBy'] as string) ?? null;
    dto.cancelledAt = (record['cancelledAt'] as Date) ?? null;
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    dto.deletedAt = (record['deletedAt'] as Date) ?? null;
    if (includePackages && record['packages']) {
      dto.packages = (record['packages'] as Record<string, unknown>[]).map(DispatchPackageResponseDto.from);
    }
    if (includeExceptions && record['exceptions']) {
      dto.exceptions = (record['exceptions'] as Record<string, unknown>[]).map(DispatchExceptionResponseDto.from);
    }
    return dto;
  }
}

export class DispatchListResponseDto {
  items!: DispatchResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): DispatchListResponseDto {
    const dto = new DispatchListResponseDto();
    dto.items = items.map((item) => DispatchResponseDto.from(item));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}
