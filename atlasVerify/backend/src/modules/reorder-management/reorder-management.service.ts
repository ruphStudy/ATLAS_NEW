import { Injectable, Logger } from '@nestjs/common';
import { ReorderManagementRepository } from './reorder-management.repository';
import { ReorderEventQueue } from './jobs';
import {
  CreateReorderConfigurationDto,
  UpdateReorderConfigurationDto,
  ApproveRecommendationDto,
  RejectRecommendationDto,
  SnoozeRecommendationDto,
  ResolveRecommendationDto,
  RecalculateRecommendationsDto,
  ReorderConfigurationFilterDto,
  ReorderRecommendationFilterDto,
  ReorderConfigurationResponseDto,
  ReorderRecommendationResponseDto,
  PaginatedReorderConfigurationResponseDto,
  PaginatedReorderRecommendationResponseDto,
} from './dto';
import {
  IReorderConfiguration,
  IReorderRecommendation,
  ReorderStrategy,
  StockLevelStatus,
  ReorderRecommendationStatus,
  ReorderEvent,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { DuplicateResourceException } from '@common/exceptions/duplicate-resource.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class ReorderManagementService {
  private readonly logger = new Logger(ReorderManagementService.name);
  private readonly REORDER_PREFIX = 'RO';

  constructor(
    private readonly repository: ReorderManagementRepository,
    private readonly eventQueue: ReorderEventQueue,
  ) {}

  async createConfiguration(
    workspaceId: string,
    dto: CreateReorderConfigurationDto,
    createdBy?: string,
  ): Promise<IReorderConfiguration> {
    const existing = await this.repository.findConfigurationByItem(
      dto.inventoryItemId,
      workspaceId,
      dto.warehouseId,
      dto.marketplaceAccountId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Reorder configuration already exists for this item and scope',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const data = {
      workspaceId,
      inventoryItemId: dto.inventoryItemId,
      sku: dto.sku,
      catalogProductId: dto.catalogProductId,
      variantId: dto.variantId,
      warehouseId: dto.warehouseId,
      marketplaceAccountId: dto.marketplaceAccountId,
      reorderPoint: dto.reorderPoint,
      safetyStock: dto.safetyStock,
      minimumStock: dto.minimumStock,
      maximumStock: dto.maximumStock,
      targetDaysOfCover: dto.targetDaysOfCover,
      reorderStrategy: dto.reorderStrategy,
      fixedReorderQuantity: dto.fixedReorderQuantity,
      leadTimeDays: dto.leadTimeDays,
      supplierId: dto.supplierId,
      preferredSupplierId: dto.preferredSupplierId,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 0,
      region: dto.region,
      channel: dto.channel,
      notes: dto.notes,
      metadata: {},
      createdBy,
    };

    const config = (await this.repository.createConfiguration(
      data,
    )) as IReorderConfiguration;

    return config;
  }

  async updateConfiguration(
    id: string,
    workspaceId: string,
    dto: UpdateReorderConfigurationDto,
  ): Promise<IReorderConfiguration> {
    const config = await this.findConfigurationById(id, workspaceId);

    const updated = (await this.repository.updateConfiguration(
      id,
      workspaceId,
      dto,
    )) as IReorderConfiguration;

    return updated;
  }

  async deleteConfiguration(id: string, workspaceId: string): Promise<void> {
    await this.findConfigurationById(id, workspaceId);
    await this.repository.deleteConfiguration(id, workspaceId);
  }

  async findConfigurationById(
    id: string,
    workspaceId: string,
  ): Promise<IReorderConfiguration> {
    const config = await this.repository.findConfigurationById(id, workspaceId);
    if (!config) {
      throw new ResourceNotFoundException(
        'Reorder configuration not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return config as IReorderConfiguration;
  }

  async findAllConfigurations(
    workspaceId: string,
    filter: ReorderConfigurationFilterDto,
  ): Promise<PaginatedReorderConfigurationResponseDto> {
    const [data, total] = await this.repository.findAllConfigurations(
      workspaceId,
      filter,
    );

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as ReorderConfigurationResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async generateRecommendation(
    workspaceId: string,
    inventoryItemId: string,
    sku: string | null,
    warehouseId: string | null,
    currentStock: number,
    availableStock: number,
    reservedStock: number,
    allocatedStock: number,
    incomingStock: number,
    inTransitStock: number,
  ): Promise<IReorderRecommendation | null> {
    const config = await this.repository.findConfigurationByItem(
      inventoryItemId,
      workspaceId,
      warehouseId || undefined,
    );

    if (!config || !config['enabled']) {
      return null;
    }

    const existing = await this.repository.findActiveRecommendationByItem(
      inventoryItemId,
      workspaceId,
      warehouseId || undefined,
    );

    if (existing) {
      this.logger.debug(
        `Active recommendation already exists for item ${inventoryItemId}`,
      );
      return null;
    }

    const reorderPoint = config['reorderPoint'] as number | null;
    const safetyStock = config['safetyStock'] as number | null;
    const minimumStock = config['minimumStock'] as number | null;
    const maximumStock = config['maximumStock'] as number | null;

    const stockLevelStatus = this.determineStockLevel(
      currentStock,
      availableStock,
      reorderPoint,
      safetyStock,
      minimumStock,
      maximumStock,
    );

    if (
      stockLevelStatus !== StockLevelStatus.LOW &&
      stockLevelStatus !== StockLevelStatus.CRITICAL &&
      stockLevelStatus !== StockLevelStatus.OUT_OF_STOCK
    ) {
      return null;
    }

    const reorderQuantity = this.calculateReorderQuantity(
      config as IReorderConfiguration,
      currentStock,
      availableStock,
      reservedStock,
      allocatedStock,
      incomingStock,
    );

    if (reorderQuantity <= 0) {
      return null;
    }

    const sequence = await this.repository.getNextRecommendationSequence(
      workspaceId,
    );
    const recommendationNumber = `${this.REORDER_PREFIX}-${String(sequence).padStart(6, '0')}`;

    const urgency = this.calculateUrgency(stockLevelStatus, currentStock, reorderPoint);
    const score = this.calculateScore(stockLevelStatus, urgency, reorderQuantity);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const data = {
      workspaceId,
      recommendationNumber,
      recommendationSequence: sequence,
      inventoryItemId,
      sku,
      catalogProductId: config['catalogProductId'],
      variantId: config['variantId'],
      warehouseId,
      marketplaceAccountId: config['marketplaceAccountId'],
      configurationId: config['id'],
      status: ReorderRecommendationStatus.PENDING,
      stockLevelStatus,
      currentStock,
      availableStock,
      reservedStock,
      allocatedStock,
      incomingStock,
      inTransitStock,
      reorderPoint,
      safetyStock,
      minimumStock,
      maximumStock,
      recommendedQuantity: reorderQuantity,
      calculatedQuantity: reorderQuantity,
      demandRate: 0, // Would calculate from historical data
      leadTimeDays: config['leadTimeDays'],
      targetDaysOfCover: config['targetDaysOfCover'],
      preferredSupplierId: config['preferredSupplierId'],
      score,
      urgency,
      reason: this.buildRecommendationReason(stockLevelStatus, currentStock, reorderPoint),
      calculationInputs: {
        strategy: config['reorderStrategy'],
        currentStock,
        availableStock,
        reservedStock,
        allocatedStock,
        incomingStock,
        reorderPoint,
        safetyStock,
        minimumStock,
        maximumStock,
      },
      expiresAt,
      metadata: {},
    };

    const recommendation = (await this.repository.createRecommendation(
      data,
    )) as IReorderRecommendation;

    await this.createHistoryEntry(
      recommendation.id,
      workspaceId,
      null,
      ReorderRecommendationStatus.PENDING,
      'Recommendation created',
    );

    await this.publishRecommendationEvents(recommendation);

    return recommendation;
  }

  async approve(
    id: string,
    workspaceId: string,
    dto: ApproveRecommendationDto,
    approvedBy?: string,
  ): Promise<IReorderRecommendation> {
    const recommendation = await this.findRecommendationById(id, workspaceId);

    if (recommendation.status !== ReorderRecommendationStatus.PENDING) {
      throw new BusinessRuleException(
        'Only pending recommendations can be approved',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const updateData: Record<string, unknown> = {
      status: ReorderRecommendationStatus.APPROVED,
      approvedBy: dto.approvedBy ?? approvedBy,
      approvedAt: new Date(),
    };

    if (dto.overrideQuantity !== undefined) {
      updateData['overrideQuantity'] = dto.overrideQuantity;
      updateData['recommendedQuantity'] = dto.overrideQuantity;
    }

    if (dto.notes) {
      updateData['notes'] = dto.notes;
    }

    const updated = (await this.repository.updateRecommendation(
      id,
      workspaceId,
      updateData,
    )) as IReorderRecommendation;

    await this.createHistoryEntry(
      id,
      workspaceId,
      ReorderRecommendationStatus.PENDING,
      ReorderRecommendationStatus.APPROVED,
      'Recommendation approved',
      approvedBy,
    );

    await this.eventQueue.publish({
      event: ReorderEvent.RECOMMENDATION_APPROVED,
      workspaceId,
      inventoryItemId: updated.inventoryItemId,
      sku: updated.sku,
      warehouseId: updated.warehouseId,
      recommendationId: updated.id,
      recommendedQuantity: updated.recommendedQuantity,
    });

    return updated;
  }

  async reject(
    id: string,
    workspaceId: string,
    dto: RejectRecommendationDto,
    rejectedBy?: string,
  ): Promise<IReorderRecommendation> {
    const recommendation = await this.findRecommendationById(id, workspaceId);

    if (recommendation.status !== ReorderRecommendationStatus.PENDING) {
      throw new BusinessRuleException(
        'Only pending recommendations can be rejected',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const updated = (await this.repository.updateRecommendation(id, workspaceId, {
      status: ReorderRecommendationStatus.REJECTED,
      rejectedBy: dto.rejectedBy ?? rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: dto.rejectionReason,
    })) as IReorderRecommendation;

    await this.createHistoryEntry(
      id,
      workspaceId,
      ReorderRecommendationStatus.PENDING,
      ReorderRecommendationStatus.REJECTED,
      dto.rejectionReason,
      rejectedBy,
    );

    await this.eventQueue.publish({
      event: ReorderEvent.RECOMMENDATION_REJECTED,
      workspaceId,
      inventoryItemId: updated.inventoryItemId,
      sku: updated.sku,
      warehouseId: updated.warehouseId,
      recommendationId: updated.id,
    });

    return updated;
  }

  async snooze(
    id: string,
    workspaceId: string,
    dto: SnoozeRecommendationDto,
    snoozedBy?: string,
  ): Promise<IReorderRecommendation> {
    const recommendation = await this.findRecommendationById(id, workspaceId);

    if (recommendation.status !== ReorderRecommendationStatus.PENDING) {
      throw new BusinessRuleException(
        'Only pending recommendations can be snoozed',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const updated = (await this.repository.updateRecommendation(id, workspaceId, {
      status: ReorderRecommendationStatus.SNOOZED,
      snoozedUntil: new Date(dto.snoozedUntil),
      snoozedBy: dto.snoozedBy ?? snoozedBy,
      snoozeReason: dto.snoozeReason,
    })) as IReorderRecommendation;

    await this.createHistoryEntry(
      id,
      workspaceId,
      ReorderRecommendationStatus.PENDING,
      ReorderRecommendationStatus.SNOOZED,
      dto.snoozeReason || 'Recommendation snoozed',
      snoozedBy,
    );

    await this.eventQueue.publish({
      event: ReorderEvent.RECOMMENDATION_SNOOZED,
      workspaceId,
      inventoryItemId: updated.inventoryItemId,
      sku: updated.sku,
      warehouseId: updated.warehouseId,
      recommendationId: updated.id,
    });

    return updated;
  }

  async resolve(
    id: string,
    workspaceId: string,
    dto: ResolveRecommendationDto,
    resolvedBy?: string,
  ): Promise<IReorderRecommendation> {
    const recommendation = await this.findRecommendationById(id, workspaceId);

    const updated = (await this.repository.updateRecommendation(id, workspaceId, {
      status: ReorderRecommendationStatus.RESOLVED,
      resolvedBy: dto.resolvedBy ?? resolvedBy,
      resolvedAt: new Date(),
      resolutionNotes: dto.resolutionNotes,
      procurementDraftId: dto.procurementDraftId,
      purchaseOrderId: dto.purchaseOrderId,
    })) as IReorderRecommendation;

    await this.createHistoryEntry(
      id,
      workspaceId,
      recommendation.status,
      ReorderRecommendationStatus.RESOLVED,
      'Recommendation resolved',
      resolvedBy,
    );

    await this.eventQueue.publish({
      event: ReorderEvent.RECOMMENDATION_RESOLVED,
      workspaceId,
      inventoryItemId: updated.inventoryItemId,
      sku: updated.sku,
      warehouseId: updated.warehouseId,
      recommendationId: updated.id,
    });

    return updated;
  }

  async findRecommendationById(
    id: string,
    workspaceId: string,
  ): Promise<IReorderRecommendation> {
    const recommendation = await this.repository.findRecommendationById(id, workspaceId);
    if (!recommendation) {
      throw new ResourceNotFoundException(
        'Reorder recommendation not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return recommendation as IReorderRecommendation;
  }

  async findAllRecommendations(
    workspaceId: string,
    filter: ReorderRecommendationFilterDto,
  ): Promise<PaginatedReorderRecommendationResponseDto> {
    const [data, total] = await this.repository.findAllRecommendations(
      workspaceId,
      filter,
    );

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as ReorderRecommendationResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async expireOldRecommendations(workspaceId: string): Promise<number> {
    const count = await this.repository.expireOldRecommendations(workspaceId);
    this.logger.log(`Expired ${count} old recommendations in workspace ${workspaceId}`);
    return count;
  }

  private determineStockLevel(
    currentStock: number,
    availableStock: number,
    reorderPoint: number | null,
    safetyStock: number | null,
    minimumStock: number | null,
    maximumStock: number | null,
  ): StockLevelStatus {
    if (currentStock <= 0) {
      return StockLevelStatus.OUT_OF_STOCK;
    }

    if (safetyStock && currentStock <= safetyStock) {
      return StockLevelStatus.CRITICAL;
    }

    if (reorderPoint && currentStock <= reorderPoint) {
      return StockLevelStatus.LOW;
    }

    if (minimumStock && currentStock < minimumStock) {
      return StockLevelStatus.LOW;
    }

    if (maximumStock && currentStock > maximumStock) {
      return StockLevelStatus.EXCESS;
    }

    return StockLevelStatus.NORMAL;
  }

  private calculateReorderQuantity(
    config: IReorderConfiguration,
    currentStock: number,
    availableStock: number,
    reservedStock: number,
    allocatedStock: number,
    incomingStock: number,
  ): number {
    const strategy = config.reorderStrategy;

    if (strategy === ReorderStrategy.FIXED_QUANTITY) {
      return config.fixedReorderQuantity || 0;
    }

    if (strategy === ReorderStrategy.MIN_MAX) {
      const max = config.maximumStock || 0;
      const min = config.minimumStock || 0;
      return Math.max(0, max - currentStock - incomingStock);
    }

    if (strategy === ReorderStrategy.DAYS_OF_COVER) {
      const days = config.targetDaysOfCover || 30;
      const demandRate = 1; // Would calculate from historical data
      const targetStock = demandRate * days;
      return Math.max(0, targetStock - currentStock - incomingStock);
    }

    if (strategy === ReorderStrategy.DEMAND_BASED) {
      const leadTime = config.leadTimeDays || 7;
      const demandRate = 1; // Would calculate from historical data
      const safetyStock = config.safetyStock || 0;
      const targetStock = demandRate * leadTime + safetyStock;
      return Math.max(0, targetStock - currentStock - incomingStock);
    }

    return 0;
  }

  private calculateUrgency(
    stockLevel: StockLevelStatus,
    currentStock: number,
    reorderPoint: number | null,
  ): string {
    if (stockLevel === StockLevelStatus.OUT_OF_STOCK) {
      return 'CRITICAL';
    }

    if (stockLevel === StockLevelStatus.CRITICAL) {
      return 'HIGH';
    }

    if (stockLevel === StockLevelStatus.LOW) {
      if (reorderPoint && currentStock <= reorderPoint * 0.5) {
        return 'HIGH';
      }
      return 'MEDIUM';
    }

    return 'NORMAL';
  }

  private calculateScore(
    stockLevel: StockLevelStatus,
    urgency: string,
    quantity: number,
  ): number {
    let score = 50;

    if (stockLevel === StockLevelStatus.OUT_OF_STOCK) score += 50;
    else if (stockLevel === StockLevelStatus.CRITICAL) score += 40;
    else if (stockLevel === StockLevelStatus.LOW) score += 30;

    if (urgency === 'CRITICAL') score += 30;
    else if (urgency === 'HIGH') score += 20;
    else if (urgency === 'MEDIUM') score += 10;

    score += Math.min(20, quantity / 10);

    return Math.min(100, score);
  }

  private buildRecommendationReason(
    stockLevel: StockLevelStatus,
    currentStock: number,
    reorderPoint: number | null,
  ): string {
    if (stockLevel === StockLevelStatus.OUT_OF_STOCK) {
      return 'Out of stock - immediate reorder required';
    }

    if (stockLevel === StockLevelStatus.CRITICAL) {
      return `Critical stock level (${currentStock} units) - urgent reorder required`;
    }

    if (stockLevel === StockLevelStatus.LOW) {
      return `Stock below reorder point (${currentStock} units, reorder point: ${reorderPoint})`;
    }

    return 'Reorder recommended';
  }

  private async createHistoryEntry(
    recommendationId: string,
    workspaceId: string,
    fromStatus: ReorderRecommendationStatus | null,
    toStatus: ReorderRecommendationStatus,
    reason: string,
    changedBy?: string,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      recommendationId,
      workspaceId,
      fromStatus,
      toStatus,
      reason,
      changedBy,
      createdAt: new Date(),
    });
  }

  private async publishRecommendationEvents(
    recommendation: IReorderRecommendation,
  ): Promise<void> {
    await this.eventQueue.publish({
      event: ReorderEvent.RECOMMENDATION_CREATED,
      workspaceId: recommendation.workspaceId,
      inventoryItemId: recommendation.inventoryItemId,
      sku: recommendation.sku,
      warehouseId: recommendation.warehouseId,
      recommendationId: recommendation.id,
      stockLevelStatus: recommendation.stockLevelStatus,
      currentStock: recommendation.currentStock,
      reorderPoint: recommendation.reorderPoint || undefined,
      recommendedQuantity: recommendation.recommendedQuantity,
    });

    if (recommendation.stockLevelStatus === StockLevelStatus.LOW) {
      await this.eventQueue.publish({
        event: ReorderEvent.LOW_STOCK_DETECTED,
        workspaceId: recommendation.workspaceId,
        inventoryItemId: recommendation.inventoryItemId,
        sku: recommendation.sku,
        warehouseId: recommendation.warehouseId,
        currentStock: recommendation.currentStock,
        reorderPoint: recommendation.reorderPoint || undefined,
      });
    }

    if (recommendation.stockLevelStatus === StockLevelStatus.CRITICAL) {
      await this.eventQueue.publish({
        event: ReorderEvent.CRITICAL_STOCK_DETECTED,
        workspaceId: recommendation.workspaceId,
        inventoryItemId: recommendation.inventoryItemId,
        sku: recommendation.sku,
        warehouseId: recommendation.warehouseId,
        currentStock: recommendation.currentStock,
      });
    }

    if (recommendation.stockLevelStatus === StockLevelStatus.OUT_OF_STOCK) {
      await this.eventQueue.publish({
        event: ReorderEvent.OUT_OF_STOCK_DETECTED,
        workspaceId: recommendation.workspaceId,
        inventoryItemId: recommendation.inventoryItemId,
        sku: recommendation.sku,
        warehouseId: recommendation.warehouseId,
      });
    }

    if (recommendation.stockLevelStatus === StockLevelStatus.EXCESS) {
      await this.eventQueue.publish({
        event: ReorderEvent.EXCESS_STOCK_DETECTED,
        workspaceId: recommendation.workspaceId,
        inventoryItemId: recommendation.inventoryItemId,
        sku: recommendation.sku,
        warehouseId: recommendation.warehouseId,
        currentStock: recommendation.currentStock,
      });
    }
  }
}
