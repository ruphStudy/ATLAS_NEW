import { Injectable } from '@nestjs/common';
import { BusinessRuleException, DuplicateResourceException, ResourceNotFoundException } from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { WarehouseRepository } from './warehouse.repository';
import { WarehouseEventQueue } from './jobs';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  WarehouseFilterDto,
  WarehouseListResponseDto,
  WarehouseResponseDto,
  WarehouseHistoryResponseDto,
  ActivateWarehouseDto,
  DeactivateWarehouseDto,
  SuspendWarehouseDto,
  CloseWarehouseDto,
  ArchiveWarehouseDto,
  RestoreWarehouseDto,
} from './dto';
import { WAREHOUSE_CONSTANTS } from './constants';
import { WarehouseType, WarehouseStatus, WarehouseEvent } from './interfaces';

@Injectable()
export class WarehouseService {
  constructor(
    private readonly repository: WarehouseRepository,
    private readonly eventQueue: WarehouseEventQueue,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Warehouse', id);
    return record;
  }

  private async recordHistory(
    warehouseId: string,
    workspaceId: string,
    fromStatus: WarehouseStatus | null,
    toStatus: WarehouseStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      warehouseId,
      workspaceId,
      fromStatus,
      toStatus,
      reason,
      changedBy,
    });
  }

  private async publishEvent(
    warehouse: Record<string, unknown>,
    event: WarehouseEvent,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      warehouseId: warehouse['id'] as string,
      code: warehouse['code'] as string,
      workspaceId: warehouse['workspaceId'] as string,
      event,
      metadata,
    });
  }

  private assertStatusTransition(current: WarehouseStatus, next: WarehouseStatus): void {
    const allowed = WAREHOUSE_CONSTANTS.ALLOWED_STATUS_TRANSITIONS[current];
    if (!allowed?.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition warehouse from ${current} to ${next}`,
        ErrorCode.WAREHOUSE_INVALID_STATUS_TRANSITION,
      );
    }
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateWarehouseDto,
    createdBy: string,
  ): Promise<WarehouseResponseDto> {
    const existing = await this.repository.findByCode(dto.code, workspaceId);
    if (existing) {
      throw new DuplicateResourceException('Warehouse', 'code', dto.code);
    }

    const isFirstWarehouse = !(await this.repository.findDefault(workspaceId));
    const isDefault = dto.isDefault ?? isFirstWarehouse;

    if (isDefault) {
      await this.repository.clearDefault(workspaceId);
    }

    const record = await this.repository.create({
      workspaceId,
      code: dto.code,
      name: dto.name,
      type: dto.type ?? WarehouseType.OWN,
      status: WarehouseStatus.ACTIVE,
      addressLine1: dto.addressLine1 ?? null,
      addressLine2: dto.addressLine2 ?? null,
      city: dto.city ?? null,
      state: dto.state ?? null,
      country: dto.country ?? null,
      region: dto.region ?? null,
      postalCode: dto.postalCode ?? null,
      timezone: dto.timezone ?? WAREHOUSE_CONSTANTS.DEFAULT_TIMEZONE,
      currency: dto.currency ?? WAREHOUSE_CONSTANTS.DEFAULT_CURRENCY,
      contactName: dto.contactName ?? null,
      contactEmail: dto.contactEmail ?? null,
      contactPhone: dto.contactPhone ?? null,
      capacity: dto.capacity ?? null,
      isDefault,
      isPriority: dto.isPriority ?? false,
      isFallback: dto.isFallback ?? false,
      marketplaceAccountId: dto.marketplaceAccountId ?? null,
      metadata: dto.metadata ?? {},
    });

    await this.recordHistory(
      record['id'] as string,
      workspaceId,
      null,
      WarehouseStatus.ACTIVE,
      'Warehouse created',
      createdBy,
    );
    await this.publishEvent(record, WarehouseEvent.CREATED);

    return WarehouseResponseDto.from(record);
  }

  // ── Read ─────────────────────────────────────────────────────

  // ── Read ─────────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: WarehouseFilterDto): Promise<WarehouseListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return WarehouseListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<WarehouseResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return WarehouseResponseDto.from(record);
  }

  async getHistory(id: string, workspaceId: string): Promise<WarehouseHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(WarehouseHistoryResponseDto.from);
  }

  // ── Update ───────────────────────────────────────────────────

  async update(
    id: string,
    workspaceId: string,
    dto: UpdateWarehouseDto,
    userId: string,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.findOrFail(id, workspaceId);
    const currentStatus = warehouse['status'] as WarehouseStatus;

    if (dto.code) {
      const existing = await this.repository.findByCode(dto.code, workspaceId);
      if (existing && existing['id'] !== id) {
        throw new DuplicateResourceException('Warehouse', 'code', dto.code);
      }
    }

    if (dto.status && dto.status !== currentStatus) {
      this.assertStatusTransition(currentStatus, dto.status);
    }

    if (dto.isDefault) {
      await this.repository.clearDefault(workspaceId, id);
    }

    const updated = await this.repository.update(id, {
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
      ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.state !== undefined && { state: dto.state }),
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.region !== undefined && { region: dto.region }),
      ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
      ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.contactName !== undefined && { contactName: dto.contactName }),
      ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
      ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
      ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      ...(dto.isPriority !== undefined && { isPriority: dto.isPriority }),
      ...(dto.isFallback !== undefined && { isFallback: dto.isFallback }),
      ...(dto.marketplaceAccountId !== undefined && { marketplaceAccountId: dto.marketplaceAccountId }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
    });

    if (dto.status && dto.status !== currentStatus) {
      await this.recordHistory(id, workspaceId, currentStatus, dto.status, 'Status updated', userId);
    }

    await this.publishEvent(updated, WarehouseEvent.UPDATED);

    return WarehouseResponseDto.from(updated);
  }

  // ── Status Transitions ───────────────────────────────────────

  async activate(
    id: string,
    workspaceId: string,
    dto: ActivateWarehouseDto,
    userId: string,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.findOrFail(id, workspaceId);
    const currentStatus = warehouse['status'] as WarehouseStatus;
    this.assertStatusTransition(currentStatus, WarehouseStatus.ACTIVE);

    const updated = await this.repository.update(id, { status: WarehouseStatus.ACTIVE });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      WarehouseStatus.ACTIVE,
      dto.notes ?? 'Warehouse activated',
      userId,
    );
    await this.publishEvent(updated, WarehouseEvent.ACTIVATED);

    return WarehouseResponseDto.from(updated);
  }

  async deactivate(
    id: string,
    workspaceId: string,
    dto: DeactivateWarehouseDto,
    userId: string,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.findOrFail(id, workspaceId);
    const currentStatus = warehouse['status'] as WarehouseStatus;
    this.assertStatusTransition(currentStatus, WarehouseStatus.INACTIVE);

    const updated = await this.repository.update(id, { status: WarehouseStatus.INACTIVE });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      WarehouseStatus.INACTIVE,
      dto.reason ?? 'Warehouse deactivated',
      userId,
    );
    await this.publishEvent(updated, WarehouseEvent.DEACTIVATED);

    return WarehouseResponseDto.from(updated);
  }

  async suspend(
    id: string,
    workspaceId: string,
    dto: SuspendWarehouseDto,
    userId: string,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.findOrFail(id, workspaceId);
    const currentStatus = warehouse['status'] as WarehouseStatus;
    this.assertStatusTransition(currentStatus, WarehouseStatus.SUSPENDED);

    const updated = await this.repository.update(id, { status: WarehouseStatus.SUSPENDED });

    await this.recordHistory(id, workspaceId, currentStatus, WarehouseStatus.SUSPENDED, dto.reason, userId);
    await this.publishEvent(updated, WarehouseEvent.SUSPENDED);

    return WarehouseResponseDto.from(updated);
  }

  async close(
    id: string,
    workspaceId: string,
    dto: CloseWarehouseDto,
    userId: string,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.findOrFail(id, workspaceId);
    const currentStatus = warehouse['status'] as WarehouseStatus;
    this.assertStatusTransition(currentStatus, WarehouseStatus.CLOSED);

    const updated = await this.repository.update(id, { status: WarehouseStatus.CLOSED });

    await this.recordHistory(id, workspaceId, currentStatus, WarehouseStatus.CLOSED, dto.reason, userId);
    await this.publishEvent(updated, WarehouseEvent.CLOSED);

    return WarehouseResponseDto.from(updated);
  }

  async archive(
    id: string,
    workspaceId: string,
    dto: ArchiveWarehouseDto,
    userId: string,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.findOrFail(id, workspaceId);
    const currentStatus = warehouse['status'] as WarehouseStatus;
    this.assertStatusTransition(currentStatus, WarehouseStatus.ARCHIVED);

    const updated = await this.repository.update(id, { status: WarehouseStatus.ARCHIVED });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      WarehouseStatus.ARCHIVED,
      dto.reason ?? 'Warehouse archived',
      userId,
    );
    await this.publishEvent(updated, WarehouseEvent.ARCHIVED);

    return WarehouseResponseDto.from(updated);
  }

  async restore(
    id: string,
    workspaceId: string,
    dto: RestoreWarehouseDto,
    userId: string,
  ): Promise<WarehouseResponseDto> {
    const warehouse = await this.findOrFail(id, workspaceId);

    if (!warehouse['deletedAt']) {
      throw new BusinessRuleException('Warehouse is not deleted', ErrorCode.INVALID_INPUT);
    }

    const updated = await this.repository.restore(id);

    await this.recordHistory(
      id,
      workspaceId,
      WarehouseStatus.ARCHIVED,
      WarehouseStatus.INACTIVE,
      dto.notes ?? 'Warehouse restored',
      userId,
    );
    await this.publishEvent(updated, WarehouseEvent.RESTORED);

    return WarehouseResponseDto.from(updated);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    await this.findOrFail(id, workspaceId);
    await this.repository.softDelete(id);
  }
}
