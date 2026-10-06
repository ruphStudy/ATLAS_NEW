import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ProcurementRepository } from './procurement.repository';
import { ProcurementQueue } from './jobs';
import {
  ProcurementAttachment,
  ProcurementStatus,
} from './interfaces';
import {
  ApproveProcurementDto,
  CancelProcurementDto,
  CreateProcurementDto,
  ProcurementFilterDto,
  ProcurementHistoryResponseDto,
  ProcurementListResponseDto,
  ProcurementResponseDto,
  UpdateProcurementDto,
} from './dto';
import { PROCUREMENT_CONSTANTS } from './constants';

@Injectable()
export class ProcurementService {
  private readonly logger = new Logger(ProcurementService.name);

  constructor(
    private readonly repository: ProcurementRepository,
    private readonly queue: ProcurementQueue,
  ) {}

  // ── Create ───────────────────────────────────────────────────

  async create(workspaceId: string, dto: CreateProcurementDto, createdBy: string): Promise<ProcurementResponseDto> {
    // Prevent duplicate active procurement for same product
    if (dto.productId) {
      const duplicate = await this.repository.findActiveDuplicate(workspaceId, dto.productId);
      if (duplicate) {
        throw new ConflictException(
          `An active procurement already exists for this product (${duplicate['procurementNumber']})`,
        );
      }
    }

    const sequence = await this.repository.getNextSequence(workspaceId);
    const procurementNumber = `${PROCUREMENT_CONSTANTS.NUMBER_PREFIX}-${String(sequence).padStart(PROCUREMENT_CONSTANTS.NUMBER_PAD_LENGTH, '0')}`;
    const totalCost = dto.agreedUnitCost * dto.quantity;

    const record = await this.repository.create({
      workspaceId,
      procurementNumber,
      procurementSequence: sequence,
      productId: dto.productId ?? null,
      supplierId: dto.supplierId ?? null,
      rfqId: dto.rfqId ?? null,
      quotationComparisonId: dto.quotationComparisonId ?? null,
      status: ProcurementStatus.DRAFT,
      quantity: dto.quantity,
      agreedUnitCost: dto.agreedUnitCost,
      totalCost,
      currency: dto.currency ?? 'USD',
      paymentTerms: dto.paymentTerms ?? null,
      deliveryTerms: dto.deliveryTerms ?? null,
      expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
      procurementOwner: dto.procurementOwner ?? null,
      notes: dto.notes ?? null,
      attachments: dto.attachments ?? [],
      approvedBy: null,
      approvedAt: null,
      orderedAt: null,
      cancelReason: null,
    });

    await this.repository.createHistoryEntry({
      procurementId: record['id'] as string,
      workspaceId,
      fromStatus: ProcurementStatus.DRAFT,
      toStatus: ProcurementStatus.DRAFT,
      changedBy: createdBy,
      reason: 'Created',
    });

    await this.queue.enqueue({
      procurementId: record['id'] as string,
      procurementNumber,
      workspaceId,
      event: PROCUREMENT_CONSTANTS.EVENTS.CREATED,
      changedBy: createdBy,
    });

    this.logger.log(`Procurement created: ${procurementNumber}`);
    return this.mapToResponse(record);
  }

  // ── Update (DRAFT only) ───────────────────────────────────────

