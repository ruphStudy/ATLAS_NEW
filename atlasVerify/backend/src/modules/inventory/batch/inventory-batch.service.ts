import { Injectable } from '@nestjs/common';
import { DuplicateResourceException, ResourceNotFoundException } from '@common/exceptions/atlas.exception';
import { InventoryRepository } from '../inventory.repository';
import { InventoryBatchRepository } from './inventory-batch.repository';
import { InventoryEventQueue } from '../jobs';
import { InventoryEvent } from '../interfaces';
import {
  CreateInventoryBatchDto,
  InventoryBatchFilterDto,
  InventoryBatchListResponseDto,
  InventoryBatchResponseDto,
  UpdateInventoryBatchDto,
} from '../dto';

@Injectable()
export class InventoryBatchService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly repository: InventoryBatchRepository,
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
    if (!record) throw new ResourceNotFoundException('Inventory batch', id);
    return record;
  }

  async create(
    inventoryItemId: string,
    workspaceId: string,
    dto: CreateInventoryBatchDto,
  ): Promise<InventoryBatchResponseDto> {
    const item = await this.findItemOrFail(inventoryItemId, workspaceId);

    const existing = await this.repository.findByBatchNumber(dto.batchNumber, inventoryItemId);
    if (existing) {
      throw new DuplicateResourceException('Inventory batch', 'batchNumber', dto.batchNumber);
    }

    const record = await this.repository.create({
      inventoryItemId,
      workspaceId,
      batchNumber: dto.batchNumber,
      manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : null,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      supplierId: dto.supplierId ?? null,
      quantity: dto.quantity ?? 0,
      metadata: dto.metadata ?? {},
    });

    await this.eventQueue.enqueue({
      inventoryItemId,
      sku: item['sku'] as string,
      workspaceId,
      event: InventoryEvent.BATCH_CREATED,
      metadata: { batchNumber: dto.batchNumber },
    });

    return InventoryBatchResponseDto.from(record);
  }

  async findAll(
    inventoryItemId: string,
    workspaceId: string,
    filter: InventoryBatchFilterDto,
  ): Promise<InventoryBatchListResponseDto> {
    await this.findItemOrFail(inventoryItemId, workspaceId);
    const [items, total] = await this.repository.findAll(inventoryItemId, workspaceId, filter);
    return InventoryBatchListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(
    id: string,
    inventoryItemId: string,
    workspaceId: string,
  ): Promise<InventoryBatchResponseDto> {
    const record = await this.findOrFail(id, inventoryItemId, workspaceId);
    return InventoryBatchResponseDto.from(record);
  }

  async update(
    id: string,
    inventoryItemId: string,
    workspaceId: string,
    dto: UpdateInventoryBatchDto,
  ): Promise<InventoryBatchResponseDto> {
    await this.findOrFail(id, inventoryItemId, workspaceId);

    const updated = await this.repository.update(id, {
      ...(dto.manufactureDate !== undefined && {
        manufactureDate: dto.manufactureDate ? new Date(dto.manufactureDate) : null,
      }),
      ...(dto.expiryDate !== undefined && {
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      }),
      ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
    });

    return InventoryBatchResponseDto.from(updated);
  }

  async remove(id: string, inventoryItemId: string, workspaceId: string): Promise<void> {
    await this.findOrFail(id, inventoryItemId, workspaceId);
    await this.repository.softDelete(id);
  }

  async findExpiring(workspaceId: string, days: number): Promise<InventoryBatchResponseDto[]> {
    const beforeDate = new Date();
    beforeDate.setDate(beforeDate.getDate() + days);
    const items = await this.repository.findExpiring(workspaceId, beforeDate);
    return items.map(InventoryBatchResponseDto.from);
  }
}
