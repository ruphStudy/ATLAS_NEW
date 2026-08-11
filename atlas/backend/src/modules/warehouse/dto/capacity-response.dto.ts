import { CapacityStatus, CapacityLevel, CapacityMeasure } from '../interfaces';

export class CapacitySnapshotDto {
  total!: number | null;
  occupied!: number;
  reserved!: number;
  available!: number;
  blocked!: number;
  utilizationPercent!: number;
  status!: CapacityStatus;
  warningThreshold?: number;
  criticalThreshold?: number;

  static from(
    total: number | null,
    occupied: number,
    reserved: number,
    blocked: number = 0,
    warningThreshold: number = 80,
    criticalThreshold: number = 95,
  ): CapacitySnapshotDto {
    const dto = new CapacitySnapshotDto();
    dto.total = total;
    dto.occupied = occupied;
    dto.reserved = reserved;
    dto.blocked = blocked;
    dto.available = total !== null ? Math.max(0, total - occupied - reserved - blocked) : 0;
    dto.utilizationPercent =
      total !== null && total > 0 ? ((occupied + reserved + blocked) / total) * 100 : 0;
    dto.warningThreshold = warningThreshold;
    dto.criticalThreshold = criticalThreshold;

    if (total === null) {
      dto.status = CapacityStatus.AVAILABLE;
    } else if (dto.utilizationPercent >= 100) {
      dto.status = CapacityStatus.EXCEEDED;
    } else if (dto.utilizationPercent >= criticalThreshold) {
      dto.status = CapacityStatus.CRITICAL;
    } else if (dto.utilizationPercent >= warningThreshold) {
      dto.status = CapacityStatus.NEAR_CAPACITY;
    } else {
      dto.status = CapacityStatus.AVAILABLE;
    }

    return dto;
  }
}

export class WarehouseCapacityResponseDto {
  warehouseId!: string;
  warehouseCode!: string;
  capacity!: CapacitySnapshotDto;
  zones!: ZoneCapacitySummaryDto[];
  updatedAt!: Date;

  static from(
    warehouse: Record<string, unknown>,
    capacity: CapacitySnapshotDto,
    zones: ZoneCapacitySummaryDto[],
  ): WarehouseCapacityResponseDto {
    const dto = new WarehouseCapacityResponseDto();
    dto.warehouseId = warehouse['id'] as string;
    dto.warehouseCode = warehouse['code'] as string;
    dto.capacity = capacity;
    dto.zones = zones;
    dto.updatedAt = warehouse['updatedAt'] as Date;
    return dto;
  }
}

export class ZoneCapacitySummaryDto {
  zoneId!: string;
  zoneCode!: string;
  zoneName!: string | null;
  capacity!: CapacitySnapshotDto;

  static from(zone: Record<string, unknown>, capacity: CapacitySnapshotDto): ZoneCapacitySummaryDto {
    const dto = new ZoneCapacitySummaryDto();
    dto.zoneId = zone['id'] as string;
    dto.zoneCode = zone['code'] as string;
    dto.zoneName = (zone['name'] as string) ?? null;
    dto.capacity = capacity;
    return dto;
  }
}

export class LocationCapacityResponseDto {
  locationId!: string;
  locationCode!: string;
  capacity!: CapacitySnapshotDto;
  updatedAt!: Date;

  static from(
    location: Record<string, unknown>,
    capacity: CapacitySnapshotDto,
  ): LocationCapacityResponseDto {
    const dto = new LocationCapacityResponseDto();
    dto.locationId = location['id'] as string;
    dto.locationCode = location['code'] as string;
    dto.capacity = capacity;
    dto.updatedAt = location['updatedAt'] as Date;
    return dto;
  }
}

export class BinCapacityResponseDto {
  binId!: string;
  binCode!: string;
  capacity!: CapacitySnapshotDto;
  weightCapacity?: CapacitySnapshotDto;
  updatedAt!: Date;

  static from(
    bin: Record<string, unknown>,
    capacity: CapacitySnapshotDto,
    weightCapacity?: CapacitySnapshotDto,
  ): BinCapacityResponseDto {
    const dto = new BinCapacityResponseDto();
    dto.binId = bin['id'] as string;
    dto.binCode = bin['code'] as string;
    dto.capacity = capacity;
    dto.weightCapacity = weightCapacity;
    dto.updatedAt = bin['updatedAt'] as Date;
    return dto;
  }
}

export class CapacityReservationResponseDto {
  id!: string;
  level!: CapacityLevel;
  entityId!: string;
  measure!: CapacityMeasure;
  quantity!: number;
  referenceType!: string;
  referenceId!: string;
  expiresAt!: Date | null;
  releasedAt!: Date | null;
  createdAt!: Date;

  static from(record: Record<string, unknown>): CapacityReservationResponseDto {
    const dto = new CapacityReservationResponseDto();
    dto.id = record['id'] as string;
    dto.level = record['level'] as CapacityLevel;
    dto.entityId = record['entityId'] as string;
    dto.measure = record['measure'] as CapacityMeasure;
    dto.quantity = record['quantity'] as number;
    dto.referenceType = record['referenceType'] as string;
    dto.referenceId = record['referenceId'] as string;
    dto.expiresAt = (record['expiresAt'] as Date) ?? null;
    dto.releasedAt = (record['releasedAt'] as Date) ?? null;
    dto.createdAt = record['createdAt'] as Date;
    return dto;
  }
}
