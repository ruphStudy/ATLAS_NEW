import { Injectable } from '@nestjs/common';
import { DuplicateResourceException, ResourceNotFoundException } from '@common/exceptions/atlas.exception';
import { InventoryRepository } from './inventory.repository';
import { InventoryValidator } from './validator/inventory.validator';
import { InventoryEventQueue } from './jobs';
import { InventoryEvent, InventoryItemStatus, InventoryTrackingType } from './interfaces';
import {
  ActivateInventoryItemDto,
  ArchiveInventoryItemDto,
  CreateInventoryItemDto,
  CreateUnitConversionDto,
  DeactivateInventoryItemDto,
  DiscontinueInventoryItemDto,
  InventoryItemFilterDto,
  InventoryItemHistoryResponseDto,
  InventoryItemListResponseDto,
  InventoryItemResponseDto,
  ReactivateInventoryItemDto,
  UpdateInventoryConfigDto,
  UpdateInventoryItemDto,
} from './dto';
import { INVENTORY_CONSTANTS } from './constants';

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly validator: InventoryValidator,
    private readonly eventQueue: InventoryEventQueue,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Inventory item', id);
    return record;
  }

  private async recordHistory(
    inventoryItemId: string,
    workspaceId: string,
    fromStatus: InventoryItemStatus,
    toStatus: InventoryItemStatus,
    version: number,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      inventoryItemId,
      workspaceId,
      fromStatus,
      toStatus,
      version,
      reason,
      changedBy,
    });
  }

  private async publishEvent(
    record: Record<string, unknown>,
    event: InventoryEvent,
    triggeredBy?: string,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      inventoryItemId: record['id'] as string,
      sku: record['sku'] as string,
      workspaceId: record['workspaceId'] as string,
      event,
      triggeredBy,
    });
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateInventoryItemDto,
    createdBy: string,
  ): Promise<InventoryItemResponseDto> {
    if (dto.catalogProductId) {
      const existingMapping = await this.repository.findByCatalogProductId(
        dto.catalogProductId,
        workspaceId,
        dto.variantId ?? null,
      );
      if (existingMapping) {
        throw new DuplicateResourceException(
          'Inventory item',
          'catalogProductId/variantId',
          `${dto.catalogProductId}${dto.variantId ? `/${dto.variantId}` : ''}`,
        );
      }
    }

    const sequence = await this.repository.getNextSequence(workspaceId);
    const sku = `${INVENTORY_CONSTANTS.SKU_PREFIX}-${String(sequence).padStart(
      INVENTORY_CONSTANTS.SKU_PAD_LENGTH,
      '0',
    )}`;

    const record = await this.repository.create({
      workspaceId,
      sku,
      skuSequence: sequence,
      catalogProductId: dto.catalogProductId ?? null,
      variantId: dto.variantId ?? null,
      name: dto.name,
      status: InventoryItemStatus.DRAFT,
      trackingType: dto.trackingType ?? InventoryTrackingType.NONE,
      baseUom: dto.baseUom ?? INVENTORY_CONSTANTS.DEFAULT_UOM,
      reorderPoint: dto.reorderPoint ?? 0,
      safetyStock: dto.safetyStock ?? 0,
      reorderQuantity: dto.reorderQuantity ?? 0,
      isExpiryTracked: dto.isExpiryTracked ?? false,
      shelfLifeDays: dto.shelfLifeDays ?? null,
      version: INVENTORY_CONSTANTS.INITIAL_VERSION,
      metadata: dto.metadata ?? {},
    });

    await this.recordHistory(
      record['id'] as string,
      workspaceId,
      InventoryItemStatus.DRAFT,
      InventoryItemStatus.DRAFT,
      INVENTORY_CONSTANTS.INITIAL_VERSION,
      'Inventory item created',
      createdBy,
    );

    await this.publishEvent(record, InventoryEvent.ITEM_CREATED, createdBy);
    return InventoryItemResponseDto.from(record);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: InventoryItemFilterDto,
  ): Promise<InventoryItemListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return InventoryItemListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<InventoryItemResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return InventoryItemResponseDto.from(record);
  }

  async findByCatalogProductId(
    catalogProductId: string,
    workspaceId: string,
    variantId?: string | null,
  ): Promise<InventoryItemResponseDto | null> {
    const record = await this.repository.findByCatalogProductId(
      catalogProductId,
      workspaceId,
      variantId,
    );
    return record ? InventoryItemResponseDto.from(record) : null;
  }

  async findVariantsByCatalogProductId(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<InventoryItemResponseDto[]> {
    const records = await this.repository.findAllByCatalogProductId(catalogProductId, workspaceId);
    return records.map(InventoryItemResponseDto.from);
  }

  async getHistory(id: string, workspaceId: string): Promise<InventoryItemHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(InventoryItemHistoryResponseDto.from);
  }

  // ── Update ───────────────────────────────────────────────────

  async update(
    id: string,
    workspaceId: string,
    dto: UpdateInventoryItemDto,
    updatedBy: string,
  ): Promise<InventoryItemResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const status = record['status'] as InventoryItemStatus;

    if (status === InventoryItemStatus.ARCHIVED) {
      throw new ResourceNotFoundException('Inventory item', id);
    }

    const nextCatalogProductId = dto.catalogProductId ?? (record['catalogProductId'] as string | null);
    const nextVariantId = dto.variantId ?? (record['variantId'] as string | null);
    const catalogMappingChanged =
      (dto.catalogProductId !== undefined && dto.catalogProductId !== record['catalogProductId']) ||
      (dto.variantId !== undefined && dto.variantId !== record['variantId']);

    if (nextCatalogProductId && catalogMappingChanged) {
      const existingMapping = await this.repository.findByCatalogProductId(
        nextCatalogProductId,
        workspaceId,
        nextVariantId,
      );
      if (existingMapping && existingMapping['id'] !== id) {
        throw new DuplicateResourceException(
          'Inventory item',
          'catalogProductId/variantId',
          `${nextCatalogProductId}${nextVariantId ? `/${nextVariantId}` : ''}`,
        );
      }
    }

    const newVersion = (record['version'] as number) + 1;

    const updated = await this.repository.update(id, {
      version: newVersion,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.catalogProductId !== undefined && { catalogProductId: dto.catalogProductId }),
      ...(dto.variantId !== undefined && { variantId: dto.variantId }),
      ...(dto.trackingType !== undefined && { trackingType: dto.trackingType }),
      ...(dto.baseUom !== undefined && { baseUom: dto.baseUom }),
      ...(dto.reorderPoint !== undefined && { reorderPoint: dto.reorderPoint }),
      ...(dto.safetyStock !== undefined && { safetyStock: dto.safetyStock }),
      ...(dto.reorderQuantity !== undefined && { reorderQuantity: dto.reorderQuantity }),
      ...(dto.isExpiryTracked !== undefined && { isExpiryTracked: dto.isExpiryTracked }),
      ...(dto.shelfLifeDays !== undefined && { shelfLifeDays: dto.shelfLifeDays }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
    });

    await this.recordHistory(
      id, workspaceId, status, status, newVersion, 'Inventory item updated', updatedBy,
    );

    await this.publishEvent(updated, InventoryEvent.ITEM_UPDATED, updatedBy);
    return InventoryItemResponseDto.from(updated);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  async activate(
    id: string,
    workspaceId: string,
    dto: ActivateInventoryItemDto,
    userId: string,
  ): Promise<InventoryItemResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as InventoryItemStatus;
    this.validator.assertItemTransition(current, InventoryItemStatus.ACTIVE);

    const updated = await this.repository.update(id, { status: InventoryItemStatus.ACTIVE });

    await this.recordHistory(
      id, workspaceId, current, InventoryItemStatus.ACTIVE,
      record['version'] as number, dto.notes ?? 'Inventory item activated', userId,
    );

    await this.publishEvent(updated, InventoryEvent.ITEM_ACTIVATED, userId);
    return InventoryItemResponseDto.from(updated);
  }

  async deactivate(
    id: string,
    workspaceId: string,
    dto: DeactivateInventoryItemDto,
    userId: string,
  ): Promise<InventoryItemResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as InventoryItemStatus;
    this.validator.assertItemTransition(current, InventoryItemStatus.INACTIVE);

    const updated = await this.repository.update(id, { status: InventoryItemStatus.INACTIVE });

    await this.recordHistory(
      id, workspaceId, current, InventoryItemStatus.INACTIVE,
      record['version'] as number, dto.reason ?? 'Inventory item deactivated', userId,
    );

    return InventoryItemResponseDto.from(updated);
  }

  async reactivate(
    id: string,
    workspaceId: string,
    dto: ReactivateInventoryItemDto,
    userId: string,
  ): Promise<InventoryItemResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as InventoryItemStatus;
    this.validator.assertItemTransition(current, InventoryItemStatus.ACTIVE);

    const updated = await this.repository.update(id, { status: InventoryItemStatus.ACTIVE });

    await this.recordHistory(
      id, workspaceId, current, InventoryItemStatus.ACTIVE,
      record['version'] as number, dto.notes ?? 'Inventory item reactivated', userId,
    );

    await this.publishEvent(updated, InventoryEvent.ITEM_ACTIVATED, userId);
    return InventoryItemResponseDto.from(updated);
  }

  async discontinue(
    id: string,
    workspaceId: string,
    dto: DiscontinueInventoryItemDto,
    userId: string,
  ): Promise<InventoryItemResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as InventoryItemStatus;
    this.validator.assertItemTransition(current, InventoryItemStatus.DISCONTINUED);

    const updated = await this.repository.update(id, { status: InventoryItemStatus.DISCONTINUED });

    await this.recordHistory(
      id, workspaceId, current, InventoryItemStatus.DISCONTINUED,
      record['version'] as number, dto.reason ?? 'Inventory item discontinued', userId,
    );

    await this.publishEvent(updated, InventoryEvent.ITEM_DISCONTINUED, userId);
    return InventoryItemResponseDto.from(updated);
  }

  async archive(
    id: string,
    workspaceId: string,
    dto: ArchiveInventoryItemDto,
    userId: string,
  ): Promise<InventoryItemResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as InventoryItemStatus;
    this.validator.assertItemTransition(current, InventoryItemStatus.ARCHIVED);

    const updated = await this.repository.update(id, { status: InventoryItemStatus.ARCHIVED });

    await this.recordHistory(
      id, workspaceId, current, InventoryItemStatus.ARCHIVED,
      record['version'] as number, dto.reason, userId,
    );

    await this.publishEvent(updated, InventoryEvent.ITEM_ARCHIVED, userId);
    return InventoryItemResponseDto.from(updated);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    await this.findOrFail(id, workspaceId);
    await this.repository.softDelete(id);
  }

  // ── Unit Conversions ─────────────────────────────────────────

  async addUnitConversion(
    id: string,
    workspaceId: string,
    dto: CreateUnitConversionDto,
  ) {
    await this.findOrFail(id, workspaceId);

    const existing = await this.repository.findUnitConversion(id, dto.fromUom, dto.toUom);
    if (existing) {
      throw new DuplicateResourceException(
        'Unit conversion',
        'fromUom/toUom',
        `${dto.fromUom} -> ${dto.toUom}`,
      );
    }

    return this.repository.createUnitConversion({
      inventoryItemId: id,
      workspaceId,
      fromUom: dto.fromUom,
      toUom: dto.toUom,
      factor: dto.factor,
      isBaseConversion: dto.isBaseConversion ?? false,
    });
  }

  async getUnitConversions(id: string, workspaceId: string) {
    await this.findOrFail(id, workspaceId);
    return this.repository.findUnitConversions(id);
  }

  // ── Configuration ────────────────────────────────────────────

  async getConfig(id: string, workspaceId: string) {
    await this.findOrFail(id, workspaceId);
    const config = await this.repository.findConfig(id);
    return (
      config ?? {
        inventoryItemId: id,
        workspaceId,
        valuationMethod: INVENTORY_CONSTANTS.DEFAULT_VALUATION_METHOD,
        allowNegativeStock: false,
        autoReorderEnabled: false,
        expiryAlertDays: INVENTORY_CONSTANTS.DEFAULT_EXPIRY_ALERT_DAYS,
        requiresBatchOnReceipt: false,
        requiresSerialOnReceipt: false,
        metadata: {},
      }
    );
  }

  async updateConfig(id: string, workspaceId: string, dto: UpdateInventoryConfigDto) {
    await this.findOrFail(id, workspaceId);
    const existing = await this.getConfig(id, workspaceId);

    return this.repository.upsertConfig(id, workspaceId, {
      valuationMethod: dto.valuationMethod ?? (existing['valuationMethod'] as string),
      allowNegativeStock: dto.allowNegativeStock ?? (existing['allowNegativeStock'] as boolean),
      autoReorderEnabled: dto.autoReorderEnabled ?? (existing['autoReorderEnabled'] as boolean),
      expiryAlertDays: dto.expiryAlertDays ?? (existing['expiryAlertDays'] as number),
      requiresBatchOnReceipt:
        dto.requiresBatchOnReceipt ?? (existing['requiresBatchOnReceipt'] as boolean),
      requiresSerialOnReceipt:
        dto.requiresSerialOnReceipt ?? (existing['requiresSerialOnReceipt'] as boolean),
      metadata: dto.metadata ?? (existing['metadata'] as Record<string, unknown>),
    });
  }
}
