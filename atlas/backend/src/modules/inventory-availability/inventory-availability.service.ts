import { Injectable, Logger } from '@nestjs/common';
import { InventoryAvailabilityRepository } from './inventory-availability.repository';
import { AvailabilityEventQueue } from './jobs';
import {
  GetAvailabilityDto,
  GetBulkAvailabilityDto,
  GetAvailabilityBySkuDto,
  GetAggregatedAvailabilityDto,
  GetFutureDateAvailabilityDto,
  FilteredAvailabilityDto,
  AvailabilitySnapshotDto,
  AggregatedAvailabilityDto,
  WarehouseAvailabilityDto,
  FutureDateAvailabilityDto,
  BulkAvailabilityResponseDto,
} from './dto';
import {
  IAvailabilitySnapshot,
  IAggregatedAvailability,
  IWarehouseAvailability,
  IFutureDateAvailability,
  IMarketplaceAvailabilityRule,
  AvailabilityEvent,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class InventoryAvailabilityService {
  private readonly logger = new Logger(InventoryAvailabilityService.name);

  // Simple in-memory cache for availability calculations
  private readonly cache = new Map<string, { data: IAvailabilitySnapshot; expiresAt: number }>();
  private readonly LOW_STOCK_THRESHOLD = 10;
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor(
    private readonly repository: InventoryAvailabilityRepository,
    private readonly eventQueue: AvailabilityEventQueue,
  ) {}

  async getAvailability(dto: GetAvailabilityDto): Promise<IAvailabilitySnapshot> {
    const cacheKey = this.buildCacheKey(
      dto.inventoryItemId,
      dto.warehouseId,
      dto.locationId,
      dto.binId,
      dto.batchId,
    );

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const item = await this.repository.getInventoryItem(
      dto.inventoryItemId,
      dto.workspaceId,
    );

    if (!item) {
      throw new ResourceNotFoundException(
        'Inventory item not found',
        ErrorCode.INVENTORY_ITEM_NOT_FOUND,
      );
    }

    const stocks = await this.repository.getStockByItem(
      dto.inventoryItemId,
      dto.workspaceId,
      dto.warehouseId,
      dto.locationId,
      dto.binId,
      dto.batchId,
    );

    const reservations = await this.repository.getActiveReservations(
      dto.inventoryItemId,
      dto.workspaceId,
      dto.warehouseId,
    );

    const allocations = await this.repository.getActiveAllocations(
      dto.inventoryItemId,
      dto.workspaceId,
      dto.warehouseId,
    );

    const availability = this.calculateAvailability(
      dto.inventoryItemId,
      item['sku'] as string | null,
      stocks,
      reservations,
      allocations,
      dto.warehouseId,
      dto.locationId,
      dto.binId,
      dto.batchId,
      dto.includeIncoming ?? true,
    );

    if (dto.applyMarketplaceRules && dto.marketplaceAccountId) {
      this.applyMarketplaceRules(availability, {
        marketplaceAccountId: dto.marketplaceAccountId,
        safetyStockPercentage: 10,
        allowOversell: false,
      });
    }

    this.cache.set(cacheKey, {
      data: availability,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    await this.publishAvailabilityEvents(availability);

    return availability;
  }

  async getAvailabilityBySku(dto: GetAvailabilityBySkuDto): Promise<IAvailabilitySnapshot> {
    const item = await this.repository.getInventoryItemBySku(
      dto.sku,
      dto.workspaceId,
    );

    if (!item) {
      throw new ResourceNotFoundException(
        'Inventory item not found for SKU',
        ErrorCode.INVENTORY_ITEM_NOT_FOUND,
      );
    }

    return this.getAvailability({
      workspaceId: dto.workspaceId,
      inventoryItemId: item['id'] as string,
      warehouseId: dto.warehouseId,
      marketplaceAccountId: dto.marketplaceAccountId,
      includeIncoming: dto.includeIncoming,
      applyMarketplaceRules: dto.applyMarketplaceRules,
    });
  }

  async getBulkAvailability(
    dto: GetBulkAvailabilityDto,
  ): Promise<BulkAvailabilityResponseDto> {
    const stocksMap = await this.repository.getBulkStockByItems(
      dto.inventoryItemIds,
      dto.workspaceId,
      dto.warehouseId,
    );

    const reservationsMap = await this.repository.getBulkReservationsByItems(
      dto.inventoryItemIds,
      dto.workspaceId,
    );

    const allocationsMap = await this.repository.getBulkAllocationsByItems(
      dto.inventoryItemIds,
      dto.workspaceId,
    );

    const availabilities: IAvailabilitySnapshot[] = [];

    for (const inventoryItemId of dto.inventoryItemIds) {
      const stocks = stocksMap.get(inventoryItemId) || [];
      const reservations = reservationsMap.get(inventoryItemId) || [];
      const allocations = allocationsMap.get(inventoryItemId) || [];

      const availability = this.calculateAvailability(
        inventoryItemId,
        null,
        stocks,
        reservations,
        allocations,
        dto.warehouseId,
        undefined,
        undefined,
        undefined,
        dto.includeIncoming ?? true,
      );

      if (dto.applyMarketplaceRules && dto.marketplaceAccountId) {
        this.applyMarketplaceRules(availability, {
          marketplaceAccountId: dto.marketplaceAccountId,
          safetyStockPercentage: 10,
          allowOversell: false,
        });
      }

      availabilities.push(availability);
    }

    return {
      availabilities: availabilities as AvailabilitySnapshotDto[],
      calculatedAt: new Date(),
    };
  }

  async getAggregatedAvailability(
    dto: GetAggregatedAvailabilityDto,
  ): Promise<IAggregatedAvailability> {
    const item = await this.repository.getInventoryItem(
      dto.inventoryItemId,
      dto.workspaceId,
    );

    if (!item) {
      throw new ResourceNotFoundException(
        'Inventory item not found',
        ErrorCode.INVENTORY_ITEM_NOT_FOUND,
      );
    }

    const warehouseIds = dto.warehouseIds || [];
    const stocksMap = await this.repository.getStockByWarehouse(
      dto.inventoryItemId,
      dto.workspaceId,
      warehouseIds,
    );

    const warehouses: IWarehouseAvailability[] = [];
    let totalPhysicalStock = 0;
    let totalAvailableStock = 0;
    let totalReservedStock = 0;
    let totalAllocatedStock = 0;
    let totalBlockedStock = 0;
    let totalDamagedStock = 0;
    let totalInTransitStock = 0;
    let totalIncomingStock = 0;
    let totalSafetyStock = 0;

    for (const [warehouseId, stocks] of stocksMap) {
      const reservations = await this.repository.getActiveReservations(
        dto.inventoryItemId,
        dto.workspaceId,
        warehouseId,
      );

      const allocations = await this.repository.getActiveAllocations(
        dto.inventoryItemId,
        dto.workspaceId,
        warehouseId,
      );

      const availability = this.calculateAvailability(
        dto.inventoryItemId,
        item['sku'] as string | null,
        stocks,
        reservations,
        allocations,
        warehouseId,
        undefined,
        undefined,
        undefined,
        dto.includeIncoming ?? true,
      );

      const warehouseAvailability: IWarehouseAvailability = {
        warehouseId,
        physicalStock: availability.physicalStock,
        availableStock: availability.availableStock,
        reservedStock: availability.reservedStock,
        allocatedStock: availability.allocatedStock,
        blockedStock: availability.blockedStock,
        damagedStock: availability.damagedStock,
        inTransitStock: availability.inTransitStock,
        incomingStock: availability.incomingStock,
        safetyStock: availability.safetyStock,
        availableToSell: availability.availableToSell,
        availableToPromise: availability.availableToPromise,
        uom: availability.uom,
      };

      warehouses.push(warehouseAvailability);

      totalPhysicalStock += availability.physicalStock;
      totalAvailableStock += availability.availableStock;
      totalReservedStock += availability.reservedStock;
      totalAllocatedStock += availability.allocatedStock;
      totalBlockedStock += availability.blockedStock;
      totalDamagedStock += availability.damagedStock;
      totalInTransitStock += availability.inTransitStock;
      totalIncomingStock += availability.incomingStock;
      totalSafetyStock += availability.safetyStock;
    }

    const totalAvailableToSell =
      totalAvailableStock - totalReservedStock - totalAllocatedStock + totalIncomingStock;
    const totalAvailableToPromise =
      totalAvailableStock -
      totalReservedStock -
      totalAllocatedStock -
      totalSafetyStock +
      totalIncomingStock;

    return {
      inventoryItemId: dto.inventoryItemId,
      sku: item['sku'] as string | null,
      totalPhysicalStock,
      totalAvailableStock,
      totalReservedStock,
      totalAllocatedStock,
      totalBlockedStock,
      totalDamagedStock,
      totalInTransitStock,
      totalIncomingStock,
      totalSafetyStock,
      totalAvailableToSell,
      totalAvailableToPromise,
      warehouses,
      uom: 'EA',
      calculatedAt: new Date(),
    };
  }

  async getFutureDateAvailability(
    dto: GetFutureDateAvailabilityDto,
  ): Promise<IFutureDateAvailability> {
    const currentAvailability = await this.getAvailability({
      workspaceId: dto.workspaceId,
      inventoryItemId: dto.inventoryItemId,
      warehouseId: dto.warehouseId,
      includeIncoming: true,
      applyMarketplaceRules: dto.applyMarketplaceRules,
      marketplaceAccountId: dto.marketplaceAccountId,
    });

    // Simple future projection - in production would query expected receipts, transfers, etc.
    const expectedIncoming = currentAvailability.incomingStock;
    const projectedReservations = 0; // Would calculate based on historical patterns

    return {
      date: new Date(dto.futureDate),
      expectedAvailableToSell: currentAvailability.availableToSell + expectedIncoming,
      expectedAvailableToPromise:
        currentAvailability.availableToPromise + expectedIncoming - projectedReservations,
      expectedIncoming,
      projectedReservations,
    };
  }

  async invalidateCache(inventoryItemId: string, warehouseId?: string): Promise<void> {
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (key.includes(inventoryItemId)) {
        if (!warehouseId || key.includes(warehouseId)) {
          keysToDelete.push(key);
        }
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    this.logger.log(
      `Cache invalidated for item ${inventoryItemId}, removed ${keysToDelete.length} entries`,
    );
  }

  private calculateAvailability(
    inventoryItemId: string,
    sku: string | null,
    stocks: Record<string, unknown>[],
    reservations: Record<string, unknown>[],
    allocations: Record<string, unknown>[],
    warehouseId?: string,
    locationId?: string,
    binId?: string,
    batchId?: string,
    includeIncoming = true,
  ): IAvailabilitySnapshot {
    let physicalStock = 0;
    let availableStock = 0;
    let reservedStock = 0;
    let blockedStock = 0;
    let damagedStock = 0;
    let inTransitStock = 0;

    for (const stock of stocks) {
      const quantity = stock['quantity'] as number;
      const status = stock['status'] as string;

      physicalStock += quantity;

      if (status === 'AVAILABLE') {
        availableStock += quantity;
      } else if (status === 'RESERVED') {
        reservedStock += quantity;
      } else if (status === 'BLOCKED') {
        blockedStock += quantity;
      } else if (status === 'DAMAGED') {
        damagedStock += quantity;
      } else if (status === 'IN_TRANSIT') {
        inTransitStock += quantity;
      }
    }

    let allocatedStock = 0;
    for (const allocation of allocations) {
      const allocatedQuantity = allocation['allocatedQuantity'] as number;
      allocatedStock += allocatedQuantity;
    }

    // Reserved stock from reservations (in addition to RESERVED status stock)
    let additionalReserved = 0;
    for (const reservation of reservations) {
      const reservedQuantity = reservation['reservedQuantity'] as number;
      additionalReserved += reservedQuantity;
    }

    reservedStock = Math.max(reservedStock, additionalReserved);

    const incomingStock = includeIncoming ? 0 : 0; // Would query expected receipts/transfers
    const safetyStock = 0; // Would get from inventory configuration

    const availableToSell =
      availableStock - reservedStock - allocatedStock + incomingStock;
    const availableToPromise =
      availableStock - reservedStock - allocatedStock - safetyStock + incomingStock;

    return {
      inventoryItemId,
      sku,
      warehouseId: warehouseId || null,
      locationId: locationId || null,
      binId: binId || null,
      batchId: batchId || null,
      serialId: null,
      physicalStock,
      availableStock,
      reservedStock,
      allocatedStock,
      blockedStock,
      damagedStock,
      inTransitStock,
      incomingStock,
      safetyStock,
      availableToSell: Math.max(0, availableToSell),
      availableToPromise: Math.max(0, availableToPromise),
      uom: 'EA',
      calculatedAt: new Date(),
    };
  }

  private applyMarketplaceRules(
    availability: IAvailabilitySnapshot,
    rule: IMarketplaceAvailabilityRule,
  ): void {
    if (rule.safetyStockPercentage) {
      const safetyStock = availability.availableStock * (rule.safetyStockPercentage / 100);
      availability.safetyStock = Math.ceil(safetyStock);
      availability.availableToPromise = Math.max(
        0,
        availability.availableToSell - availability.safetyStock,
      );
    }

    if (rule.bufferQuantity) {
      availability.availableToSell = Math.max(
        0,
        availability.availableToSell - rule.bufferQuantity,
      );
      availability.availableToPromise = Math.max(
        0,
        availability.availableToPromise - rule.bufferQuantity,
      );
    }

    if (!rule.allowOversell) {
      availability.availableToSell = Math.min(
        availability.availableToSell,
        availability.availableStock,
      );
      availability.availableToPromise = Math.min(
        availability.availableToPromise,
        availability.availableStock,
      );
    }

    if (rule.maxOversellQuantity && rule.allowOversell) {
      const maxAllowed = availability.availableStock + rule.maxOversellQuantity;
      availability.availableToSell = Math.min(availability.availableToSell, maxAllowed);
      availability.availableToPromise = Math.min(
        availability.availableToPromise,
        maxAllowed,
      );
    }
  }

  private async publishAvailabilityEvents(
    availability: IAvailabilitySnapshot,
  ): Promise<void> {
    await this.eventQueue.publish({
      event: AvailabilityEvent.AVAILABILITY_RECALCULATED,
      inventoryItemId: availability.inventoryItemId,
      workspaceId: availability.warehouseId || 'unknown',
      sku: availability.sku,
      warehouseId: availability.warehouseId,
      availableToSell: availability.availableToSell,
      availableToPromise: availability.availableToPromise,
    });

    if (availability.availableToSell <= this.LOW_STOCK_THRESHOLD) {
      await this.eventQueue.publish({
        event: AvailabilityEvent.LOW_AVAILABILITY,
        inventoryItemId: availability.inventoryItemId,
        workspaceId: availability.warehouseId || 'unknown',
        sku: availability.sku,
        warehouseId: availability.warehouseId,
        availableToSell: availability.availableToSell,
        threshold: this.LOW_STOCK_THRESHOLD,
      });
    }

    if (availability.availableToSell <= 0) {
      await this.eventQueue.publish({
        event: AvailabilityEvent.OUT_OF_STOCK,
        inventoryItemId: availability.inventoryItemId,
        workspaceId: availability.warehouseId || 'unknown',
        sku: availability.sku,
        warehouseId: availability.warehouseId,
        availableToSell: availability.availableToSell,
      });
    }
  }

  private buildCacheKey(
    inventoryItemId: string,
    warehouseId?: string,
    locationId?: string,
    binId?: string,
    batchId?: string,
  ): string {
    const parts = [inventoryItemId];
    if (warehouseId) parts.push(warehouseId);
    if (locationId) parts.push(locationId);
    if (binId) parts.push(binId);
    if (batchId) parts.push(batchId);
    return parts.join(':');
  }
}
