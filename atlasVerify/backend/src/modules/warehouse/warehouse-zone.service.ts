import { Injectable } from '@nestjs/common';
import {
  BusinessRuleException,
  DuplicateResourceException,
  ResourceNotFoundException,
} from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { WarehouseRepository } from './warehouse.repository';
import { WarehouseZoneRepository } from './warehouse-zone.repository';
import { WarehouseEventQueue } from './jobs';
import {
  CreateWarehouseZoneDto,
  UpdateWarehouseZoneDto,
  WarehouseZoneFilterDto,
  WarehouseZoneListResponseDto,
  WarehouseZoneResponseDto,
  WarehouseZoneHistoryResponseDto,
  ActivateZoneDto,
  DeactivateZoneDto,
  BlockZoneDto,
  ArchiveZoneDto,
  RestoreZoneDto,
} from './dto';
import { ZoneType, ZoneStatus, ZoneEvent, StorageCondition } from './interfaces';
import { WAREHOUSE_CONSTANTS } from './constants';

@Injectable()
export class WarehouseZoneService {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly repository: WarehouseZoneRepository,
    private readonly eventQueue: WarehouseEventQueue,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findWarehouseOrFail(
    warehouseId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>> {
    const warehouse = await this.warehouseRepository.findById(warehouseId, workspaceId);
    if (!warehouse) throw new ResourceNotFoundException('Warehouse', warehouseId);
    return warehouse;
  }

  private async findOrFail(
    id: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, warehouseId, workspaceId);
    if (!record) throw new ResourceNotFoundException('Warehouse zone', id);
    return record;
  }

