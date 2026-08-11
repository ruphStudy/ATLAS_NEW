import { Injectable } from '@nestjs/common';
import {
  BusinessRuleException,
  DuplicateResourceException,
  ResourceNotFoundException,
} from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { WarehouseRepository } from './warehouse.repository';
import { WarehouseLocationRepository } from './warehouse-location.repository';
import { WarehouseBinRepository } from './warehouse-bin.repository';
import { WarehouseEventQueue } from './jobs';
import {
  CreateWarehouseBinDto,
  UpdateWarehouseBinDto,
  WarehouseBinFilterDto,
  WarehouseBinListResponseDto,
  WarehouseBinResponseDto,
  WarehouseBinHistoryResponseDto,
  ActivateBinDto,
  DeactivateBinDto,
  BlockBinDto,
  ArchiveBinDto,
  RestoreBinDto,
} from './dto';
import { BinType, BinStatus, BinMode, BinEvent, StorageCondition } from './interfaces';
import { WAREHOUSE_CONSTANTS } from './constants';

@Injectable()
export class WarehouseBinService {
  constructor(
    private readonly warehouseRepository: WarehouseRepository,
    private readonly locationRepository: WarehouseLocationRepository,
    private readonly repository: WarehouseBinRepository,
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
    if (!record) throw new ResourceNotFoundException('Warehouse bin', id);
    return record;
  }

