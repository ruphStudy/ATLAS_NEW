import { Injectable } from '@nestjs/common';
import { DuplicateResourceException, ResourceNotFoundException } from '@common/exceptions/atlas.exception';
import { InventoryRepository } from '../inventory.repository';
import { InventorySerialRepository } from './inventory-serial.repository';
import { InventoryValidator } from '../validator/inventory.validator';
import { InventoryEventQueue } from '../jobs';
import { InventoryEvent, InventoryStockStatus } from '../interfaces';
import {
  CreateInventorySerialDto,
  InventorySerialFilterDto,
  InventorySerialListResponseDto,
  InventorySerialResponseDto,
  UpdateInventorySerialStatusDto,
} from '../dto';

@Injectable()
export class InventorySerialService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly repository: InventorySerialRepository,
    private readonly validator: InventoryValidator,
    private readonly eventQueue: InventoryEventQueue,
  ) {}

  private async findItemOrFail(
    inventoryItemId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>> {
    const item = await this.inventoryRepository.findById(inventoryItemId, workspaceId);
    if (!item) throw new ResourceNotFoundException('Inventory item', inventoryItemId);
    return item;
  }

  private async findOrFail(
    id: string,
    inventoryItemId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, inventoryItemId, workspaceId);
    if (!record) throw new ResourceNotFoundException('Inventory serial', id);
    return record;
  }

  async create(
    inventoryItemId: string,
    workspaceId: string,
    dto: CreateInventorySerialDto,
  ): Promise<InventorySerialResponseDto> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);

    const existing = await this.repository.findBySerialNumber(dto.serialNumber, inventoryItemId);
    if (existing) {
      throw new DuplicateResourceException('Inventory serial', 'serialNumber', dto.serialNumber);
    }

    const record = await this.repository.create({
      inventoryItemId,
      workspaceId,
      batchId: dto.batchId ?? null,
      serialNumber: dto.serialNumber,
      status: InventoryStockStatus.AVAILABLE,
      warehouseId: dto.warehouseId ?? null,
      locationId: dto.locationId ?? null,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      metadata: dto.metadata ?? {},
    });

    await this.eventQueue.enqueue({
      inventoryItemId,
      sku: item['sku'] as string,
      workspaceId,
      event: InventoryEvent.SERIAL_CREATED,
      metadata: { serialNumber: dto.serialNumber },
    });

    return InventorySerialResponseDto.from(record);
  }

  async findAll(
    inventoryItemId: string,
    workspaceId: string,
    filter: InventorySerialFilterDto,
  ): Promise<InventorySerialListResponseDto> {
    await this.findItemOrFail(inventoryItemId, workspaceId);
    const [items, total] = await this.repository.findAll(inventoryItemId, workspaceId, filter);
    return InventorySerialListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(
    id: string,
    inventoryItemId: string,
    workspaceId: string,
  ): Promise<InventorySerialResponseDto> {
    const record = await this.findOrFail(id, inventoryItemId, workspaceId);
    return InventorySerialResponseDto.from(record);
  }

  async updateStatus(
    id: string,
    inventoryItemId: string,
    workspaceId: string,
    dto: UpdateInventorySerialStatusDto,
  ): Promise<InventorySerialResponseDto> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);
    const record = await this.findOrFail(id, inventoryItemId, workspaceId);
    const current = record['status'] as InventoryStockStatus;

    this.validator.assertStockTransition(current, dto.status);

    const updated = await this.repository.update(id, { status: dto.status });

    await this.eventQueue.enqueue({
      inventoryItemId,
      sku: item['sku'] as string,
      workspaceId,
      event: InventoryEvent.SERIAL_STATUS_CHANGED,
      metadata: {
        serialNumber: record['serialNumber'] as string,
        fromStatus: current,
        toStatus: dto.status,
        reason: dto.reason,
      },
    });

    return InventorySerialResponseDto.from(updated);
  }

  async remove(id: string, inventoryItemId: string, workspaceId: string): Promise<void> {
    await this.findOrFail(id, inventoryItemId, workspaceId);
    await this.repository.softDelete(id);
  }
}