  private async recordHistory(
    zoneId: string,
    workspaceId: string,
    fromStatus: ZoneStatus | null,
    toStatus: ZoneStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      zoneId,
      workspaceId,
      fromStatus,
      toStatus,
      reason,
      changedBy,
    });
  }

  private async publishEvent(
    zone: Record<string, unknown>,
    warehouse: Record<string, unknown>,
    event: ZoneEvent,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      warehouseId: warehouse['id'] as string,
      code: `${warehouse['code'] as string}/${zone['code'] as string}`,
      workspaceId: warehouse['workspaceId'] as string,
      event: event as unknown as import('./interfaces').WarehouseEvent,
      metadata: { ...metadata, zoneId: zone['id'], zoneCode: zone['code'] },
    });
  }

  private assertStatusTransition(current: ZoneStatus, next: ZoneStatus): void {
    const allowed = WAREHOUSE_CONSTANTS.ALLOWED_ZONE_STATUS_TRANSITIONS[current];
    if (!allowed?.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition zone from ${current} to ${next}`,
        ErrorCode.WAREHOUSE_ZONE_INVALID_STATUS_TRANSITION,
      );
    }
  }

  private validateCapacity(zone: Record<string, unknown>, requestedCapacity?: number | null): void {
    if (requestedCapacity === null || requestedCapacity === undefined) return;
    const occupied = (zone['occupiedCapacity'] as number) ?? 0;
    const reserved = (zone['reservedCapacity'] as number) ?? 0;
    if (requestedCapacity < occupied + reserved) {
      throw new BusinessRuleException(
        `Zone capacity cannot be less than occupied (${occupied}) + reserved (${reserved})`,
        ErrorCode.WAREHOUSE_ZONE_CAPACITY_EXCEEDED,
      );
    }
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    warehouseId: string,
    workspaceId: string,
    dto: CreateWarehouseZoneDto,
    createdBy: string,
  ): Promise<WarehouseZoneResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);

    const existing = await this.repository.findByCode(dto.code, warehouseId);
    if (existing) {
      throw new DuplicateResourceException('Warehouse zone', 'code', dto.code);
    }

    const record = await this.repository.create({
      workspaceId,
      warehouseId,
      code: dto.code,
      name: dto.name ?? null,
      type: dto.type ?? ZoneType.STORAGE,
      status: ZoneStatus.ACTIVE,
      priority: dto.priority ?? 0,
      capacity: dto.capacity ?? null,
      occupiedCapacity: 0,
      reservedCapacity: 0,
      allowedCategoryIds: dto.allowedCategoryIds ?? [],
      allowedStatuses: dto.allowedStatuses ?? [],
      allowBatch: dto.allowBatch ?? true,
      allowSerial: dto.allowSerial ?? true,
      storageConditions: dto.storageConditions ?? [],
      handlingRequirements: dto.handlingRequirements ?? [],
      metadata: dto.metadata ?? {},
    });

    await this.recordHistory(
      record['id'] as string,
      workspaceId,
      null,
      ZoneStatus.ACTIVE,
      'Zone created',
      createdBy,
    );
    await this.publishEvent(record, warehouse, ZoneEvent.CREATED);

    return WarehouseZoneResponseDto.from(record);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    warehouseId: string,
    workspaceId: string,
    filter: WarehouseZoneFilterDto,
  ): Promise<WarehouseZoneListResponseDto> {
    await this.findWarehouseOrFail(warehouseId, workspaceId);
    const [items, total] = await this.repository.findAll(warehouseId, workspaceId, filter);
    return WarehouseZoneListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(
    id: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<WarehouseZoneResponseDto> {
    const record = await this.findOrFail(id, warehouseId, workspaceId);
    return WarehouseZoneResponseDto.from(record);
  }

  async getHistory(
    id: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<WarehouseZoneHistoryResponseDto[]> {
    await this.findOrFail(id, warehouseId, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(WarehouseZoneHistoryResponseDto.from);
  }

  // ── Update ───────────────────────────────────────────────────

  async update(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: UpdateWarehouseZoneDto,
    userId: string,
  ): Promise<WarehouseZoneResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const zone = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = zone['status'] as ZoneStatus;

    if (dto.code) {
      const existing = await this.repository.findByCode(dto.code, warehouseId);
      if (existing && existing['id'] !== id) {
        throw new DuplicateResourceException('Warehouse zone', 'code', dto.code);
      }
    }

    if (dto.status && dto.status !== currentStatus) {
      this.assertStatusTransition(currentStatus, dto.status);
    }

    if (dto.capacity !== undefined) {
      this.validateCapacity(zone, dto.capacity);
    }

    const updated = await this.repository.update(id, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.allowedCategoryIds !== undefined && {
        allowedCategoryIds: dto.allowedCategoryIds,
      }),
      ...(dto.allowedStatuses !== undefined && { allowedStatuses: dto.allowedStatuses }),
      ...(dto.allowBatch !== undefined && { allowBatch: dto.allowBatch }),
      ...(dto.allowSerial !== undefined && { allowSerial: dto.allowSerial }),
      ...(dto.storageConditions !== undefined && { storageConditions: dto.storageConditions }),
      ...(dto.handlingRequirements !== undefined && {
        handlingRequirements: dto.handlingRequirements,
      }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
    });

    if (dto.status && dto.status !== currentStatus) {
      await this.recordHistory(id, workspaceId, currentStatus, dto.status, 'Status updated', userId);
    }

    await this.publishEvent(updated, warehouse, ZoneEvent.UPDATED);

    return WarehouseZoneResponseDto.from(updated);
  }

  // ── Status Transitions ───────────────────────────────────────

  async activate(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: ActivateZoneDto,
    userId: string,
  ): Promise<WarehouseZoneResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const zone = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = zone['status'] as ZoneStatus;
    this.assertStatusTransition(currentStatus, ZoneStatus.ACTIVE);

    const updated = await this.repository.update(id, { status: ZoneStatus.ACTIVE });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      ZoneStatus.ACTIVE,
      dto.notes ?? 'Zone activated',
      userId,
    );
    await this.publishEvent(updated, warehouse, ZoneEvent.ACTIVATED);

    return WarehouseZoneResponseDto.from(updated);
  }

  async deactivate(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: DeactivateZoneDto,
    userId: string,
  ): Promise<WarehouseZoneResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const zone = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = zone['status'] as ZoneStatus;
    this.assertStatusTransition(currentStatus, ZoneStatus.INACTIVE);

    const hasActiveStock = await this.repository.hasActiveStock(id);
    if (hasActiveStock) {
      throw new BusinessRuleException(
        'Cannot deactivate zone with active stock',
        ErrorCode.WAREHOUSE_ZONE_HAS_STOCK,
      );
    }

    const hasPendingOps = await this.repository.hasPendingOperations(id);
    if (hasPendingOps) {
      throw new BusinessRuleException(
        'Cannot deactivate zone with pending warehouse operations',
        ErrorCode.WAREHOUSE_ZONE_HAS_PENDING_OPERATIONS,
      );
    }

    const updated = await this.repository.update(id, { status: ZoneStatus.INACTIVE });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      ZoneStatus.INACTIVE,
      dto.reason ?? 'Zone deactivated',
      userId,
    );
    await this.publishEvent(updated, warehouse, ZoneEvent.DEACTIVATED);

    return WarehouseZoneResponseDto.from(updated);
  }

  async block(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: BlockZoneDto,
    userId: string,
  ): Promise<WarehouseZoneResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const zone = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = zone['status'] as ZoneStatus;
    this.assertStatusTransition(currentStatus, ZoneStatus.BLOCKED);

    const updated = await this.repository.update(id, { status: ZoneStatus.BLOCKED });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      ZoneStatus.BLOCKED,
      dto.reason,
      userId,
    );
    await this.publishEvent(updated, warehouse, ZoneEvent.BLOCKED);

    return WarehouseZoneResponseDto.from(updated);
  }

  async archive(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: ArchiveZoneDto,
    userId: string,
  ): Promise<WarehouseZoneResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const zone = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = zone['status'] as ZoneStatus;
    this.assertStatusTransition(currentStatus, ZoneStatus.ARCHIVED);

    const hasActiveStock = await this.repository.hasActiveStock(id);
    if (hasActiveStock) {
      throw new BusinessRuleException(
        'Cannot archive zone with active stock',
        ErrorCode.WAREHOUSE_ZONE_HAS_STOCK,
      );
    }

    const hasPendingOps = await this.repository.hasPendingOperations(id);
    if (hasPendingOps) {
      throw new BusinessRuleException(
        'Cannot archive zone with pending warehouse operations',
        ErrorCode.WAREHOUSE_ZONE_HAS_PENDING_OPERATIONS,
      );
    }

    const updated = await this.repository.update(id, { status: ZoneStatus.ARCHIVED });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      ZoneStatus.ARCHIVED,
      dto.reason ?? 'Zone archived',
      userId,
    );
    await this.publishEvent(updated, warehouse, ZoneEvent.ARCHIVED);

    return WarehouseZoneResponseDto.from(updated);
  }

  async restore(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: RestoreZoneDto,
    userId: string,
  ): Promise<WarehouseZoneResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const zone = await this.findOrFail(id, warehouseId, workspaceId);

    if (!zone['deletedAt']) {
      throw new BusinessRuleException('Zone is not deleted', ErrorCode.INVALID_INPUT);
    }

    const updated = await this.repository.restore(id);

    await this.recordHistory(
      id,
      workspaceId,
      ZoneStatus.ARCHIVED,
      ZoneStatus.INACTIVE,
      dto.notes ?? 'Zone restored',
      userId,
    );
    await this.publishEvent(updated, warehouse, ZoneEvent.RESTORED);

    return WarehouseZoneResponseDto.from(updated);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, warehouseId: string, workspaceId: string): Promise<void> {
    await this.findOrFail(id, warehouseId, workspaceId);

    const hasActiveStock = await this.repository.hasActiveStock(id);
    if (hasActiveStock) {
      throw new BusinessRuleException(
        'Cannot delete zone with active stock',
        ErrorCode.WAREHOUSE_ZONE_HAS_STOCK,
      );
    }

    const hasPendingOps = await this.repository.hasPendingOperations(id);
    if (hasPendingOps) {
      throw new BusinessRuleException(
        'Cannot delete zone with pending warehouse operations',
        ErrorCode.WAREHOUSE_ZONE_HAS_PENDING_OPERATIONS,
      );
    }

    await this.repository.softDelete(id);
  }
}