  async update(id: string, workspaceId: string, dto: UpdateProcurementDto): Promise<ProcurementResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);

    if (record['status'] !== ProcurementStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT procurements can be updated');
    }

    const data: Record<string, unknown> = {};
    if (dto.productId !== undefined) data['productId'] = dto.productId;
    if (dto.supplierId !== undefined) data['supplierId'] = dto.supplierId;
    if (dto.rfqId !== undefined) data['rfqId'] = dto.rfqId;
    if (dto.quotationComparisonId !== undefined) data['quotationComparisonId'] = dto.quotationComparisonId;
    if (dto.quantity !== undefined) data['quantity'] = dto.quantity;
    if (dto.agreedUnitCost !== undefined) data['agreedUnitCost'] = dto.agreedUnitCost;
    if (dto.currency !== undefined) data['currency'] = dto.currency;
    if (dto.paymentTerms !== undefined) data['paymentTerms'] = dto.paymentTerms;
    if (dto.deliveryTerms !== undefined) data['deliveryTerms'] = dto.deliveryTerms;
    if (dto.expectedDeliveryDate !== undefined) data['expectedDeliveryDate'] = new Date(dto.expectedDeliveryDate);
    if (dto.procurementOwner !== undefined) data['procurementOwner'] = dto.procurementOwner;
    if (dto.notes !== undefined) data['notes'] = dto.notes;
    if (dto.attachments !== undefined) data['attachments'] = dto.attachments;

    // Recalculate totalCost if either factor changed
    const qty = (data['quantity'] as number | undefined) ?? (record['quantity'] as number);
    const unitCost = (data['agreedUnitCost'] as number | undefined) ?? (record['agreedUnitCost'] as number);
    data['totalCost'] = qty * unitCost;

    const updated = await this.repository.update(id, data);
    return this.mapToResponse(updated);
  }

  // ── Workflow transitions ──────────────────────────────────────

  async submitForApproval(id: string, workspaceId: string, userId: string): Promise<ProcurementResponseDto> {
    return this.transition(id, workspaceId, userId, ProcurementStatus.PENDING_APPROVAL, null, PROCUREMENT_CONSTANTS.EVENTS.STATUS_CHANGED);
  }

  async approve(id: string, workspaceId: string, userId: string, dto: ApproveProcurementDto): Promise<ProcurementResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as ProcurementStatus, ProcurementStatus.APPROVED);

    const updated = await this.repository.update(id, {
      status: ProcurementStatus.APPROVED,
      approvedBy: userId,
      approvedAt: new Date(),
    });

    await this.repository.createHistoryEntry({
      procurementId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus: ProcurementStatus.APPROVED,
      changedBy: userId,
      reason: dto.notes ?? null,
    });

    await this.queue.enqueue({
      procurementId: id,
      procurementNumber: updated['procurementNumber'] as string,
      workspaceId,
      event: PROCUREMENT_CONSTANTS.EVENTS.APPROVED,
      changedBy: userId,
    });

    this.logger.log(`Procurement approved: ${updated['procurementNumber']}`);
    return this.mapToResponse(updated);
  }

  async markOrdered(id: string, workspaceId: string, userId: string): Promise<ProcurementResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as ProcurementStatus, ProcurementStatus.ORDERED);

    const updated = await this.repository.update(id, {
      status: ProcurementStatus.ORDERED,
      orderedAt: new Date(),
    });

    await this.repository.createHistoryEntry({
      procurementId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus: ProcurementStatus.ORDERED,
      changedBy: userId,
      reason: null,
    });

    await this.queue.enqueue({
      procurementId: id,
      procurementNumber: updated['procurementNumber'] as string,
      workspaceId,
      event: PROCUREMENT_CONSTANTS.EVENTS.ORDERED,
      changedBy: userId,
    });

    this.logger.log(`Procurement ordered: ${updated['procurementNumber']}`);
    return this.mapToResponse(updated);
  }

  async markInProgress(id: string, workspaceId: string, userId: string): Promise<ProcurementResponseDto> {
    return this.transition(id, workspaceId, userId, ProcurementStatus.IN_PROGRESS, null, PROCUREMENT_CONSTANTS.EVENTS.STATUS_CHANGED);
  }

  async markPartiallyReceived(id: string, workspaceId: string, userId: string): Promise<ProcurementResponseDto> {
    return this.transition(id, workspaceId, userId, ProcurementStatus.PARTIALLY_RECEIVED, null, PROCUREMENT_CONSTANTS.EVENTS.STATUS_CHANGED);
  }

  async complete(id: string, workspaceId: string, userId: string): Promise<ProcurementResponseDto> {
    return this.transition(id, workspaceId, userId, ProcurementStatus.COMPLETED, null, PROCUREMENT_CONSTANTS.EVENTS.COMPLETED);
  }

  async cancel(id: string, workspaceId: string, userId: string, dto: CancelProcurementDto): Promise<ProcurementResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as ProcurementStatus, ProcurementStatus.CANCELLED);

    const updated = await this.repository.update(id, {
      status: ProcurementStatus.CANCELLED,
      cancelReason: dto.reason,
    });

    await this.repository.createHistoryEntry({
      procurementId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus: ProcurementStatus.CANCELLED,
      changedBy: userId,
      reason: dto.reason,
    });

    await this.queue.enqueue({
      procurementId: id,
      procurementNumber: updated['procurementNumber'] as string,
      workspaceId,
      event: PROCUREMENT_CONSTANTS.EVENTS.CANCELLED,
      changedBy: userId,
    });

    this.logger.log(`Procurement cancelled: ${updated['procurementNumber']}`);
    return this.mapToResponse(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(workspaceId: string, filter: ProcurementFilterDto): Promise<ProcurementListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return {
      items: items.map((i) => this.mapToResponse(i)),
      total,
      page: filter.page ?? 1,
      limit: filter.limit ?? 20,
    };
  }

  async findById(id: string, workspaceId: string): Promise<ProcurementResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    return this.mapToResponse(record);
  }

  async getStats(workspaceId: string): Promise<Record<string, number>> {
    return this.repository.getStats(workspaceId);
  }

  async getHistory(id: string, workspaceId: string): Promise<ProcurementHistoryResponseDto[]> {
    await this.getOrThrow(id, workspaceId);
    const records = await this.repository.findHistory(id, workspaceId);
    return records.map((r) => ({
      id: r['id'] as string,
      procurementId: r['procurementId'] as string,
      fromStatus: r['fromStatus'] as ProcurementStatus,
      toStatus: r['toStatus'] as ProcurementStatus,
      changedBy: r['changedBy'] as string,
      reason: r['reason'] as string | null,
      createdAt: r['createdAt'] as Date,
    }));
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    const record = await this.getOrThrow(id, workspaceId);

    if (record['status'] !== ProcurementStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT procurements can be deleted');
    }

    await this.repository.softDelete(id);
    this.logger.log(`Procurement soft-deleted: ${record['procurementNumber']}`);
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async transition(
    id: string,
    workspaceId: string,
    userId: string,
    toStatus: ProcurementStatus,
    reason: string | null,
    event: string,
  ): Promise<ProcurementResponseDto> {
    const record = await this.getOrThrow(id, workspaceId);
    this.assertTransition(record['status'] as ProcurementStatus, toStatus);

    const updated = await this.repository.update(id, { status: toStatus });

    await this.repository.createHistoryEntry({
      procurementId: id,
      workspaceId,
      fromStatus: record['status'],
      toStatus,
      changedBy: userId,
      reason,
    });

    await this.queue.enqueue({
      procurementId: id,
      procurementNumber: updated['procurementNumber'] as string,
      workspaceId,
      event,
      changedBy: userId,
    });

    return this.mapToResponse(updated);
  }

  private assertTransition(from: ProcurementStatus, to: ProcurementStatus): void {
    const allowed = PROCUREMENT_CONSTANTS.ALLOWED_TRANSITIONS[from] as ProcurementStatus[];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition procurement from ${from} to ${to}`,
      );
    }
  }

  private async getOrThrow(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Procurement not found: ${id}`);
    return record;
  }

  private mapToResponse(r: Record<string, unknown>): ProcurementResponseDto {
    return {
      id: r['id'] as string,
      workspaceId: r['workspaceId'] as string,
      procurementNumber: r['procurementNumber'] as string,
      productId: r['productId'] as string | null,
      supplierId: r['supplierId'] as string | null,
      rfqId: r['rfqId'] as string | null,
      quotationComparisonId: r['quotationComparisonId'] as string | null,
      status: r['status'] as ProcurementStatus,
      quantity: r['quantity'] as number,
      agreedUnitCost: r['agreedUnitCost'] as number,
      totalCost: r['totalCost'] as number,
      currency: r['currency'] as string,
      paymentTerms: r['paymentTerms'] as string | null,
      deliveryTerms: r['deliveryTerms'] as string | null,
      expectedDeliveryDate: r['expectedDeliveryDate'] as Date | null,
      procurementOwner: r['procurementOwner'] as string | null,
      notes: r['notes'] as string | null,
      attachments: r['attachments'] as ProcurementAttachment[] | null,
      approvedBy: r['approvedBy'] as string | null,
      approvedAt: r['approvedAt'] as Date | null,
      orderedAt: r['orderedAt'] as Date | null,
      cancelReason: r['cancelReason'] as string | null,
      createdAt: r['createdAt'] as Date,
      updatedAt: r['updatedAt'] as Date,
      deletedAt: r['deletedAt'] as Date | null,
    };
  }
}
