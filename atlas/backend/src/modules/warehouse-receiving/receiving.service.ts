import { Injectable } from '@nestjs/common';
import {
  BusinessRuleException,
  DuplicateResourceException,
  ResourceNotFoundException,
} from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { ReceivingRepository } from './receiving.repository';
import { ReceivingEventQueue } from './jobs';
import {
  CreateReceivingDto,
  UpdateReceivingDto,
  StartReceivingDto,
  ReceiveLinesDto,
  CompleteReceivingDto,
  CancelReceivingDto,
  ReopenReceivingDto,
  ScanPackageDto,
  ReceivingFilterDto,
  ReceivingResponseDto,
  ReceivingListResponseDto,
  ReceivingLineResponseDto,
} from './dto';
import { RECEIVING_CONSTANTS } from './constants';
import { ReceivingStatus, ReceivingEvent, ReceiptLineStatus, ReceiptType } from './interfaces';

@Injectable()
export class ReceivingService {
  constructor(
    private readonly repository: ReceivingRepository,
    private readonly eventQueue: ReceivingEventQueue,
  ) {}

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Warehouse receiving', id);
    return record;
  }

  private async recordHistory(
    receivingId: string,
    workspaceId: string,
    fromStatus: ReceivingStatus | null,
    toStatus: ReceivingStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      receivingId,
      workspaceId,
      fromStatus,
      toStatus,
      reason,
      changedBy,
    });
  }

  private async publishEvent(
    receiving: Record<string, unknown>,
    event: ReceivingEvent,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      workspaceId: receiving['workspaceId'] as string,
      receivingId: receiving['id'] as string,
      receivingNumber: receiving['receivingNumber'] as string,
      event,
      metadata,
    });
  }

  private assertStatusTransition(current: ReceivingStatus, next: ReceivingStatus): void {
    const allowed = RECEIVING_CONSTANTS.ALLOWED_STATUS_TRANSITIONS[current];
    if (!allowed?.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition receiving from ${current} to ${next}`,
        ErrorCode.RECEIVING_INVALID_STATUS_TRANSITION,
      );
    }
  }

  async create(
    workspaceId: string,
    dto: CreateReceivingDto,
    createdBy: string,
  ): Promise<ReceivingResponseDto> {
    const sequence = await this.repository.getNextSequence(workspaceId);
    const receivingNumber = `RCV-${sequence.toString().padStart(6, '0')}`;

    const existing = await this.repository.findByNumber(receivingNumber, workspaceId);
    if (existing) {
      throw new DuplicateResourceException('Receiving', 'receivingNumber', receivingNumber);
    }

    const lines = dto.lines?.map((line, index) => ({
      ...line,
      workspaceId,
      lineNumber: index + 1,
      status: ReceiptLineStatus.PENDING,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      damagedQuantity: 0,
      hasDiscrepancy: false,
      scannedBarcodes: [],
      metadata: line.metadata ?? {},
      stockStatus: 'RECEIVING',
    })) ?? [];

    const record = await this.repository.create({
      workspaceId,
      receivingNumber,
      receivingSequence: sequence,
      type: dto.type,
      status: ReceivingStatus.SCHEDULED,
      warehouseId: dto.warehouseId,
      purchaseOrderId: dto.purchaseOrderId ?? null,
      shipmentId: dto.shipmentId ?? null,
      transferId: dto.transferId ?? null,
      supplierId: dto.supplierId ?? null,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
      expectedQuantity: dto.expectedQuantity ?? null,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      damagedQuantity: 0,
      notes: dto.notes ?? null,
      attachments: dto.attachments ?? [],
      metadata: dto.metadata ?? {},
      lines: { create: lines },
    });

    await this.recordHistory(record['id'] as string, workspaceId, null, ReceivingStatus.SCHEDULED, 'Created', createdBy);
    await this.publishEvent(record, ReceivingEvent.CREATED, { createdBy });

    return ReceivingResponseDto.from(record, true);
  }

  async update(
    id: string,
    workspaceId: string,
    dto: UpdateReceivingDto,
  ): Promise<ReceivingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as ReceivingStatus;

    if (currentStatus !== ReceivingStatus.SCHEDULED) {
      throw new BusinessRuleException(
        'Can only update scheduled receiving records',
        ErrorCode.RECEIVING_UPDATE_NOT_ALLOWED,
      );
    }

    const updated = await this.repository.update(id, {
      ...(dto.scheduledDate !== undefined && { scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null }),
      ...(dto.expectedQuantity !== undefined && { expectedQuantity: dto.expectedQuantity }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.attachments !== undefined && { attachments: dto.attachments }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
    });

    return ReceivingResponseDto.from(updated, true);
  }

  async start(
    id: string,
    workspaceId: string,
    dto: StartReceivingDto,
  ): Promise<ReceivingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as ReceivingStatus;

    this.assertStatusTransition(currentStatus, ReceivingStatus.IN_PROGRESS);

    const updated = await this.repository.update(id, {
      status: ReceivingStatus.IN_PROGRESS,
      startedAt: new Date(),
      receivedBy: dto.receivedBy ?? null,
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      ReceivingStatus.IN_PROGRESS,
      'Started receiving',
      dto.receivedBy ?? null,
    );
    await this.publishEvent(updated, ReceivingEvent.STARTED, { receivedBy: dto.receivedBy });

    return ReceivingResponseDto.from(updated, true);
  }

  async receiveLines(
    id: string,
    workspaceId: string,
    dto: ReceiveLinesDto,
  ): Promise<ReceivingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as ReceivingStatus;

    if (![ReceivingStatus.IN_PROGRESS, ReceivingStatus.PARTIALLY_RECEIVED, ReceivingStatus.REOPENED].includes(currentStatus)) {
      throw new BusinessRuleException(
        'Can only receive lines when receiving is in progress',
        ErrorCode.RECEIVING_RECEIVE_NOT_ALLOWED,
      );
    }

    const lineUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];
    let totalReceived = existing['receivedQuantity'] as number;
    let totalAccepted = existing['acceptedQuantity'] as number;
    let totalRejected = existing['rejectedQuantity'] as number;
    let totalDamaged = existing['damagedQuantity'] as number;

    for (const lineDto of dto.lines) {
      const line = await this.repository.findLine(lineDto.lineId, workspaceId);
      if (!line) {
        throw new ResourceNotFoundException('Receiving line', lineDto.lineId);
      }

      const receivedQty = lineDto.receivedQuantity;
      const acceptedQty = lineDto.acceptedQuantity ?? receivedQty;
      const rejectedQty = lineDto.rejectedQuantity ?? 0;
      const damagedQty = lineDto.damagedQuantity ?? 0;
      const expectedQty = line['expectedQuantity'] as number;

      let lineStatus = ReceiptLineStatus.RECEIVED;
      let hasDiscrepancy = lineDto.hasDiscrepancy ?? false;

      if (receivedQty < expectedQty) {
        lineStatus = ReceiptLineStatus.SHORT;
        hasDiscrepancy = true;
      } else if (receivedQty > expectedQty) {
        lineStatus = ReceiptLineStatus.EXCESS;
        hasDiscrepancy = true;
      }

      if (damagedQty > 0) {
        lineStatus = ReceiptLineStatus.DAMAGED;
        hasDiscrepancy = true;
      }

      if (rejectedQty > 0) {
        lineStatus = ReceiptLineStatus.REJECTED;
        hasDiscrepancy = true;
      }

      const scannedBarcodes = [...(line['scannedBarcodes'] as string[]), ...(lineDto.scannedBarcodes ?? [])];

      lineUpdates.push({
        id: lineDto.lineId,
        data: {
          status: lineStatus,
          receivedQuantity: receivedQty,
          acceptedQuantity: acceptedQty,
          rejectedQuantity: rejectedQty,
          damagedQuantity: damagedQty,
          batchNumber: lineDto.batchNumber ?? line['batchNumber'],
          lotNumber: lineDto.lotNumber ?? line['lotNumber'],
          serialNumber: lineDto.serialNumber ?? line['serialNumber'],
          expiryDate: lineDto.expiryDate ? new Date(lineDto.expiryDate) : line['expiryDate'],
          manufactureDate: lineDto.manufactureDate ? new Date(lineDto.manufactureDate) : line['manufactureDate'],
          locationId: lineDto.locationId ?? line['locationId'],
          binId: lineDto.binId ?? line['binId'],
          stockStatus: lineDto.stockStatus ?? line['stockStatus'],
          hasDiscrepancy,
          discrepancyType: lineDto.discrepancyType ?? line['discrepancyType'],
          discrepancyReason: lineDto.discrepancyReason ?? line['discrepancyReason'],
          discrepancyNotes: lineDto.discrepancyNotes ?? line['discrepancyNotes'],
          evidenceUrls: lineDto.evidenceUrls ?? line['evidenceUrls'],
          scannedBarcodes,
          metadata: { ...line['metadata'], ...lineDto.metadata },
        },
      });

      totalReceived += receivedQty;
      totalAccepted += acceptedQty;
      totalRejected += rejectedQty;
      totalDamaged += damagedQty;

      await this.publishEvent(existing, ReceivingEvent.LINE_RECEIVED, {
        lineId: lineDto.lineId,
        receivedQuantity: receivedQty,
        hasDiscrepancy,
      });

      if (hasDiscrepancy) {
        await this.publishEvent(existing, ReceivingEvent.DISCREPANCY_REPORTED, {
          lineId: lineDto.lineId,
          discrepancyType: lineDto.discrepancyType,
        });
      }
    }

    await this.repository.updateLines(id, lineUpdates);

    const updated = await this.repository.update(id, {
      receivedQuantity: totalReceived,
      acceptedQuantity: totalAccepted,
      rejectedQuantity: totalRejected,
      damagedQuantity: totalDamaged,
      receivedBy: dto.receivedBy ?? existing['receivedBy'],
    });

    return ReceivingResponseDto.from(updated, true);
  }

  async complete(
    id: string,
    workspaceId: string,
    dto: CompleteReceivingDto,
  ): Promise<ReceivingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as ReceivingStatus;

    this.assertStatusTransition(currentStatus, ReceivingStatus.COMPLETED);

    const updated = await this.repository.update(id, {
      status: ReceivingStatus.COMPLETED,
      completedAt: new Date(),
      notes: dto.notes ?? existing['notes'],
      receivedBy: dto.receivedBy ?? existing['receivedBy'],
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      ReceivingStatus.COMPLETED,
      'Completed receiving',
      dto.receivedBy ?? null,
    );
    await this.publishEvent(updated, ReceivingEvent.COMPLETED, { receivedBy: dto.receivedBy });

    return ReceivingResponseDto.from(updated, true);
  }

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelReceivingDto,
  ): Promise<ReceivingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as ReceivingStatus;

    this.assertStatusTransition(currentStatus, ReceivingStatus.CANCELLED);

    const updated = await this.repository.update(id, {
      status: ReceivingStatus.CANCELLED,
      cancelReason: dto.reason,
      cancelledBy: dto.cancelledBy ?? null,
      cancelledAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      ReceivingStatus.CANCELLED,
      dto.reason,
      dto.cancelledBy ?? null,
    );
    await this.publishEvent(updated, ReceivingEvent.CANCELLED, {
      cancelledBy: dto.cancelledBy,
      reason: dto.reason,
    });

    return ReceivingResponseDto.from(updated, true);
  }

  async reopen(
    id: string,
    workspaceId: string,
    dto: ReopenReceivingDto,
  ): Promise<ReceivingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as ReceivingStatus;

    this.assertStatusTransition(currentStatus, ReceivingStatus.REOPENED);

    const updated = await this.repository.update(id, {
      status: ReceivingStatus.REOPENED,
      cancelReason: null,
      cancelledBy: null,
      cancelledAt: null,
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      ReceivingStatus.REOPENED,
      dto.reason ?? 'Reopened',
      dto.reopenedBy ?? null,
    );
    await this.publishEvent(updated, ReceivingEvent.REOPENED, { reopenedBy: dto.reopenedBy });

    return ReceivingResponseDto.from(updated, true);
  }

  async scanPackage(
    id: string,
    workspaceId: string,
    dto: ScanPackageDto,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.findOrFail(id, workspaceId);

    return {
      success: true,
      message: `Package ${dto.barcode} scanned successfully`,
    };
  }

  async findAll(
    workspaceId: string,
    filter: ReceivingFilterDto,
  ): Promise<ReceivingListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return ReceivingListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<ReceivingResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return ReceivingResponseDto.from(record, true);
  }
}
