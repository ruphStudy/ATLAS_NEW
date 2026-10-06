import { Injectable, Logger } from '@nestjs/common';
import { FBAShipmentRepository } from './fba-shipment.repository';
import { FBAShipmentEventQueue } from './jobs';
import {
  CreateFBAShipmentDto,
  AddFBAShipmentItemDto,
  BuildShipmentFromInventoryDto,
  PlanShipmentDto,
  ApproveShipmentDto,
  PrepareShipmentDto,
  DispatchShipmentDto,
  TrackShipmentDto,
  ReconcileShipmentDto,
  CloseShipmentDto,
  CancelShipmentDto,
  UpdateFBAShipmentItemDto,
  CreateFBAShipmentBoxDto,
  AddBoxContentDto,
  RecordDiscrepancyDto,
  ReconcileDiscrepancyDto,
  FBAShipmentFilterDto,
  FBAShipmentResponseDto,
  PaginatedFBAShipmentResponseDto,
} from './dto';
import {
  FBAShipmentStatus,
  FBAShipmentEvent,
  IFBAShipment,
  IFBAShipmentItem,
  IFBAShipmentBox,
  IFBAReceivingDiscrepancy,
} from './interfaces';
import { ALLOWED_STATUS_TRANSITIONS, FBA_SHIPMENT_PREFIX } from './constants';
import { BusinessRuleException } from '@common/exceptions';
import { ResourceNotFoundException } from '@common/exceptions';
import { DuplicateResourceException } from '@common/exceptions';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class FBAShipmentService {
  private readonly logger = new Logger(FBAShipmentService.name);

  constructor(
    private readonly repository: FBAShipmentRepository,
    private readonly eventQueue: FBAShipmentEventQueue,
  ) {}

  async create(
    workspaceId: string,
    dto: CreateFBAShipmentDto,
    createdBy?: string,
  ): Promise<IFBAShipment> {
    if (dto.externalShipmentId) {
      const existing = await this.repository.findByExternalId(
        dto.externalShipmentId,
        workspaceId,
      );
      if (existing) {
        throw new DuplicateResourceException(
          'FBA shipment with this external ID already exists',
          ErrorCode.DUPLICATE_RESOURCE,
        );
      }
    }

    const sequence = await this.repository.getNextSequence(workspaceId);
    const shipmentNumber = `${FBA_SHIPMENT_PREFIX}-${String(sequence).padStart(6, '0')}`;

    const data = {
      workspaceId,
      shipmentNumber,
      shipmentSequence: sequence,
      status: FBAShipmentStatus.DRAFT,
      shipmentType: dto.shipmentType,
      marketplaceAccountId: dto.marketplaceAccountId,
      warehouseId: dto.warehouseId,
      externalShipmentId: dto.externalShipmentId,
      externalShipmentName: dto.externalShipmentName,
      externalPlanId: dto.externalPlanId,
      destinationFCId: dto.destinationFCId,
      destinationFCName: dto.destinationFCName,
      destinationAddress: dto.destinationAddress,
      labelType: dto.labelType,
      carrierType: dto.carrierType,
      carrierName: dto.carrierName,
      carrierId: dto.carrierId,
      serviceType: dto.serviceType,
      isCasePacked: dto.isCasePacked ?? false,
      prepInstructions: dto.prepInstructions,
      priority: dto.priority ?? 0,
      notes: dto.notes,
      metadata: dto.metadata ?? {},
      createdBy,
      items: dto.items
        ? {
            create: dto.items.map((item, index) => ({
              workspaceId,
              lineNumber: index + 1,
              inventoryItemId: item.inventoryItemId,
              sku: item.sku,
              fnsku: item.fnsku,
              asin: item.asin,
              productName: item.productName,
              variantId: item.variantId,
              batchNumber: item.batchNumber,
              serialNumber: item.serialNumber,
              externalProductId: item.externalProductId,
              externalListingId: item.externalListingId,
              prepType: item.prepType,
              prepRequired: item.prepRequired ?? false,
              labelRequired: item.labelRequired ?? false,
              requestedQuantity: item.requestedQuantity,
              condition: item.condition ?? 'NEW',
              conditionNote: item.conditionNote,
              metadata: item.metadata ?? {},
            })),
          }
        : undefined,
    };

    const shipment = (await this.repository.create(data)) as unknown as IFBAShipment;

    await this.createHistoryEntry(
      shipment.id,
      workspaceId,
      null,
      FBAShipmentStatus.DRAFT,
      'Shipment created',
      createdBy,
    );

    await this.eventQueue.publish({
      event: FBAShipmentEvent.CREATED,
      shipmentId: shipment.id,
      workspaceId,
      marketplaceAccountId: shipment.marketplaceAccountId,
      externalShipmentId: shipment.externalShipmentId,
      status: shipment.status,
    });

    return shipment;
  }

  async buildShipmentFromInventory(
    workspaceId: string,
    dto: BuildShipmentFromInventoryDto,
    createdBy?: string,
  ): Promise<IFBAShipment> {
    const items: AddFBAShipmentItemDto[] = [];

    // In a real implementation, this would fetch inventory items and build shipment items
    // For now, we create a basic shipment structure

    const createDto: CreateFBAShipmentDto = {
      shipmentType: dto.shipmentType,
      marketplaceAccountId: dto.marketplaceAccountId,
      warehouseId: dto.warehouseId,
      destinationFCId: dto.destinationFCId,
      isCasePacked: dto.isCasePacked,
      prepInstructions: dto.prepInstructions,
      items,
    };

    return this.create(workspaceId, createDto, createdBy);
  }

  async plan(
    id: string,
    workspaceId: string,
    dto: PlanShipmentDto,
    changedBy?: string,
  ): Promise<IFBAShipment> {
    const shipment = await this.findById(id, workspaceId);

    this.validateStatusTransition(
      shipment.status as FBAShipmentStatus,
      FBAShipmentStatus.PLANNED,
    );

    const updated = (await this.repository.update(id, workspaceId, {
      status: FBAShipmentStatus.PLANNED,
      externalShipmentId: dto.externalShipmentId ?? shipment.externalShipmentId,
      externalPlanId: dto.externalPlanId ?? shipment.externalPlanId,
      destinationFCId: dto.destinationFCId ?? shipment.destinationFCId,
      destinationFCName: dto.destinationFCName ?? shipment.destinationFCName,
      destinationAddress: dto.destinationAddress ?? shipment.destinationAddress,
      shipmentPlanUrl: dto.shipmentPlanUrl,
      plannedAt: new Date(),
      metadata: { ...shipment.metadata, ...dto.metadata },
    })) as unknown as IFBAShipment;

    await this.createHistoryEntry(
      id,
      workspaceId,
      shipment.status as FBAShipmentStatus,
      FBAShipmentStatus.PLANNED,
      'Shipment planned',
      changedBy,
    );

    await this.eventQueue.publish({
      event: FBAShipmentEvent.PLANNED,
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: updated.marketplaceAccountId,
      externalShipmentId: updated.externalShipmentId,
      status: updated.status,
    });

    return updated;
  }

  async approve(
    id: string,
    workspaceId: string,
    dto: ApproveShipmentDto,
    approvedBy?: string,
  ): Promise<IFBAShipment> {
    const shipment = await this.findById(id, workspaceId);

    this.validateStatusTransition(
      shipment.status as FBAShipmentStatus,
      FBAShipmentStatus.APPROVED,
    );

    const updated = (await this.repository.update(id, workspaceId, {
      status: FBAShipmentStatus.APPROVED,
      approvedAt: new Date(),
      approvedBy: dto.approvedBy ?? approvedBy,
      notes: dto.notes ?? shipment.notes,
    })) as unknown as IFBAShipment;

    await this.createHistoryEntry(
      id,
      workspaceId,
      shipment.status as FBAShipmentStatus,
      FBAShipmentStatus.APPROVED,
      'Shipment approved',
      approvedBy,
    );

    await this.eventQueue.publish({
      event: FBAShipmentEvent.APPROVED,
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: updated.marketplaceAccountId,
      externalShipmentId: updated.externalShipmentId,
      status: updated.status,
    });

    return updated;
  }

  async prepare(
    id: string,
    workspaceId: string,
    dto: PrepareShipmentDto,
    changedBy?: string,
  ): Promise<IFBAShipment> {
    const shipment = await this.findById(id, workspaceId);

    this.validateStatusTransition(
      shipment.status as FBAShipmentStatus,
      FBAShipmentStatus.PREPARING,
    );

    const updated = (await this.repository.update(id, workspaceId, {
      status: FBAShipmentStatus.PREPARING,
      packingTaskId: dto.packingTaskId ?? shipment.packingTaskId,
      transferId: dto.transferId ?? shipment.transferId,
      reservationId: dto.reservationId ?? shipment.reservationId,
      preparedAt: new Date(),
    })) as unknown as IFBAShipment;

    await this.createHistoryEntry(
      id,
      workspaceId,
      shipment.status as FBAShipmentStatus,
      FBAShipmentStatus.PREPARING,
      'Shipment preparation started',
      changedBy,
    );

    await this.eventQueue.publish({
      event: FBAShipmentEvent.PREPARING_STARTED,
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: updated.marketplaceAccountId,
      externalShipmentId: updated.externalShipmentId,
      status: updated.status,
    });

    return updated;
  }

  async dispatch(
    id: string,
    workspaceId: string,
    dto: DispatchShipmentDto,
    dispatchedBy?: string,
  ): Promise<IFBAShipment> {
    const shipment = await this.findById(id, workspaceId);

    this.validateStatusTransition(
      shipment.status as FBAShipmentStatus,
      FBAShipmentStatus.DISPATCHED,
    );

    const updated = (await this.repository.update(id, workspaceId, {
      status: FBAShipmentStatus.DISPATCHED,
      dispatchTaskId: dto.dispatchTaskId ?? shipment.dispatchTaskId,
      dispatchedAt: new Date(),
      dispatchedBy: dto.dispatchedBy ?? dispatchedBy,
      metadata: { ...shipment.metadata, ...dto.metadata },
    })) as unknown as IFBAShipment;

    await this.createHistoryEntry(
      id,
      workspaceId,
      shipment.status as FBAShipmentStatus,
      FBAShipmentStatus.DISPATCHED,
      'Shipment dispatched',
      dispatchedBy,
    );

    await this.eventQueue.publish({
      event: FBAShipmentEvent.DISPATCHED,
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: updated.marketplaceAccountId,
      externalShipmentId: updated.externalShipmentId,
      status: updated.status,
    });

    return updated;
  }

  async track(
    id: string,
    workspaceId: string,
    dto: TrackShipmentDto,
    changedBy?: string,
  ): Promise<IFBAShipment> {
    const shipment = await this.findById(id, workspaceId);

    const updated = (await this.repository.update(id, workspaceId, {
      externalShipmentId: dto.externalShipmentId ?? shipment.externalShipmentId,
      trackingReferences: dto.trackingReferences ?? shipment.trackingReferences,
      externalReferences: dto.externalReferences ?? shipment.externalReferences,
      metadata: { ...shipment.metadata, ...dto.metadata },
    })) as unknown as IFBAShipment;

    return updated;
  }

  async updateStatus(
    id: string,
    workspaceId: string,
    status: FBAShipmentStatus,
    changedBy?: string,
  ): Promise<IFBAShipment> {
    const shipment = await this.findById(id, workspaceId);

    this.validateStatusTransition(shipment.status as FBAShipmentStatus, status);

    const updateData: Record<string, unknown> = { status };

    if (status === FBAShipmentStatus.SHIPPED) {
      updateData['shippedAt'] = new Date();
    } else if (status === FBAShipmentStatus.DELIVERED) {
      updateData['deliveredAt'] = new Date();
    } else if (status === FBAShipmentStatus.CHECKED_IN) {
      updateData['checkedInAt'] = new Date();
    } else if (status === FBAShipmentStatus.RECEIVING) {
      updateData['receivingStartedAt'] = new Date();
    } else if (status === FBAShipmentStatus.RECEIVED) {
      updateData['receivedAt'] = new Date();
    }

    const updated = (await this.repository.update(
      id,
      workspaceId,
      updateData,
    )) as unknown as IFBAShipment;

    await this.createHistoryEntry(
      id,
      workspaceId,
      shipment.status as FBAShipmentStatus,
      status,
      `Status updated to ${status}`,
      changedBy,
    );

    const eventMap: Record<FBAShipmentStatus, FBAShipmentEvent> = {
      [FBAShipmentStatus.DRAFT]: FBAShipmentEvent.CREATED,
      [FBAShipmentStatus.PLANNED]: FBAShipmentEvent.PLANNED,
      [FBAShipmentStatus.APPROVED]: FBAShipmentEvent.APPROVED,
      [FBAShipmentStatus.PREPARING]: FBAShipmentEvent.PREPARING_STARTED,
      [FBAShipmentStatus.DISPATCHED]: FBAShipmentEvent.DISPATCHED,
      [FBAShipmentStatus.SHIPPED]: FBAShipmentEvent.SHIPPED,
      [FBAShipmentStatus.IN_TRANSIT]: FBAShipmentEvent.IN_TRANSIT,
      [FBAShipmentStatus.DELIVERED]: FBAShipmentEvent.DELIVERED,
      [FBAShipmentStatus.CHECKED_IN]: FBAShipmentEvent.CHECKED_IN,
      [FBAShipmentStatus.RECEIVING]: FBAShipmentEvent.RECEIVING_STARTED,
      [FBAShipmentStatus.RECEIVED]: FBAShipmentEvent.RECEIVED,
      [FBAShipmentStatus.CLOSED]: FBAShipmentEvent.CLOSED,
      [FBAShipmentStatus.PROBLEM]: FBAShipmentEvent.PROBLEM_DETECTED,
      [FBAShipmentStatus.CANCELLED]: FBAShipmentEvent.CANCELLED,
    };

    await this.eventQueue.publish({
      event: eventMap[status],
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: updated.marketplaceAccountId,
      externalShipmentId: updated.externalShipmentId,
      status: updated.status,
    });

    return updated;
  }

  async reconcile(
    id: string,
    workspaceId: string,
    dto: ReconcileShipmentDto,
    changedBy?: string,
  ): Promise<IFBAShipment> {
    const shipment = await this.findById(id, workspaceId);

    const updateData: Record<string, unknown> = {};

    if (dto.receivedUnits !== undefined) {
      updateData['receivedUnits'] = dto.receivedUnits;
    }

    if (dto.itemReceipts) {
      // Update individual item received quantities
      const items = await this.repository.findItemsByShipment(id, workspaceId);
      for (const item of items) {
        const itemId = item['id'] as string;
        const sku = item['sku'] as string;
        if (dto.itemReceipts[sku] !== undefined) {
          await this.repository.updateItem(itemId, workspaceId, {
            receivedQuantity: dto.itemReceipts[sku],
          });
        }
      }
    }

    updateData['metadata'] = { ...shipment.metadata, ...dto.metadata };

    const updated = (await this.repository.update(
      id,
      workspaceId,
      updateData,
    )) as unknown as IFBAShipment;

    return updated;
  }

  async close(
    id: string,
    workspaceId: string,
    dto: CloseShipmentDto,
    closedBy?: string,
  ): Promise<IFBAShipment> {
    const shipment = await this.findById(id, workspaceId);

    this.validateStatusTransition(
      shipment.status as FBAShipmentStatus,
      FBAShipmentStatus.CLOSED,
    );

    const updated = (await this.repository.update(id, workspaceId, {
      status: FBAShipmentStatus.CLOSED,
      closedAt: new Date(),
      closedBy: dto.closedBy ?? closedBy,
      notes: dto.notes ?? shipment.notes,
    })) as unknown as IFBAShipment;

    await this.createHistoryEntry(
      id,
      workspaceId,
      shipment.status as FBAShipmentStatus,
      FBAShipmentStatus.CLOSED,
      'Shipment closed',
      closedBy,
    );

    await this.eventQueue.publish({
      event: FBAShipmentEvent.CLOSED,
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: updated.marketplaceAccountId,
      externalShipmentId: updated.externalShipmentId,
      status: updated.status,
    });

    return updated;
  }

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelShipmentDto,
    cancelledBy?: string,
  ): Promise<IFBAShipment> {
    const shipment = await this.findById(id, workspaceId);

    this.validateStatusTransition(
      shipment.status as FBAShipmentStatus,
      FBAShipmentStatus.CANCELLED,
    );

    const updated = (await this.repository.update(id, workspaceId, {
      status: FBAShipmentStatus.CANCELLED,
      cancelReason: dto.cancelReason,
      cancelledBy: dto.cancelledBy ?? cancelledBy,
      cancelledAt: new Date(),
    })) as unknown as IFBAShipment;

    await this.createHistoryEntry(
      id,
      workspaceId,
      shipment.status as FBAShipmentStatus,
      FBAShipmentStatus.CANCELLED,
      dto.cancelReason,
      cancelledBy,
    );

    await this.eventQueue.publish({
      event: FBAShipmentEvent.CANCELLED,
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: updated.marketplaceAccountId,
      externalShipmentId: updated.externalShipmentId,
      status: updated.status,
    });

    return updated;
  }

  async addItem(
    id: string,
    workspaceId: string,
    dto: AddFBAShipmentItemDto,
    changedBy?: string,
  ): Promise<IFBAShipmentItem> {
    const shipment = await this.findById(id, workspaceId);

    if (
      shipment.status !== FBAShipmentStatus.DRAFT &&
      shipment.status !== FBAShipmentStatus.PLANNED
    ) {
      throw new BusinessRuleException(
        'Cannot add items to shipment in current status',
        ErrorCode.FBA_SHIPMENT_UPDATE_NOT_ALLOWED,
      );
    }

    const items = await this.repository.findItemsByShipment(id, workspaceId);
    const lineNumber = items.length + 1;

    const item = (await this.repository.createItem({
      shipmentId: id,
      workspaceId,
      lineNumber,
      inventoryItemId: dto.inventoryItemId,
      sku: dto.sku,
      fnsku: dto.fnsku,
      asin: dto.asin,
      productName: dto.productName,
      variantId: dto.variantId,
      batchNumber: dto.batchNumber,
      serialNumber: dto.serialNumber,
      externalProductId: dto.externalProductId,
      externalListingId: dto.externalListingId,
      prepType: dto.prepType,
      prepRequired: dto.prepRequired ?? false,
      labelRequired: dto.labelRequired ?? false,
      requestedQuantity: dto.requestedQuantity,
      condition: dto.condition ?? 'NEW',
      conditionNote: dto.conditionNote,
      metadata: dto.metadata ?? {},
    })) as unknown as IFBAShipmentItem;

    await this.repository.update(id, workspaceId, {
      totalUnits: shipment.totalUnits + dto.requestedQuantity,
    });

    await this.eventQueue.publish({
      event: FBAShipmentEvent.ITEM_ADDED,
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: shipment.marketplaceAccountId,
      externalShipmentId: shipment.externalShipmentId,
      metadata: { itemId: item.id, sku: item.sku },
    });

    return item;
  }

  async updateItem(
    id: string,
    itemId: string,
    workspaceId: string,
    dto: UpdateFBAShipmentItemDto,
    changedBy?: string,
  ): Promise<IFBAShipmentItem> {
    const shipment = await this.findById(id, workspaceId);
    const item = await this.repository.findItemById(itemId, workspaceId);

    if (!item || item['shipmentId'] !== id) {
      throw new ResourceNotFoundException(
        'Shipment item not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const updated = (await this.repository.updateItem(
      itemId,
      workspaceId,
      dto as unknown as Record<string, unknown>,
    )) as unknown as IFBAShipmentItem;

    await this.eventQueue.publish({
      event: FBAShipmentEvent.ITEM_UPDATED,
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: shipment.marketplaceAccountId,
      externalShipmentId: shipment.externalShipmentId,
      metadata: { itemId: updated.id, sku: updated.sku },
    });

    return updated;
  }

  async createBox(
    id: string,
    workspaceId: string,
    dto: CreateFBAShipmentBoxDto,
    changedBy?: string,
  ): Promise<IFBAShipmentBox> {
    const shipment = await this.findById(id, workspaceId);

    const sequence = await this.repository.getNextBoxSequence(id);

    const box = (await this.repository.createBox({
      shipmentId: id,
      workspaceId,
      boxNumber: dto.boxNumber,
      boxSequence: sequence,
      externalBoxId: dto.externalBoxId,
      packageId: dto.packageId,
      packingPackageId: dto.packingPackageId,
      packageType: dto.packageType,
      length: dto.dimensions?.length,
      width: dto.dimensions?.width,
      height: dto.dimensions?.height,
      dimensionUnit: dto.dimensions?.dimensionUnit ?? 'cm',
      weight: dto.weight?.weight,
      weightUnit: dto.weight?.weightUnit ?? 'kg',
      metadata: dto.metadata ?? {},
    })) as unknown as IFBAShipmentBox;

    await this.repository.update(id, workspaceId, {
      totalBoxes: shipment.totalBoxes + 1,
    });

    await this.eventQueue.publish({
      event: FBAShipmentEvent.BOX_CREATED,
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: shipment.marketplaceAccountId,
      externalShipmentId: shipment.externalShipmentId,
      metadata: { boxId: box.id, boxNumber: box.boxNumber },
    });

    return box;
  }

  async addBoxContent(
    id: string,
    boxId: string,
    workspaceId: string,
    dto: AddBoxContentDto,
    changedBy?: string,
  ): Promise<void> {
    const shipment = await this.findById(id, workspaceId);
    const box = await this.repository.findBoxById(boxId, workspaceId);

    if (!box || box['shipmentId'] !== id) {
      throw new ResourceNotFoundException(
        'Shipment box not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const item = await this.repository.findItemById(dto.itemId, workspaceId);
    if (!item || item['shipmentId'] !== id) {
      throw new ResourceNotFoundException(
        'Shipment item not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const existing = await this.repository.findBoxContentByBoxAndItem(
      boxId,
      dto.itemId,
      workspaceId,
    );

    if (existing) {
      await this.repository.updateBoxContent(existing['id'] as string, workspaceId, {
        quantity: (existing['quantity'] as number) + dto.quantity,
      });
    } else {
      await this.repository.createBoxContent({
        boxId,
        itemId: dto.itemId,
        workspaceId,
        quantity: dto.quantity,
        metadata: {},
      });
    }

    await this.repository.updateBox(boxId, workspaceId, {
      totalUnits: (box['totalUnits'] as number) + dto.quantity,
    });

    await this.eventQueue.publish({
      event: FBAShipmentEvent.BOX_PACKED,
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: shipment.marketplaceAccountId,
      externalShipmentId: shipment.externalShipmentId,
      metadata: { boxId, itemId: dto.itemId, quantity: dto.quantity },
    });
  }

  async recordDiscrepancy(
    id: string,
    workspaceId: string,
    dto: RecordDiscrepancyDto,
    changedBy?: string,
  ): Promise<IFBAReceivingDiscrepancy> {
    const shipment = await this.findById(id, workspaceId);

    const discrepancy = (await this.repository.createDiscrepancy({
      shipmentId: id,
      itemId: dto.itemId,
      workspaceId,
      discrepancyType: dto.discrepancyType,
      sku: dto.sku,
      fnsku: dto.fnsku,
      asin: dto.sku,
      expectedQuantity: dto.expectedQuantity,
      shippedQuantity: dto.shippedQuantity,
      receivedQuantity: dto.receivedQuantity,
      varianceQuantity: dto.varianceQuantity,
      description: dto.description,
      externalReference: dto.externalReference,
      evidenceUrls: [],
      metadata: dto.metadata ?? {},
    })) as unknown as IFBAReceivingDiscrepancy;

    await this.eventQueue.publish({
      event: FBAShipmentEvent.DISCREPANCY_RECORDED,
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: shipment.marketplaceAccountId,
      externalShipmentId: shipment.externalShipmentId,
      metadata: {
        discrepancyId: discrepancy.id,
        discrepancyType: discrepancy.discrepancyType,
      },
    });

    return discrepancy;
  }

  async reconcileDiscrepancy(
    id: string,
    discrepancyId: string,
    workspaceId: string,
    dto: ReconcileDiscrepancyDto,
    reconciledBy?: string,
  ): Promise<IFBAReceivingDiscrepancy> {
    const shipment = await this.findById(id, workspaceId);
    const discrepancy = await this.repository.findDiscrepancyById(
      discrepancyId,
      workspaceId,
    );

    if (!discrepancy || discrepancy['shipmentId'] !== id) {
      throw new ResourceNotFoundException(
        'Discrepancy not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    const updated = (await this.repository.updateDiscrepancy(
      discrepancyId,
      workspaceId,
      {
        reconciled: true,
        reconciledBy: dto.reconciledBy ?? reconciledBy,
        reconciledAt: new Date(),
        reconciliationNotes: dto.reconciliationNotes,
        adjustmentId: dto.adjustmentId,
      },
    )) as unknown as IFBAReceivingDiscrepancy;

    await this.eventQueue.publish({
      event: FBAShipmentEvent.DISCREPANCY_RECONCILED,
      shipmentId: id,
      workspaceId,
      marketplaceAccountId: shipment.marketplaceAccountId,
      externalShipmentId: shipment.externalShipmentId,
      metadata: { discrepancyId: updated.id },
    });

    return updated;
  }

  async findAll(
    workspaceId: string,
    filter: FBAShipmentFilterDto,
  ): Promise<PaginatedFBAShipmentResponseDto> {
    const [data, total] = await this.repository.findAll(workspaceId, filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as unknown as FBAShipmentResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string, workspaceId: string): Promise<IFBAShipment> {
    const shipment = await this.repository.findById(id, workspaceId);
    if (!shipment) {
      throw new ResourceNotFoundException(
        'FBA shipment not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return shipment as unknown as IFBAShipment;
  }

  async findByNumber(
    shipmentNumber: string,
    workspaceId: string,
  ): Promise<IFBAShipment> {
    const shipment = await this.repository.findByNumber(shipmentNumber, workspaceId);
    if (!shipment) {
      throw new ResourceNotFoundException(
        'FBA shipment not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return shipment as unknown as IFBAShipment;
  }

  async getItems(id: string, workspaceId: string): Promise<IFBAShipmentItem[]> {
    await this.findById(id, workspaceId);
    const items = await this.repository.findItemsByShipment(id, workspaceId);
    return items as unknown as IFBAShipmentItem[];
  }

  async getBoxes(id: string, workspaceId: string): Promise<IFBAShipmentBox[]> {
    await this.findById(id, workspaceId);
    const boxes = await this.repository.findBoxesByShipment(id, workspaceId);
    return boxes as unknown as IFBAShipmentBox[];
  }

  async getDiscrepancies(
    id: string,
    workspaceId: string,
  ): Promise<IFBAReceivingDiscrepancy[]> {
    await this.findById(id, workspaceId);
    const discrepancies = await this.repository.findDiscrepanciesByShipment(
      id,
      workspaceId,
    );
    return discrepancies as unknown as IFBAReceivingDiscrepancy[];
  }

  private validateStatusTransition(
    currentStatus: FBAShipmentStatus,
    newStatus: FBAShipmentStatus,
  ): void {
    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new BusinessRuleException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        ErrorCode.FBA_SHIPMENT_INVALID_STATUS_TRANSITION,
      );
    }
  }

  private async createHistoryEntry(
    shipmentId: string,
    workspaceId: string,
    fromStatus: FBAShipmentStatus | null,
    toStatus: FBAShipmentStatus,
    reason: string,
    changedBy?: string,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      shipmentId,
      workspaceId,
      fromStatus,
      toStatus,
      reason,
      changedBy,
      createdAt: new Date(),
    });
  }
}
