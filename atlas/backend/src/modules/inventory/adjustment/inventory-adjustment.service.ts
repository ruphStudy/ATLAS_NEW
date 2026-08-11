import { Injectable } from '@nestjs/common';
import { BusinessRuleException, ResourceNotFoundException } from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { InventoryRepository } from '../inventory.repository';
import { InventoryStockRepository } from '../stock/inventory-stock.repository';
import { InventoryStockService } from '../stock/inventory-stock.service';
import { InventoryValidator } from '../validator/inventory.validator';
import { InventoryEventQueue } from '../jobs';
import { InventoryAdjustmentRepository } from './inventory-adjustment.repository';
import {
  InventoryAdjustmentStatus,
  InventoryAdjustmentType,
  InventoryEvent,
  InventoryStockStatus,
} from '../interfaces';
import {
  ApproveAdjustmentDto,
  CancelAdjustmentDto,
  CreateAdjustmentDto,
  InventoryAdjustmentFilterDto,
  InventoryAdjustmentHistoryResponseDto,
  InventoryAdjustmentListResponseDto,
  InventoryAdjustmentResponseDto,
  PostAdjustmentDto,
  RejectAdjustmentDto,
  ReverseAdjustmentDto,
} from '../dto';
import { INVENTORY_ADJUSTMENT_CONSTANTS } from '../constants';

const STATUS_MOVE_TYPES = new Set([
  InventoryAdjustmentType.DAMAGE,
  InventoryAdjustmentType.LOSS,
  InventoryAdjustmentType.EXPIRY,
  InventoryAdjustmentType.STATUS_CORRECTION,
]);

@Injectable()
export class InventoryAdjustmentService {
  constructor(
    private readonly repository: InventoryAdjustmentRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly stockRepository: InventoryStockRepository,
    private readonly stockService: InventoryStockService,
    private readonly validator: InventoryValidator,
    private readonly eventQueue: InventoryEventQueue,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Inventory adjustment', id);
    return record;
  }

