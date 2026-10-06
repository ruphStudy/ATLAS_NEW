import { Injectable } from '@nestjs/common';
import { BusinessRuleException, DuplicateResourceException, ResourceNotFoundException } from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { WarehouseRepository } from './warehouse.repository';
import { WarehouseLocationRepository } from './warehouse-location.repository';
import { WarehouseEventQueue } from './jobs';
import {
  CreateWarehouseLocationDto,
  UpdateWarehouseLocationDto,
  WarehouseLocationFilterDto,
  WarehouseLocationListResponseDto,
  WarehouseLocationResponseDto,
  WarehouseLocationHistoryResponseDto,
  ActivateLocationDto,
  DeactivateLocationDto,
  BlockLocationDto,
  ArchiveLocationDto,
  RestoreLocationDto,
} from './dto';
import { WarehouseLocationType, WarehouseLocationStatus, WarehouseLocationEvent } from './interfaces';
import { WAREHOUSE_CONSTANTS } from './constants';

@Injectable()
export class WarehouseLocationService {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly repository: WarehouseLocationRepository,
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
    if (!record) throw new ResourceNotFoundException('Warehouse location', id);
    return record;
  }

  private async recordHistory(
    locationId: string,
    workspaceId: string,
    fromStatus: WarehouseLocationStatus | null,
    toStatus: WarehouseLocationStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      locationId,
      workspaceId,
      fromStatus,
      toStatus,
      reason,
      changedBy,
    });
  }

  private async publishEvent(
    location: Record<string, unknown>,
    warehouse: Record<string, unknown>,
    event: WarehouseLocationEvent,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      warehouseId: warehouse['id'] as string,
      code: `${warehouse['code'] as string}/${location['code'] as string}`,
      workspaceId: warehouse['workspaceId'] as string,
      event: event as unknown as import('./interfaces').WarehouseEvent,
      metadata: { ...metadata, locationId: location['id'], locationCode: location['code'] },
    });
  }

  private assertStatusTransition(current: WarehouseLocationStatus, next: WarehouseLocationStatus): void {
    const allowed = WAREHOUSE_CONSTANTS.ALLOWED_LOCATION_STATUS_TRANSITIONS[current];
    if (!allowed?.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition location from ${current} to ${next}`,
        ErrorCode.WAREHOUSE_LOCATION_INVALID_STATUS_TRANSITION,
      );
    }
  }

  private async assertNoCircularHierarchy(
    locationId: string | null,
    parentLocationId: string | null,
    warehouseId: string,
    workspaceId: string,
  ): Promise<void> {
    if (!parentLocationId) return;
    if (locationId === parentLocationId) {
      throw new BusinessRuleException(
        'A location cannot be its own parent',
        ErrorCode.WAREHOUSE_LOCATION_CIRCULAR_HIERARCHY,
      );
    }

    let currentParentId: string | null = parentLocationId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        throw new BusinessRuleException(
          'Circular hierarchy detected in location parent chain',
          ErrorCode.WAREHOUSE_LOCATION_CIRCULAR_HIERARCHY,
        );
      }
      if (currentParentId === locationId) {
        throw new BusinessRuleException(
          'Cannot set a descendant as parent',
          ErrorCode.WAREHOUSE_LOCATION_CIRCULAR_HIERARCHY,
        );
      }
      visited.add(currentParentId);

      const parent = await this.repository.findById(currentParentId, warehouseId, workspaceId);
      currentParentId = (parent?.['parentLocationId'] as string | null) ?? null;
    }
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    warehouseId: string,
    workspaceId: string,
    dto: CreateWarehouseLocationDto,
    createdBy: string,
  ): Promise<WarehouseLocationResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);

    const existing = await this.repository.findByCode(dto.code, warehouseId);
    if (existing) {
      throw new DuplicateResourceException('Warehouse location', 'code', dto.code);
    }

    if (dto.parentLocationId) {
      await this.findOrFail(dto.parentLocationId, warehouseId, workspaceId);
      await this.assertNoCircularHierarchy(null, dto.parentLocationId, warehouseId, workspaceId);
    }

    const record = await this.repository.create({
      workspaceId,
      warehouseId,
      code: dto.code,
      name: dto.name ?? null,
      type: dto.type ?? WarehouseLocationType.BIN,
      status: WarehouseLocationStatus.ACTIVE,
      parentLocationId: dto.parentLocationId ?? null,
      zone: dto.zone ?? null,
      barcode: dto.barcode ?? null,
      capacity: dto.capacity ?? null,
      occupiedCapacity: 0,
      reservedCapacity: 0,
      dimensionLength: dto.dimensionLength ?? null,
      dimensionWidth: dto.dimensionWidth ?? null,
      dimensionHeight: dto.dimensionHeight ?? null,
      dimensionUnit: dto.dimensionUnit ?? null,
      metadata: dto.metadata ?? {},
    });

    await this.recordHistory(
      record['id'] as string,
      workspaceId,
      null,
      WarehouseLocationStatus.ACTIVE,
      'Location created',
      createdBy,
    );
    await this.publishEvent(record, warehouse, WarehouseLocationEvent.CREATED);

    return WarehouseLocationResponseDto.from(record);
  }

  // ── Read ─────────────────────────────────────────────────────

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    warehouseId: string,
    workspaceId: string,
    filter: WarehouseLocationFilterDto,
  ): Promise<WarehouseLocationListResponseDto> {
    await this.findWarehouseOrFail(warehouseId, workspaceId);
    const [items, total] = await this.repository.findAll(warehouseId, workspaceId, filter);
    return WarehouseLocationListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(
    id: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<WarehouseLocationResponseDto> {
    const record = await this.findOrFail(id, warehouseId, workspaceId);
    return WarehouseLocationResponseDto.from(record);
  }

  async getHistory(
    id: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<WarehouseLocationHistoryResponseDto[]> {
    await this.findOrFail(id, warehouseId, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(WarehouseLocationHistoryResponseDto.from);
  }

  // ── Update ───────────────────────────────────────────────────

  async update(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: UpdateWarehouseLocationDto,
    userId: string,
  ): Promise<WarehouseLocationResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const location = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = location['status'] as WarehouseLocationStatus;

    if (dto.code) {
      const existing = await this.repository.findByCode(dto.code, warehouseId);
      if (existing && existing['id'] !== id) {
        throw new DuplicateResourceException('Warehouse location', 'code', dto.code);
      }
    }

    if (dto.parentLocationId !== undefined) {
      await this.assertNoCircularHierarchy(id, dto.parentLocationId, warehouseId, workspaceId);
    }

    if (dto.status && dto.status !== currentStatus) {
      this.assertStatusTransition(currentStatus, dto.status);
    }

    const updated = await this.repository.update(id, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.parentLocationId !== undefined && { parentLocationId: dto.parentLocationId }),
      ...(dto.zone !== undefined && { zone: dto.zone }),
      ...(dto.barcode !== undefined && { barcode: dto.barcode }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.dimensionLength !== undefined && { dimensionLength: dto.dimensionLength }),
      ...(dto.dimensionWidth !== undefined && { dimensionWidth: dto.dimensionWidth }),
      ...(dto.dimensionHeight !== undefined && { dimensionHeight: dto.dimensionHeight }),
      ...(dto.dimensionUnit !== undefined && { dimensionUnit: dto.dimensionUnit }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
    });

    if (dto.status && dto.status !== currentStatus) {
      await this.recordHistory(id, workspaceId, currentStatus, dto.status, 'Status updated', userId);
    }

    await this.publishEvent(updated, warehouse, WarehouseLocationEvent.UPDATED);

    return WarehouseLocationResponseDto.from(updated);
  }

  // ── Status Transitions ───────────────────────────────────────

  async activate(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: ActivateLocationDto,
    userId: string,
  ): Promise<WarehouseLocationResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const location = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = location['status'] as WarehouseLocationStatus;
    this.assertStatusTransition(currentStatus, WarehouseLocationStatus.ACTIVE);

    const updated = await this.repository.update(id, { status: WarehouseLocationStatus.ACTIVE });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      WarehouseLocationStatus.ACTIVE,
      dto.notes ?? 'Location activated',
      userId,
    );
    await this.publishEvent(updated, warehouse, WarehouseLocationEvent.ACTIVATED);

    return WarehouseLocationResponseDto.from(updated);
  }

  async deactivate(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: DeactivateLocationDto,
    userId: string,
  ): Promise<WarehouseLocationResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const location = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = location['status'] as WarehouseLocationStatus;
    this.assertStatusTransition(currentStatus, WarehouseLocationStatus.INACTIVE);

    const hasActiveInventory = await this.repository.hasActiveInventory(id);
    if (hasActiveInventory) {
      throw new BusinessRuleException(
        'Cannot deactivate location with active inventory',
        ErrorCode.WAREHOUSE_LOCATION_HAS_INVENTORY,
      );
    }

    const updated = await this.repository.update(id, { status: WarehouseLocationStatus.INACTIVE });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      WarehouseLocationStatus.INACTIVE,
      dto.reason ?? 'Location deactivated',
      userId,
    );
    await this.publishEvent(updated, warehouse, WarehouseLocationEvent.DEACTIVATED);

    return WarehouseLocationResponseDto.from(updated);
  }

  async block(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: BlockLocationDto,
    userId: string,
  ): Promise<WarehouseLocationResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const location = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = location['status'] as WarehouseLocationStatus;
    this.assertStatusTransition(currentStatus, WarehouseLocationStatus.BLOCKED);

    const updated = await this.repository.update(id, { status: WarehouseLocationStatus.BLOCKED });

    await this.recordHistory(id, workspaceId, currentStatus, WarehouseLocationStatus.BLOCKED, dto.reason, userId);
    await this.publishEvent(updated, warehouse, WarehouseLocationEvent.BLOCKED);

    return WarehouseLocationResponseDto.from(updated);
  }

  async archive(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: ArchiveLocationDto,
    userId: string,
  ): Promise<WarehouseLocationResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const location = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = location['status'] as WarehouseLocationStatus;
    this.assertStatusTransition(currentStatus, WarehouseLocationStatus.ARCHIVED);

    const hasChildren = await this.repository.hasChildren(id);
    if (hasChildren) {
      throw new BusinessRuleException(
        'Cannot archive location with child locations',
        ErrorCode.WAREHOUSE_LOCATION_HAS_CHILDREN,
      );
    }

    const hasActiveInventory = await this.repository.hasActiveInventory(id);
    if (hasActiveInventory) {
      throw new BusinessRuleException(
        'Cannot archive location with active inventory',
        ErrorCode.WAREHOUSE_LOCATION_HAS_INVENTORY,
      );
    }

    const updated = await this.repository.update(id, { status: WarehouseLocationStatus.ARCHIVED });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      WarehouseLocationStatus.ARCHIVED,
      dto.reason ?? 'Location archived',
      userId,
    );
    await this.publishEvent(updated, warehouse, WarehouseLocationEvent.ARCHIVED);

    return WarehouseLocationResponseDto.from(updated);
  }

  async restore(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: RestoreLocationDto,
    userId: string,
  ): Promise<WarehouseLocationResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const location = await this.findOrFail(id, warehouseId, workspaceId);

    if (!location['deletedAt']) {
      throw new BusinessRuleException('Location is not deleted', ErrorCode.VALIDATION_FAILED);
    }

    const updated = await this.repository.restore(id);

    await this.recordHistory(
      id,
      workspaceId,
      WarehouseLocationStatus.ARCHIVED,
      WarehouseLocationStatus.INACTIVE,
      dto.notes ?? 'Location restored',
      userId,
    );
    await this.publishEvent(updated, warehouse, WarehouseLocationEvent.RESTORED);

    return WarehouseLocationResponseDto.from(updated);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, warehouseId: string, workspaceId: string): Promise<void> {
    await this.findOrFail(id, warehouseId, workspaceId);

    const hasChildren = await this.repository.hasChildren(id);
    if (hasChildren) {
      throw new BusinessRuleException(
        'Cannot delete location with child locations',
        ErrorCode.WAREHOUSE_LOCATION_HAS_CHILDREN,
      );
    }

    const hasActiveInventory = await this.repository.hasActiveInventory(id);
    if (hasActiveInventory) {
      throw new BusinessRuleException(
        'Cannot delete location with active inventory',
        ErrorCode.WAREHOUSE_LOCATION_HAS_INVENTORY,
      );
    }

    await this.repository.softDelete(id);
  }
}
