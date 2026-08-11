import { Injectable } from '@nestjs/common';
import { BusinessRuleException, ResourceNotFoundException } from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { WarehouseRepository } from './warehouse.repository';
import { WarehouseZoneRepository } from './warehouse-zone.repository';
import { WarehouseLocationRepository } from './warehouse-location.repository';
import { WarehouseBinRepository } from './warehouse-bin.repository';
import { WarehouseCapacityRepository } from './warehouse-capacity.repository';
import { WarehouseEventQueue } from './jobs';
import {
  ReserveCapacityDto,
  ReleaseCapacityDto,
  RecalculateCapacityDto,
  CapacitySnapshotDto,
  WarehouseCapacityResponseDto,
  ZoneCapacitySummaryDto,
  LocationCapacityResponseDto,
  BinCapacityResponseDto,
  CapacityReservationResponseDto,
} from './dto';
import { CapacityLevel, CapacityMeasure, CapacityEvent, CapacityStatus } from './interfaces';

@Injectable()
export class WarehouseCapacityService {
  private readonly DEFAULT_WARNING_THRESHOLD = 80;
  private readonly DEFAULT_CRITICAL_THRESHOLD = 95;

  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly zoneRepository: WarehouseZoneRepository,
    private readonly locationRepository: WarehouseLocationRepository,
    private readonly binRepository: WarehouseBinRepository,
    private readonly capacityRepository: WarehouseCapacityRepository,
    private readonly eventQueue: WarehouseEventQueue,
  ) {}

  // ── Capacity Snapshots ───────────────────────────────────────

  async getWarehouseCapacity(
    warehouseId: string,
    workspaceId: string,
  ): Promise<WarehouseCapacityResponseDto> {
    const warehouse = await this.warehouseRepository.findById(warehouseId, workspaceId);
    if (!warehouse) throw new ResourceNotFoundException('Warehouse', warehouseId);

    // Calculate warehouse-level capacity from zones
    const zones = await this.prisma['warehouseZone'].findMany({
      where: { warehouseId, workspaceId, deletedAt: null },
    });

    let totalCapacity: number | null = warehouse['capacity'] as number | null;
    let totalOccupied = 0;
    let totalReserved = 0;

    const zoneSummaries: ZoneCapacitySummaryDto[] = [];

    for (const zone of zones) {
      const zoneCapacity = CapacitySnapshotDto.from(
        zone['capacity'] as number | null,
        (zone['occupiedCapacity'] as number) ?? 0,
        (zone['reservedCapacity'] as number) ?? 0,
        0,
        this.DEFAULT_WARNING_THRESHOLD,
        this.DEFAULT_CRITICAL_THRESHOLD,
      );

      zoneSummaries.push(ZoneCapacitySummaryDto.from(zone, zoneCapacity));

      totalOccupied += zoneCapacity.occupied;
      totalReserved += zoneCapacity.reserved;
    }

    const warehouseCapacitySnapshot = CapacitySnapshotDto.from(
      totalCapacity,
      totalOccupied,
      totalReserved,
      0,
      this.DEFAULT_WARNING_THRESHOLD,
      this.DEFAULT_CRITICAL_THRESHOLD,
    );

    await this.publishCapacityEvent(
      warehouse,
      warehouseCapacitySnapshot,
      CapacityLevel.WAREHOUSE,
      warehouseId,
    );

    return WarehouseCapacityResponseDto.from(warehouse, warehouseCapacitySnapshot, zoneSummaries);
  }

  async getZoneCapacity(
    zoneId: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<ZoneCapacitySummaryDto> {
    const zone = await this.zoneRepository.findById(zoneId, warehouseId, workspaceId);
    if (!zone) throw new ResourceNotFoundException('Warehouse zone', zoneId);

    const capacity = CapacitySnapshotDto.from(
      zone['capacity'] as number | null,
      (zone['occupiedCapacity'] as number) ?? 0,
      (zone['reservedCapacity'] as number) ?? 0,
      0,
      this.DEFAULT_WARNING_THRESHOLD,
      this.DEFAULT_CRITICAL_THRESHOLD,
    );

    const warehouse = await this.warehouseRepository.findById(warehouseId, workspaceId);
    if (warehouse) {
      await this.publishCapacityEvent(warehouse, capacity, CapacityLevel.ZONE, zoneId);
    }

    return ZoneCapacitySummaryDto.from(zone, capacity);
  }

  async getLocationCapacity(
    locationId: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<LocationCapacityResponseDto> {
    const location = await this.locationRepository.findById(locationId, warehouseId, workspaceId);
    if (!location) throw new ResourceNotFoundException('Warehouse location', locationId);

    const capacity = CapacitySnapshotDto.from(
      location['capacity'] as number | null,
      (location['occupiedCapacity'] as number) ?? 0,
      (location['reservedCapacity'] as number) ?? 0,
      0,
      this.DEFAULT_WARNING_THRESHOLD,
      this.DEFAULT_CRITICAL_THRESHOLD,
    );

    const warehouse = await this.warehouseRepository.findById(warehouseId, workspaceId);
    if (warehouse) {
      await this.publishCapacityEvent(warehouse, capacity, CapacityLevel.LOCATION, locationId);
    }

    return LocationCapacityResponseDto.from(location, capacity);
  }

  async getBinCapacity(
    binId: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<BinCapacityResponseDto> {
    const bin = await this.binRepository.findById(binId, warehouseId, workspaceId);
    if (!bin) throw new ResourceNotFoundException('Warehouse bin', binId);

    const capacity = CapacitySnapshotDto.from(
      bin['capacity'] as number | null,
      (bin['occupiedCapacity'] as number) ?? 0,
      (bin['reservedCapacity'] as number) ?? 0,
      0,
      this.DEFAULT_WARNING_THRESHOLD,
      this.DEFAULT_CRITICAL_THRESHOLD,
    );

    let weightCapacity: CapacitySnapshotDto | undefined;
    if (bin['weightLimit']) {
      // Weight tracking would require additional stock metadata
      // For now, create a placeholder
      weightCapacity = CapacitySnapshotDto.from(
        bin['weightLimit'] as number,
        0,
        0,
        0,
        this.DEFAULT_WARNING_THRESHOLD,
        this.DEFAULT_CRITICAL_THRESHOLD,
      );
    }

    const warehouse = await this.warehouseRepository.findById(warehouseId, workspaceId);
    if (warehouse) {
      await this.publishCapacityEvent(warehouse, capacity, CapacityLevel.BIN, binId);
    }

    return BinCapacityResponseDto.from(bin, capacity, weightCapacity);
  }

  // ── Capacity Reservations ────────────────────────────────────

  async reserve(
    warehouseId: string,
    workspaceId: string,
    dto: ReserveCapacityDto,
  ): Promise<CapacityReservationResponseDto> {
    const warehouse = await this.warehouseRepository.findById(warehouseId, workspaceId);
    if (!warehouse) throw new ResourceNotFoundException('Warehouse', warehouseId);

    // Verify entity exists
    await this.verifyEntity(dto.level, dto.entityId, warehouseId, workspaceId);

    // Get current capacity
    const entity = await this.getEntity(dto.level, dto.entityId, warehouseId, workspaceId);
    const currentCapacity = entity['capacity'] as number | null;
    const currentOccupied = (entity['occupiedCapacity'] as number) ?? 0;
    const currentReserved = (entity['reservedCapacity'] as number) ?? 0;

    // Check if reservation would exceed capacity
    if (currentCapacity !== null) {
      const available = currentCapacity - currentOccupied - currentReserved;
      if (dto.quantity > available) {
        throw new BusinessRuleException(
          `Insufficient capacity: requested ${dto.quantity}, available ${available}`,
          ErrorCode.WAREHOUSE_CAPACITY_INSUFFICIENT,
        );
      }
    }

    // Create reservation
    const expiresAt = dto.expiresInSeconds
      ? new Date(Date.now() + dto.expiresInSeconds * 1000)
      : null;

    const reservation = await this.capacityRepository.createReservation({
      workspaceId,
      warehouseId,
      level: dto.level,
      entityId: dto.entityId,
      measure: dto.measure ?? CapacityMeasure.UNIT,
      quantity: dto.quantity,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      expiresAt,
    });

    // Update reserved capacity
    await this.updateEntityReservedCapacity(
      dto.level,
      dto.entityId,
      currentReserved + dto.quantity,
    );

    // Publish event
    const capacity = CapacitySnapshotDto.from(
      currentCapacity,
      currentOccupied,
      currentReserved + dto.quantity,
      0,
      this.DEFAULT_WARNING_THRESHOLD,
      this.DEFAULT_CRITICAL_THRESHOLD,
    );

    await this.eventQueue.enqueue({
      warehouseId,
      code: warehouse['code'] as string,
      workspaceId,
      event: CapacityEvent.RESERVED as unknown as import('./interfaces').WarehouseEvent,
      metadata: {
        level: dto.level,
        entityId: dto.entityId,
        quantity: dto.quantity,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        capacity: capacity,
      },
    });

    return CapacityReservationResponseDto.from(reservation);
  }

  async release(
    warehouseId: string,
    workspaceId: string,
    dto: ReleaseCapacityDto,
  ): Promise<{ released: number }> {
    const warehouse = await this.warehouseRepository.findById(warehouseId, workspaceId);
    if (!warehouse) throw new ResourceNotFoundException('Warehouse', warehouseId);

    // Find and release reservations
    const reservations = await this.capacityRepository.findByReference(
      dto.referenceType,
      dto.referenceId,
    );

    const released = await this.capacityRepository.releaseByReference(
      dto.referenceType,
      dto.referenceId,
    );

    // Update reserved capacity for affected entities
    const entityUpdates = new Map<string, { level: CapacityLevel; entityId: string; quantity: number }>();

    for (const reservation of reservations) {
      const key = `${reservation['level']}-${reservation['entityId']}`;
      const existing = entityUpdates.get(key);
      if (existing) {
        existing.quantity += reservation['quantity'] as number;
      } else {
        entityUpdates.set(key, {
          level: reservation['level'] as CapacityLevel,
          entityId: reservation['entityId'] as string,
          quantity: reservation['quantity'] as number,
        });
      }
    }

    for (const [, update] of entityUpdates) {
      const entity = await this.getEntity(update.level, update.entityId, warehouseId, workspaceId);
      const currentReserved = (entity['reservedCapacity'] as number) ?? 0;
      await this.updateEntityReservedCapacity(
        update.level,
        update.entityId,
        Math.max(0, currentReserved - update.quantity),
      );
    }

    // Publish event
    await this.eventQueue.enqueue({
      warehouseId,
      code: warehouse['code'] as string,
      workspaceId,
      event: CapacityEvent.RELEASED as unknown as import('./interfaces').WarehouseEvent,
      metadata: {
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        released,
      },
    });

    return { released };
  }

  async recalculate(
    warehouseId: string,
    workspaceId: string,
    dto: RecalculateCapacityDto,
  ): Promise<CapacitySnapshotDto> {
    const warehouse = await this.warehouseRepository.findById(warehouseId, workspaceId);
    if (!warehouse) throw new ResourceNotFoundException('Warehouse', warehouseId);

    const entity = await this.getEntity(dto.level, dto.entityId, warehouseId, workspaceId);

    // Recalculate reserved from active reservations
    const totalReserved = await this.capacityRepository.getTotalReserved(
      dto.level,
      dto.entityId,
      CapacityMeasure.UNIT,
    );

    await this.updateEntityReservedCapacity(dto.level, dto.entityId, totalReserved);

    const capacity = CapacitySnapshotDto.from(
      entity['capacity'] as number | null,
      (entity['occupiedCapacity'] as number) ?? 0,
      totalReserved,
      0,
      this.DEFAULT_WARNING_THRESHOLD,
      this.DEFAULT_CRITICAL_THRESHOLD,
    );

    await this.eventQueue.enqueue({
      warehouseId,
      code: warehouse['code'] as string,
      workspaceId,
      event: CapacityEvent.RECALCULATED as unknown as import('./interfaces').WarehouseEvent,
      metadata: {
        level: dto.level,
        entityId: dto.entityId,
        capacity,
      },
    });

    return capacity;
  }

  // ── Helper Methods ───────────────────────────────────────────

  private get prisma() {
    return this.capacityRepository['prisma'] as Record<string, Record<string, unknown>>;
  }

  private async verifyEntity(
    level: CapacityLevel,
    entityId: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<void> {
    const entity = await this.getEntity(level, entityId, warehouseId, workspaceId);
    if (!entity) {
      throw new ResourceNotFoundException(this.getLevelName(level), entityId);
    }
  }

  private async getEntity(
    level: CapacityLevel,
    entityId: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>> {
    switch (level) {
      case CapacityLevel.WAREHOUSE:
        return this.warehouseRepository.findById(entityId, workspaceId) as Promise<Record<string, unknown>>;
      case CapacityLevel.ZONE:
        return this.zoneRepository.findById(entityId, warehouseId, workspaceId) as Promise<Record<string, unknown>>;
      case CapacityLevel.LOCATION:
        return this.locationRepository.findById(entityId, warehouseId, workspaceId) as Promise<Record<string, unknown>>;
      case CapacityLevel.BIN:
        return this.binRepository.findById(entityId, warehouseId, workspaceId) as Promise<Record<string, unknown>>;
    }
  }

  private async updateEntityReservedCapacity(
    level: CapacityLevel,
    entityId: string,
    reserved: number,
  ): Promise<void> {
    const modelName = this.getModelName(level);
    await (
      this.prisma[modelName]['update'] as (args: unknown) => Promise<unknown>
    )({
      where: { id: entityId },
      data: { reservedCapacity: reserved },
    });
  }

  private getModelName(level: CapacityLevel): string {
    switch (level) {
      case CapacityLevel.WAREHOUSE:
        return 'warehouse';
      case CapacityLevel.ZONE:
        return 'warehouseZone';
      case CapacityLevel.LOCATION:
        return 'warehouseLocation';
      case CapacityLevel.BIN:
        return 'warehouseBin';
    }
  }

  private getLevelName(level: CapacityLevel): string {
    switch (level) {
      case CapacityLevel.WAREHOUSE:
        return 'Warehouse';
      case CapacityLevel.ZONE:
        return 'Zone';
      case CapacityLevel.LOCATION:
        return 'Location';
      case CapacityLevel.BIN:
        return 'Bin';
    }
  }

  private async publishCapacityEvent(
    warehouse: Record<string, unknown>,
    capacity: CapacitySnapshotDto,
    level: CapacityLevel,
    entityId: string,
  ): Promise<void> {
    let event: CapacityEvent | null = null;

    if (capacity.status === CapacityStatus.EXCEEDED) {
      event = CapacityEvent.EXCEEDED;
    } else if (
      capacity.status === CapacityStatus.CRITICAL ||
      capacity.status === CapacityStatus.NEAR_CAPACITY
    ) {
      event = CapacityEvent.WARNING;
    }

    if (event) {
      await this.eventQueue.enqueue({
        warehouseId: warehouse['id'] as string,
        code: warehouse['code'] as string,
        workspaceId: warehouse['workspaceId'] as string,
        event: event as unknown as import('./interfaces').WarehouseEvent,
        metadata: {
          level,
          entityId,
          capacity,
        },
      });
    }
  }
}