  private async recordHistory(
    adjustmentId: string,
    workspaceId: string,
    fromStatus: InventoryAdjustmentStatus | null,
    toStatus: InventoryAdjustmentStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      adjustmentId,
      workspaceId,
      fromStatus,
      toStatus,
      reason,
      changedBy,
    });
  }

  private async publishEvent(
    item: Record<string, unknown>,
    workspaceId: string,
    event: InventoryEvent,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      inventoryItemId: item['id'] as string,
      sku: item['sku'] as string,
      workspaceId,
      event,
      metadata,
    });
  }

  private validateAdjustmentInput(dto: CreateAdjustmentDto): void {
    if (dto.type === InventoryAdjustmentType.STATUS_CORRECTION) {
      if (!dto.fromStatus || !dto.toStatus) {
        throw new BusinessRuleException(
          'fromStatus and toStatus are required for STATUS_CORRECTION adjustments',
          ErrorCode.VALIDATION_FAILED,
        );
      }
      if (!dto.quantity) {
        throw new BusinessRuleException(
          'quantity is required for STATUS_CORRECTION adjustments',
          ErrorCode.VALIDATION_FAILED,
        );
      }
      this.validator.assertQuantityPositive(dto.quantity);
      return;
    }

    if (
      dto.type === InventoryAdjustmentType.DAMAGE ||
      dto.type === InventoryAdjustmentType.LOSS ||
      dto.type === InventoryAdjustmentType.EXPIRY
    ) {
      if (!dto.quantity) {
        throw new BusinessRuleException(
          `quantity is required for ${dto.type} adjustments`,
          ErrorCode.VALIDATION_FAILED,
        );
      }
      this.validator.assertQuantityPositive(dto.quantity);
      return;
    }

    if (dto.type === InventoryAdjustmentType.COUNT_VARIANCE) {
      if (dto.quantityDelta === undefined || dto.quantityDelta === 0) {
        throw new BusinessRuleException(
          'quantityDelta is required and must be non-zero for COUNT_VARIANCE adjustments',
          ErrorCode.VALIDATION_FAILED,
        );
      }
      return;
    }

    // INCREASE / DECREASE
    if (!dto.quantity) {
      throw new BusinessRuleException(
        `quantity is required for ${dto.type} adjustments`,
        ErrorCode.VALIDATION_FAILED,
      );
    }
    this.validator.assertQuantityPositive(dto.quantity);
  }

  private evaluateApprovalRequired(dto: CreateAdjustmentDto, userRole?: string): boolean {
    if (INVENTORY_ADJUSTMENT_CONSTANTS.ALWAYS_REQUIRE_APPROVAL_TYPES.includes(dto.type)) {
      return true;
    }
    if (userRole && INVENTORY_ADJUSTMENT_CONSTANTS.AUTO_APPROVE_ROLES.includes(userRole)) {
      return false;
    }
    const quantity = dto.quantity ?? Math.abs(dto.quantityDelta ?? 0);
    if (quantity > INVENTORY_ADJUSTMENT_CONSTANTS.AUTO_APPROVE_MAX_QUANTITY) {
      return true;
    }
    const estimatedValue = quantity * (dto.unitCost ?? 0);
    if (estimatedValue > INVENTORY_ADJUSTMENT_CONSTANTS.AUTO_APPROVE_MAX_VALUE) {
      return true;
    }
    return false;
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateAdjustmentDto,
    createdBy: string,
    userRole?: string,
  ): Promise<InventoryAdjustmentResponseDto> {
    if (dto.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(workspaceId, dto.idempotencyKey);
      if (existing) return InventoryAdjustmentResponseDto.from(existing);
    }

    const item = await this.inventoryRepository.findById(dto.inventoryItemId, workspaceId);
    if (!item) throw new ResourceNotFoundException('Inventory item', dto.inventoryItemId);

    this.validateAdjustmentInput(dto);

    const uom = dto.uom ?? (item['baseUom'] as string);
    const requiresApproval = this.evaluateApprovalRequired(dto, userRole);
    const initialStatus = requiresApproval
      ? InventoryAdjustmentStatus.PENDING_APPROVAL
      : InventoryAdjustmentStatus.APPROVED;

    const adjustment = await this.repository.create({
      workspaceId,
      inventoryItemId: dto.inventoryItemId,
      sku: (item['sku'] as string | null) ?? null,
      catalogProductId: (item['catalogProductId'] as string | null) ?? null,
      variantId: (item['variantId'] as string | null) ?? null,
      type: dto.type,
      status: initialStatus,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId ?? null,
      batchId: dto.batchId ?? null,
      serialId: dto.serialId ?? null,
      fromStatus: dto.fromStatus ?? null,
      toStatus: dto.toStatus ?? null,
      quantity: dto.quantity ?? null,
      quantityDelta: dto.quantityDelta ?? null,
      uom,
      unitCost: dto.unitCost ?? null,
      reason: dto.reason,
      sourceReferenceType: dto.sourceReferenceType ?? null,
      sourceReferenceId: dto.sourceReferenceId ?? null,
      notes: dto.notes ?? null,
      evidence: dto.evidence ?? [],
      idempotencyKey: dto.idempotencyKey ?? null,
      metadata: dto.metadata ?? {},
      createdBy,
    });

    const id = adjustment['id'] as string;

    await this.recordHistory(
      id,
      workspaceId,
      null,
      initialStatus,
      requiresApproval ? 'Adjustment submitted for approval' : 'Adjustment auto-approved',
      createdBy,
    );

    await this.publishEvent(item, workspaceId, InventoryEvent.ADJUSTMENT_CREATED, {
      adjustmentId: id,
      type: dto.type,
      requiresApproval,
    });

    if (!requiresApproval) {
      await this.publishEvent(item, workspaceId, InventoryEvent.ADJUSTMENT_APPROVED, {
        adjustmentId: id,
        autoApproved: true,
      });
    }

    return InventoryAdjustmentResponseDto.from(adjustment);
  }

  // ── Approve / Reject / Cancel ─────────────────────────────────

  async approve(
    id: string,
    workspaceId: string,
    dto: ApproveAdjustmentDto,
    userId: string,
  ): Promise<InventoryAdjustmentResponseDto> {
    const adjustment = await this.findOrFail(id, workspaceId);
    const status = adjustment['status'] as InventoryAdjustmentStatus;
    this.validator.assertAdjustmentTransition(status, InventoryAdjustmentStatus.APPROVED);

    const updated = await this.repository.update(id, {
      status: InventoryAdjustmentStatus.APPROVED,
      approvedBy: userId,
      approvedAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryAdjustmentStatus.APPROVED,
      dto.notes ?? 'Adjustment approved',
      userId,
    );

    const item = await this.inventoryRepository.findById(adjustment['inventoryItemId'] as string, workspaceId);
    if (item) {
      await this.publishEvent(item, workspaceId, InventoryEvent.ADJUSTMENT_APPROVED, { adjustmentId: id });
    }

    return InventoryAdjustmentResponseDto.from(updated);
  }

  async reject(
    id: string,
    workspaceId: string,
    dto: RejectAdjustmentDto,
    userId: string,
  ): Promise<InventoryAdjustmentResponseDto> {
    const adjustment = await this.findOrFail(id, workspaceId);
    const status = adjustment['status'] as InventoryAdjustmentStatus;
    this.validator.assertAdjustmentTransition(status, InventoryAdjustmentStatus.REJECTED);

    const updated = await this.repository.update(id, { status: InventoryAdjustmentStatus.REJECTED });

    await this.recordHistory(id, workspaceId, status, InventoryAdjustmentStatus.REJECTED, dto.reason, userId);

    const item = await this.inventoryRepository.findById(adjustment['inventoryItemId'] as string, workspaceId);
    if (item) {
      await this.publishEvent(item, workspaceId, InventoryEvent.ADJUSTMENT_REJECTED, {
        adjustmentId: id,
        reason: dto.reason,
      });
    }

    return InventoryAdjustmentResponseDto.from(updated);
  }

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelAdjustmentDto,
    userId: string,
  ): Promise<InventoryAdjustmentResponseDto> {
    const adjustment = await this.findOrFail(id, workspaceId);
    const status = adjustment['status'] as InventoryAdjustmentStatus;
    this.validator.assertAdjustmentTransition(status, InventoryAdjustmentStatus.CANCELLED);

    const updated = await this.repository.update(id, { status: InventoryAdjustmentStatus.CANCELLED });

    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryAdjustmentStatus.CANCELLED,
      dto.reason ?? 'Adjustment cancelled',
      userId,
    );

    const item = await this.inventoryRepository.findById(adjustment['inventoryItemId'] as string, workspaceId);
    if (item) {
      await this.publishEvent(item, workspaceId, InventoryEvent.ADJUSTMENT_CANCELLED, { adjustmentId: id });
    }

    return InventoryAdjustmentResponseDto.from(updated);
  }

  // ── Post ─────────────────────────────────────────────────────

  /**
   * Posts the adjustment's quantity change through the existing stock/transaction
   * ledger (`InventoryStockService.adjust`/`changeStatus`, both atomic). A
   * deterministic per-adjustment idempotency key is used both to look up the
   * resulting transaction's quantityBefore/After for this header, and to make a
   * retried post() call a safe no-op at the stock layer (defense in depth on top
   * of the status-transition guard, which already blocks posting twice).
   */
  async post(
    id: string,
    workspaceId: string,
    dto: PostAdjustmentDto,
    userId: string,
  ): Promise<InventoryAdjustmentResponseDto> {
    const adjustment = await this.findOrFail(id, workspaceId);
    const status = adjustment['status'] as InventoryAdjustmentStatus;
    this.validator.assertAdjustmentTransition(status, InventoryAdjustmentStatus.POSTED);

    const item = await this.inventoryRepository.findById(adjustment['inventoryItemId'] as string, workspaceId);
    if (!item) {
      throw new ResourceNotFoundException('Inventory item', adjustment['inventoryItemId'] as string);
    }

    const type = adjustment['type'] as InventoryAdjustmentType;
    const warehouseId = adjustment['warehouseId'] as string;
    const locationId = (adjustment['locationId'] as string | null) ?? undefined;
    const batchId = (adjustment['batchId'] as string | null) ?? undefined;
    const serialId = (adjustment['serialId'] as string | null) ?? undefined;
    const uom = (adjustment['uom'] as string | null) ?? undefined;
    const reason = adjustment['reason'] as string;
    const postingKey = `adjustment:${id}`;

    if (STATUS_MOVE_TYPES.has(type)) {
      const fromStatus = (adjustment['fromStatus'] as InventoryStockStatus | null) ?? InventoryStockStatus.AVAILABLE;
      const toStatus =
        type === InventoryAdjustmentType.DAMAGE
          ? InventoryStockStatus.DAMAGED
          : type === InventoryAdjustmentType.STATUS_CORRECTION
            ? (adjustment['toStatus'] as InventoryStockStatus)
            : InventoryStockStatus.LOST; // LOSS or EXPIRY

      await this.stockService.changeStatus(
        item['id'] as string,
        workspaceId,
        {
          warehouseId,
          locationId,
          batchId,
          serialId,
          fromStatus,
          toStatus,
          quantity: adjustment['quantity'] as number,
          reason,
          idempotencyKey: postingKey,
        },
        userId,
      );
    } else {
      const targetStatus = (adjustment['toStatus'] as InventoryStockStatus | null) ?? InventoryStockStatus.AVAILABLE;
      const quantityDelta =
        type === InventoryAdjustmentType.COUNT_VARIANCE
          ? (adjustment['quantityDelta'] as number)
          : type === InventoryAdjustmentType.INCREASE
            ? (adjustment['quantity'] as number)
            : -(adjustment['quantity'] as number);

      await this.stockService.adjust(
        item['id'] as string,
        workspaceId,
        {
          warehouseId,
          locationId,
          batchId,
          status: targetStatus,
          quantityDelta,
          uom,
          reason,
          idempotencyKey: postingKey,
        },
        userId,
      );
    }

    const transaction = await this.stockRepository.findTransactionByIdempotencyKey(workspaceId, postingKey);
    const quantityBefore = (transaction?.['quantityBefore'] as number | null) ?? null;
    const quantityAfter = (transaction?.['quantityAfter'] as number | null) ?? null;
    const unitCost = (adjustment['unitCost'] as number | null) ?? null;

    const updated = await this.repository.update(id, {
      status: InventoryAdjustmentStatus.POSTED,
      transactionId: (transaction?.['id'] as string | null) ?? null,
      quantityBefore,
      quantityAfter,
      valueBefore: unitCost != null && quantityBefore != null ? quantityBefore * unitCost : null,
      valueAfter: unitCost != null && quantityAfter != null ? quantityAfter * unitCost : null,
      postedBy: userId,
      postedAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryAdjustmentStatus.POSTED,
      dto.notes ?? 'Adjustment posted',
      userId,
    );

    await this.publishEvent(item, workspaceId, InventoryEvent.ADJUSTMENT_POSTED, {
      adjustmentId: id,
      transactionId: transaction?.['id'] ?? null,
    });

    return InventoryAdjustmentResponseDto.from(updated);
  }

  // ── Reverse ──────────────────────────────────────────────────

  async reverse(
    id: string,
    workspaceId: string,
    dto: ReverseAdjustmentDto,
    userId: string,
  ): Promise<InventoryAdjustmentResponseDto> {
    const adjustment = await this.findOrFail(id, workspaceId);
    const status = adjustment['status'] as InventoryAdjustmentStatus;
    this.validator.assertAdjustmentTransition(status, InventoryAdjustmentStatus.REVERSED);

    const transactionId = adjustment['transactionId'] as string | null;
    if (!transactionId) {
      throw new BusinessRuleException(
        'Adjustment has no posted transaction to reverse',
        ErrorCode.INVENTORY_ADJUSTMENT_INVALID_STATUS_TRANSITION,
      );
    }

    await this.stockService.reverse(
      adjustment['inventoryItemId'] as string,
      workspaceId,
      transactionId,
      { reason: dto.reason },
      userId,
    );

    const updated = await this.repository.update(id, {
      status: InventoryAdjustmentStatus.REVERSED,
      reversedBy: userId,
      reversedAt: new Date(),
    });

    await this.recordHistory(id, workspaceId, status, InventoryAdjustmentStatus.REVERSED, dto.reason, userId);

    const item = await this.inventoryRepository.findById(adjustment['inventoryItemId'] as string, workspaceId);
    if (item) {
      await this.publishEvent(item, workspaceId, InventoryEvent.ADJUSTMENT_REVERSED, {
        adjustmentId: id,
        transactionId,
      });
    }

    return InventoryAdjustmentResponseDto.from(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: InventoryAdjustmentFilterDto,
  ): Promise<InventoryAdjustmentListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return InventoryAdjustmentListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<InventoryAdjustmentResponseDto> {
    const adjustment = await this.findOrFail(id, workspaceId);
    return InventoryAdjustmentResponseDto.from(adjustment);
  }

  async getHistory(id: string, workspaceId: string): Promise<InventoryAdjustmentHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(InventoryAdjustmentHistoryResponseDto.from);
  }
}
