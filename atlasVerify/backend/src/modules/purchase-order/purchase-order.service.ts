import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PurchaseOrderRepository } from './purchase-order.repository';
import { PurchaseOrderQueue } from './jobs';
import {
  POAddress,
  POAttachment,
  POLineItem,
  PurchaseOrderStatus,
} from './interfaces';
import {
  AcknowledgePurchaseOrderDto,
  ApprovePurchaseOrderDto,
  CancelPurchaseOrderDto,
  CreatePurchaseOrderDto,
  PurchaseOrderExportDto,
  PurchaseOrderFilterDto,
  PurchaseOrderHistoryResponseDto,
  PurchaseOrderListResponseDto,
  PurchaseOrderResponseDto,
  UpdatePurchaseOrderDto,
} from './dto';
import { PO_CONSTANTS } from './constants';

@Injectable()
export class PurchaseOrderService {
  private readonly logger = new Logger(PurchaseOrderService.name);

  constructor(
    private readonly repository: PurchaseOrderRepository,
    private readonly queue: PurchaseOrderQueue,
  ) {}

  // ── Create ───────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreatePurchaseOrderDto,
    createdBy: string,
  ): Promise<PurchaseOrderResponseDto> {
    if (dto.procurementId) {
      const duplicate = await this.repository.findActiveDuplicate(workspaceId, dto.procurementId);
      if (duplicate) {
        throw new ConflictException(
          `An active Purchase Order already exists for this procurement (${duplicate['poNumber']})`,
        );
      }
    }

    const sequence = await this.repository.getNextSequence(workspaceId);
    const poNumber = `${PO_CONSTANTS.NUMBER_PREFIX}-${String(sequence).padStart(PO_CONSTANTS.NUMBER_PAD_LENGTH, '0')}`;

    const lineItems = dto.lineItems.map((li) => ({
      ...li,
      totalPrice: li.unitPrice * li.quantity,
      currency: li.currency ?? dto.currency,
    }));

    const totalAmount = this.round(lineItems.reduce((sum, li) => sum + li.totalPrice, 0));

    const record = await this.repository.create({
      workspaceId,
      poNumber,
      poSequence: sequence,
      version: 1,
      procurementId: dto.procurementId ?? null,
      supplierId: dto.supplierId ?? null,
      status: PurchaseOrderStatus.DRAFT,
      lineItems,
      totalAmount,
      currency: dto.currency,
      paymentTerms: dto.paymentTerms ?? null,
      shippingTerms: dto.shippingTerms ?? null,
      incoterms: dto.incoterms ?? null,
      expectedDispatchDate: dto.expectedDispatchDate ? new Date(dto.expectedDispatchDate) : null,
      expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
      billingAddress: dto.billingAddress ?? null,
      shippingAddress: dto.shippingAddress ?? null,
      notes: dto.notes ?? null,
      attachments: dto.attachments ?? [],
      approvedBy: null,
      approvedAt: null,
      issuedAt: null,
      acknowledgedAt: null,
      cancelReason: null,
    });

    await this.repository.createHistoryEntry({
      purchaseOrderId: record['id'] as string,
      workspaceId,
      fromStatus: PurchaseOrderStatus.DRAFT,
      toStatus: PurchaseOrderStatus.DRAFT,
      version: 1,
      changedBy: createdBy,
      reason: 'Created',
    });

    await this.queue.enqueue({
      purchaseOrderId: record['id'] as string,
      poNumber,
      workspaceId,
      event: PO_CONSTANTS.EVENTS.CREATED,
      changedBy: createdBy,
    });

    this.logger.log(`Purchase Order created: ${poNumber}`);
    return this.mapToResponse(record);
  }

  // ── Update / Revise (DRAFT only) ──────────────────────────────

  async update(
    id: string,
    workspaceId: string,
    dto: UpdatePurchaseOrderDto,
    userId: string,
  ): Promise<PurchaseOrderResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);

    if (record['status'] !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT Purchase Orders can be updated');
    }

    const data: Record<string, unknown> = {};

    if (dto.lineItems !== undefined) {
      const lineItems = dto.lineItems.map((li) => ({
        ...li,
        totalPrice: li.unitPrice * li.quantity,
        currency: li.currency ?? (dto.currency ?? record['currency'] as string),
      }));
      data['lineItems'] = lineItems;
      data['totalAmount'] = this.round(lineItems.reduce((s, li) => s + li.totalPrice, 0));
    }

    if (dto.procurementId !== undefined) data['procurementId'] = dto.procurementId;
    if (dto.supplierId !== undefined) data['supplierId'] = dto.supplierId;
    if (dto.currency !== undefined) data['currency'] = dto.currency;
    if (dto.paymentTerms !== undefined) data['paymentTerms'] = dto.paymentTerms;
    if (dto.shippingTerms !== undefined) data['shippingTerms'] = dto.shippingTerms;
    if (dto.incoterms !== undefined) data['incoterms'] = dto.incoterms;
    if (dto.expectedDispatchDate !== undefined) data['expectedDispatchDate'] = new Date(dto.expectedDispatchDate);
    if (dto.expectedDeliveryDate !== undefined) data['expectedDeliveryDate'] = new Date(dto.expectedDeliveryDate);
    if (dto.billingAddress !== undefined) data['billingAddress'] = dto.billingAddress;
    if (dto.shippingAddress !== undefined) data['shippingAddress'] = dto.shippingAddress;
    if (dto.notes !== undefined) data['notes'] = dto.notes;
    if (dto.attachments !== undefined) data['attachments'] = dto.attachments;

    // Increment version on revision
    const newVersion = (record['version'] as number) + 1;
    data['version'] = newVersion;

    const updated = await this.repository.update(id, data);

    await this.repository.createHistoryEntry({
      purchaseOrderId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus: record['status'],
      version: newVersion,
      changedBy: userId,
      reason: 'Revised',
    });

    await this.queue.enqueue({
      purchaseOrderId: id,
      poNumber: updated['poNumber'] as string,
      workspaceId,
      event: PO_CONSTANTS.EVENTS.REVISED,
      changedBy: userId,
    });

    return this.mapToResponse(updated);
  }

  // ── Workflow ──────────────────────────────────────────────────

  async submitForApproval(id: string, workspaceId: string, userId: string): Promise<PurchaseOrderResponseDto> {
    return this.transition(id, workspaceId, userId, PurchaseOrderStatus.PENDING_APPROVAL, null, PO_CONSTANTS.EVENTS.STATUS_CHANGED);
  }

  async approve(
    id: string,
    workspaceId: string,
    userId: string,
    dto: ApprovePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as PurchaseOrderStatus, PurchaseOrderStatus.APPROVED);

    const updated = await this.repository.update(id, {
      status: PurchaseOrderStatus.APPROVED,
      approvedBy: userId,
      approvedAt: new Date(),
    });

    await this.repository.createHistoryEntry({
      purchaseOrderId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus: PurchaseOrderStatus.APPROVED,
      version: updated['version'],
      changedBy: userId,
      reason: dto.notes ?? null,
    });

    await this.queue.enqueue({
      purchaseOrderId: id,
      poNumber: updated['poNumber'] as string,
      workspaceId,
      event: PO_CONSTANTS.EVENTS.APPROVED,
      changedBy: userId,
    });

    this.logger.log(`Purchase Order approved: ${updated['poNumber']}`);
    return this.mapToResponse(updated);
  }

  async issue(id: string, workspaceId: string, userId: string): Promise<PurchaseOrderResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as PurchaseOrderStatus, PurchaseOrderStatus.ISSUED);

    const updated = await this.repository.update(id, {
      status: PurchaseOrderStatus.ISSUED,
      issuedAt: new Date(),
    });

    await this.repository.createHistoryEntry({
      purchaseOrderId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus: PurchaseOrderStatus.ISSUED,
      version: updated['version'],
      changedBy: userId,
      reason: null,
    });

    await this.queue.enqueue({
      purchaseOrderId: id,
      poNumber: updated['poNumber'] as string,
      workspaceId,
      event: PO_CONSTANTS.EVENTS.ISSUED,
      changedBy: userId,
    });

    this.logger.log(`Purchase Order issued: ${updated['poNumber']}`);
    return this.mapToResponse(updated);
  }

  async acknowledge(
    id: string,
    workspaceId: string,
    userId: string,
    dto: AcknowledgePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as PurchaseOrderStatus, PurchaseOrderStatus.ACKNOWLEDGED);

    const updated = await this.repository.update(id, {
      status: PurchaseOrderStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date(),
    });

    await this.repository.createHistoryEntry({
      purchaseOrderId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus: PurchaseOrderStatus.ACKNOWLEDGED,
      version: updated['version'],
      changedBy: userId,
      reason: dto.notes ?? null,
    });

    await this.queue.enqueue({
      purchaseOrderId: id,
      poNumber: updated['poNumber'] as string,
      workspaceId,
      event: PO_CONSTANTS.EVENTS.ACKNOWLEDGED,
      changedBy: userId,
    });

    return this.mapToResponse(updated);
  }

  async markPartiallyFulfilled(id: string, workspaceId: string, userId: string): Promise<PurchaseOrderResponseDto> {
    return this.transition(id, workspaceId, userId, PurchaseOrderStatus.PARTIALLY_FULFILLED, null, PO_CONSTANTS.EVENTS.STATUS_CHANGED);
  }

  async markFulfilled(id: string, workspaceId: string, userId: string): Promise<PurchaseOrderResponseDto> {
    return this.transition(id, workspaceId, userId, PurchaseOrderStatus.FULFILLED, null, PO_CONSTANTS.EVENTS.FULFILLED);
  }

  async close(id: string, workspaceId: string, userId: string): Promise<PurchaseOrderResponseDto> {
    return this.transition(id, workspaceId, userId, PurchaseOrderStatus.CLOSED, null, PO_CONSTANTS.EVENTS.CLOSED);
  }

  async cancel(
    id: string,
    workspaceId: string,
    userId: string,
    dto: CancelPurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as PurchaseOrderStatus, PurchaseOrderStatus.CANCELLED);

    const updated = await this.repository.update(id, {
      status: PurchaseOrderStatus.CANCELLED,
      cancelReason: dto.reason,
    });

    await this.repository.createHistoryEntry({
      purchaseOrderId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus: PurchaseOrderStatus.CANCELLED,
      version: updated['version'],
      changedBy: userId,
      reason: dto.reason,
    });

    await this.queue.enqueue({
      purchaseOrderId: id,
      poNumber: updated['poNumber'] as string,
      workspaceId,
      event: PO_CONSTANTS.EVENTS.CANCELLED,
      changedBy: userId,
    });

    this.logger.log(`Purchase Order cancelled: ${updated['poNumber']}`);
    return this.mapToResponse(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: PurchaseOrderFilterDto): Promise<PurchaseOrderListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return {
      items: items.map((i) => this.mapToResponse(i)),
      total,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    };
  }

  async findById(id: string, workspaceId: string): Promise<PurchaseOrderResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    return this.mapToResponse(record);
  }

  async getStats(workspaceId: string): Promise<Record<string, number>> {
    return this.repository.getStats(workspaceId);
  }

  async getHistory(id: string, workspaceId: string): Promise<PurchaseOrderHistoryResponseDto[]> {
    await this.getOrThrow(id, workspaceId);
    const records = await this.repository.findHistory(id, workspaceId);
    return records.map((r) => ({
      id: r['id'] as string,
      purchaseOrderId: r['purchaseOrderId'] as string,
      fromStatus: r['fromStatus'] as PurchaseOrderStatus,
      toStatus: r['toStatus'] as PurchaseOrderStatus,
      version: r['version'] as number,
      changedBy: r['changedBy'] as string,
      reason: r['reason'] as string | null,
      createdAt: r['createdAt'] as Date,
    }));
  }

  async export(id: string, workspaceId: string): Promise<PurchaseOrderExportDto> {
    const record = await this.getOrThrow(id, workspaceId);
    return {
      poNumber: record['poNumber'] as string,
      version: record['version'] as number,
      status: record['status'] as PurchaseOrderStatus,
      supplierId: record['supplierId'] as string | null,
      lineItems: record['lineItems'] as POLineItem[],
      totalAmount: record['totalAmount'] as number,
      currency: record['currency'] as string,
      paymentTerms: record['paymentTerms'] as string | null,
      shippingTerms: record['shippingTerms'] as string | null,
      incoterms: record['incoterms'] as string | null,
      expectedDispatchDate: record['expectedDispatchDate'] as Date | null,
      expectedDeliveryDate: record['expectedDeliveryDate'] as Date | null,
      billingAddress: record['billingAddress'] as POAddress | null,
      shippingAddress: record['shippingAddress'] as POAddress | null,
      notes: record['notes'] as string | null,
      issuedAt: record['issuedAt'] as Date | null,
      createdAt: record['createdAt'] as Date,
    };
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    const record = await this.getOrThrow(id, workspaceId);
    if (record['status'] !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT Purchase Orders can be deleted');
    }
    await this.repository.softDelete(id);
    this.logger.log(`Purchase Order soft-deleted: ${record['poNumber']}`);
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async transition(
    id: string,
    workspaceId: string,
    userId: string,
    toStatus: PurchaseOrderStatus,
    reason: string | null,
    event: string,
  ): Promise<PurchaseOrderResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as PurchaseOrderStatus, toStatus);

    const updated = await this.repository.update(id, { status: toStatus });

    await this.repository.createHistoryEntry({
      purchaseOrderId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus,
      version: updated['version'],
      changedBy: userId,
      reason,
    });

    await this.queue.enqueue({
      purchaseOrderId: id,
      poNumber: updated['poNumber'] as string,
      workspaceId,
      event,
      changedBy: userId,
    });

    return this.mapToResponse(updated);
  }

  private assertTransition(from: PurchaseOrderStatus, to: PurchaseOrderStatus): void {
    const allowed = PO_CONSTANTS.ALLOWED_TRANSITIONS[from] as PurchaseOrderStatus[];
    if (!allowed.includes(to)) {
      throw new BadRequestException(`Cannot transition Purchase Order from ${from} to ${to}`);
    }
  }

  private async getOrThrow(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Purchase Order not found: ${id}`);
    return record;
  }

  private round(n: number): number {
    return Math.round(n * 10000) / 10000;
  }

  private mapToResponse(r: Record<string, unknown>): PurchaseOrderResponseDto {
    return {
      id: r['id'] as string,
      workspaceId: r['workspaceId'] as string,
      poNumber: r['poNumber'] as string,
      version: r['version'] as number,
      procurementId: r['procurementId'] as string | null,
      supplierId: r['supplierId'] as string | null,
      status: r['status'] as PurchaseOrderStatus,
      lineItems: r['lineItems'] as POLineItem[],
      totalAmount: r['totalAmount'] as number,
      currency: r['currency'] as string,
      paymentTerms: r['paymentTerms'] as string | null,
      shippingTerms: r['shippingTerms'] as string | null,
      incoterms: r['incoterms'] as string | null,
      expectedDispatchDate: r['expectedDispatchDate'] as Date | null,
      expectedDeliveryDate: r['expectedDeliveryDate'] as Date | null,
      billingAddress: r['billingAddress'] as POAddress | null,
      shippingAddress: r['shippingAddress'] as POAddress | null,
      notes: r['notes'] as string | null,
      attachments: r['attachments'] as POAttachment[] | null,
      approvedBy: r['approvedBy'] as string | null,
      approvedAt: r['approvedAt'] as Date | null,
      issuedAt: r['issuedAt'] as Date | null,
      acknowledgedAt: r['acknowledgedAt'] as Date | null,
      cancelReason: r['cancelReason'] as string | null,
      providerCode: r['providerCode'] as string | null,
      providerPoRef: r['providerPoRef'] as string | null,
      createdAt: r['createdAt'] as Date,
      updatedAt: r['updatedAt'] as Date,
      deletedAt: r['deletedAt'] as Date | null,
    };
  }
}