  private async recordHistory(
    binId: string,
    workspaceId: string,
    fromStatus: BinStatus | null,
    toStatus: BinStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      binId,
      workspaceId,
      fromStatus,
      toStatus,
      reason,
      changedBy,
    });
  }

  private async publishEvent(
    bin: Record<string, unknown>,
    warehouse: Record<string, unknown>,
    event: BinEvent,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      warehouseId: warehouse['id'] as string,
      code: `${warehouse['code'] as string}/${bin['code'] as string}`,
      workspaceId: warehouse['workspaceId'] as string,
      event: event as unknown as import('./interfaces').WarehouseEvent,
      metadata: { ...metadata, binId: bin['id'], binCode: bin['code'] },
    });
  }

  private assertStatusTransition(current: BinStatus, next: BinStatus): void {
    const allowed = WAREHOUSE_CONSTANTS.ALLOWED_BIN_STATUS_TRANSITIONS[current];
    if (!allowed?.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition bin from ${current} to ${next}`,
        ErrorCode.WAREHOUSE_BIN_INVALID_STATUS_TRANSITION,
      );
    }
  }

  private validateCapacity(bin: Record<string, unknown>, requestedCapacity?: number | null): void {
    if (requestedCapacity === null || requestedCapacity === undefined) return;
    const occupied = (bin['occupiedCapacity'] as number) ?? 0;
    const reserved = (bin['reservedCapacity'] as number) ?? 0;
    if (requestedCapacity < occupied + reserved) {
      throw new BusinessRuleException(
        `Bin capacity cannot be less than occupied (${occupied}) + reserved (${reserved})`,
        ErrorCode.WAREHOUSE_BIN_CAPACITY_EXCEEDED,
      );
    }
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    warehouseId: string,
    workspaceId: string,
    dto: CreateWarehouseBinDto,
    createdBy: string,
  ): Promise<WarehouseBinResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);

    const existing = await this.repository.findByCode(dto.code, warehouseId);
    if (existing) {
      throw new DuplicateResourceException('Warehouse bin', 'code', dto.code);
    }

    if (dto.locationId) {
      await this.locationRepository.findById(dto.locationId, warehouseId, workspaceId);
    }

    const record = await this.repository.create({
      workspaceId,
      warehouseId,
      code: dto.code,
      name: dto.name ?? null,
      type: dto.type ?? BinType.STORAGE,
      status: BinStatus.ACTIVE,
      mode: dto.mode ?? BinMode.FIXED,
      locationId: dto.locationId ?? null,
      zone: dto.zone ?? null,
      barcode: dto.barcode ?? null,
      capacity: dto.capacity ?? null,
      occupiedCapacity: 0,
      reservedCapacity: 0,
      weightLimit: dto.weightLimit ?? null,
      dimensionLength: dto.dimensionLength ?? null,
      dimensionWidth: dto.dimensionWidth ?? null,
      dimensionHeight: dto.dimensionHeight ?? null,
      dimensionUnit: dto.dimensionUnit ?? null,
      allowedProductIds: dto.allowedProductIds ?? [],
      allowedCategoryIds: dto.allowedCategoryIds ?? [],
      allowedStatuses: dto.allowedStatuses ?? [],
      allowBatch: dto.allowBatch ?? true,
      allowSerial: dto.allowSerial ?? true,
      storageConditions: dto.storageConditions ?? [],
      metadata: dto.metadata ?? {},
    });

    await this.recordHistory(
      record['id'] as string,
      workspaceId,
      null,
      BinStatus.ACTIVE,
      'Bin created',
      createdBy,
    );
    await this.publishEvent(record, warehouse, BinEvent.CREATED);

    return WarehouseBinResponseDto.from(record);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    warehouseId: string,
    workspaceId: string,
    filter: WarehouseBinFilterDto,
  ): Promise<WarehouseBinListResponseDto> {
    await this.findWarehouseOrFail(warehouseId, workspaceId);
    const [items, total] = await this.repository.findAll(warehouseId, workspaceId, filter);
    return WarehouseBinListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(
    id: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<WarehouseBinResponseDto> {
    const record = await this.findOrFail(id, warehouseId, workspaceId);
    return WarehouseBinResponseDto.from(record);
  }

  async getHistory(
    id: string,
    warehouseId: string,
    workspaceId: string,
  ): Promise<WarehouseBinHistoryResponseDto[]> {
    await this.findOrFail(id, warehouseId, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(WarehouseBinHistoryResponseDto.from);
  }

  // ── Update ───────────────────────────────────────────────────

  async update(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: UpdateWarehouseBinDto,
    userId: string,
  ): Promise<WarehouseBinResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const bin = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = bin['status'] as BinStatus;

    if (dto.code) {
      const existing = await this.repository.findByCode(dto.code, warehouseId);
      if (existing && existing['id'] !== id) {
        throw new DuplicateResourceException('Warehouse bin', 'code', dto.code);
      }
    }

    if (dto.locationId !== undefined && dto.locationId) {
      await this.locationRepository.findById(dto.locationId, warehouseId, workspaceId);
    }

    if (dto.status && dto.status !== currentStatus) {
      this.assertStatusTransition(currentStatus, dto.status);
    }

    if (dto.capacity !== undefined) {
      this.validateCapacity(bin, dto.capacity);
    }

    const updated = await this.repository.update(id, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.mode !== undefined && { mode: dto.mode }),
      ...(dto.locationId !== undefined && { locationId: dto.locationId }),
      ...(dto.zone !== undefined && { zone: dto.zone }),
      ...(dto.barcode !== undefined && { barcode: dto.barcode }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.weightLimit !== undefined && { weightLimit: dto.weightLimit }),
      ...(dto.dimensionLength !== undefined && { dimensionLength: dto.dimensionLength }),
      ...(dto.dimensionWidth !== undefined && { dimensionWidth: dto.dimensionWidth }),
      ...(dto.dimensionHeight !== undefined && { dimensionHeight: dto.dimensionHeight }),
      ...(dto.dimensionUnit !== undefined && { dimensionUnit: dto.dimensionUnit }),
      ...(dto.allowedProductIds !== undefined && { allowedProductIds: dto.allowedProductIds }),
      ...(dto.allowedCategoryIds !== undefined && {
        allowedCategoryIds: dto.allowedCategoryIds,
      }),
      ...(dto.allowedStatuses !== undefined && { allowedStatuses: dto.allowedStatuses }),
      ...(dto.allowBatch !== undefined && { allowBatch: dto.allowBatch }),
      ...(dto.allowSerial !== undefined && { allowSerial: dto.allowSerial }),
      ...(dto.storageConditions !== undefined && { storageConditions: dto.storageConditions }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
    });

    if (dto.status && dto.status !== currentStatus) {
      await this.recordHistory(id, workspaceId, currentStatus, dto.status, 'Status updated', userId);
    }

    await this.publishEvent(updated, warehouse, BinEvent.UPDATED);

    return WarehouseBinResponseDto.from(updated);
  }

  // ── Status Transitions ───────────────────────────────────────

  async activate(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: ActivateBinDto,
    userId: string,
  ): Promise<WarehouseBinResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const bin = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = bin['status'] as BinStatus;
    this.assertStatusTransition(currentStatus, BinStatus.ACTIVE);

    const updated = await this.repository.update(id, { status: BinStatus.ACTIVE });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      BinStatus.ACTIVE,
      dto.notes ?? 'Bin activated',
      userId,
    );
    await this.publishEvent(updated, warehouse, BinEvent.ACTIVATED);

    return WarehouseBinResponseDto.from(updated);
  }

  async deactivate(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: DeactivateBinDto,
    userId: string,
  ): Promise<WarehouseBinResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const bin = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = bin['status'] as BinStatus;
    this.assertStatusTransition(currentStatus, BinStatus.INACTIVE);

    const hasActiveInventory = await this.repository.hasActiveInventory(id);
    if (hasActiveInventory) {
      throw new BusinessRuleException(
        'Cannot deactivate bin with active inventory',
        ErrorCode.WAREHOUSE_BIN_HAS_INVENTORY,
      );
    }

    const hasReservations = await this.repository.hasReservations(id);
    if (hasReservations) {
      throw new BusinessRuleException(
        'Cannot deactivate bin with active reservations',
        ErrorCode.WAREHOUSE_BIN_HAS_RESERVATIONS,
      );
    }

    const hasPendingOps = await this.repository.hasPendingOperations(id);
    if (hasPendingOps) {
      throw new BusinessRuleException(
        'Cannot deactivate bin with pending warehouse operations',
        ErrorCode.WAREHOUSE_BIN_HAS_PENDING_OPERATIONS,
      );
    }

    const updated = await this.repository.update(id, { status: BinStatus.INACTIVE });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      BinStatus.INACTIVE,
      dto.reason ?? 'Bin deactivated',
      userId,
    );
    await this.publishEvent(updated, warehouse, BinEvent.DEACTIVATED);

    return WarehouseBinResponseDto.from(updated);
  }

  async block(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: BlockBinDto,
    userId: string,
  ): Promise<WarehouseBinResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const bin = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = bin['status'] as BinStatus;
    this.assertStatusTransition(currentStatus, BinStatus.BLOCKED);

    const updated = await this.repository.update(id, { status: BinStatus.BLOCKED });

    await this.recordHistory(id, workspaceId, currentStatus, BinStatus.BLOCKED, dto.reason, userId);
    await this.publishEvent(updated, warehouse, BinEvent.BLOCKED);

    return WarehouseBinResponseDto.from(updated);
  }

  async archive(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: ArchiveBinDto,
    userId: string,
  ): Promise<WarehouseBinResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const bin = await this.findOrFail(id, warehouseId, workspaceId);
    const currentStatus = bin['status'] as BinStatus;
    this.assertStatusTransition(currentStatus, BinStatus.ARCHIVED);

    const hasActiveInventory = await this.repository.hasActiveInventory(id);
    if (hasActiveInventory) {
      throw new BusinessRuleException(
        'Cannot archive bin with active inventory',
        ErrorCode.WAREHOUSE_BIN_HAS_INVENTORY,
      );
    }

    const hasReservations = await this.repository.hasReservations(id);
    if (hasReservations) {
      throw new BusinessRuleException(
        'Cannot archive bin with active reservations',
        ErrorCode.WAREHOUSE_BIN_HAS_RESERVATIONS,
      );
    }

    const hasPendingOps = await this.repository.hasPendingOperations(id);
    if (hasPendingOps) {
      throw new BusinessRuleException(
        'Cannot archive bin with pending warehouse operations',
        ErrorCode.WAREHOUSE_BIN_HAS_PENDING_OPERATIONS,
      );
    }

    const updated = await this.repository.update(id, { status: BinStatus.ARCHIVED });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      BinStatus.ARCHIVED,
      dto.reason ?? 'Bin archived',
      userId,
    );
    await this.publishEvent(updated, warehouse, BinEvent.ARCHIVED);

    return WarehouseBinResponseDto.from(updated);
  }

  async restore(
    id: string,
    warehouseId: string,
    workspaceId: string,
    dto: RestoreBinDto,
    userId: string,
  ): Promise<WarehouseBinResponseDto> {
    const warehouse = await this.findWarehouseOrFail(warehouseId, workspaceId);
    const bin = await this.findOrFail(id, warehouseId, workspaceId);

    if (!bin['deletedAt']) {
      throw new BusinessRuleException('Bin is not deleted', ErrorCode.INVALID_INPUT);
    }

    const updated = await this.repository.restore(id);

    await this.recordHistory(
      id,
      workspaceId,
      BinStatus.ARCHIVED,
      BinStatus.INACTIVE,
      dto.notes ?? 'Bin restored',
      userId,
    );
    await this.publishEvent(updated, warehouse, BinEvent.RESTORED);

    return WarehouseBinResponseDto.from(updated);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, warehouseId: string, workspaceId: string): Promise<void> {
    await this.findOrFail(id, warehouseId, workspaceId);

    const hasActiveInventory = await this.repository.hasActiveInventory(id);
    if (hasActiveInventory) {
      throw new BusinessRuleException(
        'Cannot delete bin with active inventory',
        ErrorCode.WAREHOUSE_BIN_HAS_INVENTORY,
      );
    }

    const hasReservations = await this.repository.hasReservations(id);
    if (hasReservations) {
      throw new BusinessRuleException(
        'Cannot delete bin with active reservations',
        ErrorCode.WAREHOUSE_BIN_HAS_RESERVATIONS,
      );
    }

    const hasPendingOps = await this.repository.hasPendingOperations(id);
    if (hasPendingOps) {
      throw new BusinessRuleException(
        'Cannot delete bin with pending warehouse operations',
        ErrorCode.WAREHOUSE_BIN_HAS_PENDING_OPERATIONS,
      );
    }

    await this.repository.softDelete(id);
  }
}
