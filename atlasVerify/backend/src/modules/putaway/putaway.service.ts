import { Injectable } from '@nestjs/common';
import {
  BusinessRuleException,
  DuplicateResourceException,
  ResourceNotFoundException,
} from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { PutawayRepository } from './putaway.repository';
import { PutawayEventQueue } from './jobs';
import {
  CreatePutawayDto,
  GeneratePutawayFromReceivingDto,
  AssignPutawayDto,
  StartPutawayDto,
  ExecutePutawayDto,
  CompletePutawayDto,
  CancelPutawayDto,
  ReassignPutawayDto,
  ScanLocationDto,
  PutawayFilterDto,
  PutawayResponseDto,
  PutawayListResponseDto,
} from './dto';
import { PUTAWAY_CONSTANTS } from './constants';
import { PutawayStatus, PutawayEvent, PutawayStrategy } from './interfaces';

@Injectable()
export class PutawayService {
  constructor(
    private readonly repository: PutawayRepository,
    private readonly eventQueue: PutawayEventQueue,
  ) {}

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Putaway task', id);
    return record;
  }

  private async recordHistory(
    taskId: string,
    workspaceId: string,
    fromStatus: PutawayStatus | null,
    toStatus: PutawayStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({
      taskId,
      workspaceId,
      fromStatus,
      toStatus,
      reason,
      changedBy,
    });
  }

  private async publishEvent(
    task: Record<string, unknown>,
    event: PutawayEvent,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      workspaceId: task['workspaceId'] as string,
      taskId: task['id'] as string,
      taskNumber: task['taskNumber'] as string,
      event,
      metadata,
    });
  }

  private assertStatusTransition(current: PutawayStatus, next: PutawayStatus): void {
    const allowed = PUTAWAY_CONSTANTS.ALLOWED_STATUS_TRANSITIONS[current];
    if (!allowed?.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition putaway from ${current} to ${next}`,
        ErrorCode.PUTAWAY_INVALID_STATUS_TRANSITION,
      );
    }
  }

  async create(
    workspaceId: string,
    dto: CreatePutawayDto,
    createdBy: string,
  ): Promise<PutawayResponseDto> {
    const sequence = await this.repository.getNextSequence(workspaceId);
    const taskNumber = `PUT-${sequence.toString().padStart(6, '0')}`;

    const existing = await this.repository.findByNumber(taskNumber, workspaceId);
    if (existing) {
      throw new DuplicateResourceException('Putaway task', 'taskNumber', taskNumber);
    }

    const lines = dto.lines?.map((line, index) => ({
      ...line,
      workspaceId,
      lineNumber: index + 1,
      status: PutawayStatus.PENDING,
      putawayQuantity: 0,
      scannedBarcodes: [],
      metadata: line.metadata ?? {},
      uom: line.uom ?? 'EA',
    })) ?? [];

    const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

    const record = await this.repository.create({
      workspaceId,
      taskNumber,
      taskSequence: sequence,
      status: PutawayStatus.PENDING,
      strategy: dto.strategy,
      warehouseId: dto.warehouseId,
      receivingId: dto.receivingId ?? null,
      sourceType: dto.sourceType ?? 'RECEIVING',
      sourceId: dto.sourceId ?? null,
      totalQuantity,
      putawayQuantity: 0,
      priority: dto.priority ?? 0,
      notes: dto.notes ?? null,
      metadata: dto.metadata ?? {},
      lines: { create: lines },
    });

    await this.recordHistory(record['id'] as string, workspaceId, null, PutawayStatus.PENDING, 'Created', createdBy);
    await this.publishEvent(record, PutawayEvent.CREATED, { createdBy });

    return PutawayResponseDto.from(record, true);
  }

  async generateFromReceiving(
    workspaceId: string,
    dto: GeneratePutawayFromReceivingDto,
    createdBy: string,
  ): Promise<PutawayResponseDto> {
    return this.create(
      workspaceId,
      {
        strategy: dto.strategy,
        warehouseId: '',
        receivingId: dto.receivingId,
        priority: dto.priority,
      },
      createdBy,
    );
  }

  async assign(
    id: string,
    workspaceId: string,
    dto: AssignPutawayDto,
  ): Promise<PutawayResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PutawayStatus;

    this.assertStatusTransition(currentStatus, PutawayStatus.ASSIGNED);

    const updated = await this.repository.update(id, {
      status: PutawayStatus.ASSIGNED,
      assignedTo: dto.assignedTo,
      assignedAt: new Date(),
      notes: dto.notes ?? existing['notes'],
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PutawayStatus.ASSIGNED,
      'Assigned',
      dto.assignedTo,
    );
    await this.publishEvent(updated, PutawayEvent.ASSIGNED, { assignedTo: dto.assignedTo });

    return PutawayResponseDto.from(updated, true);
  }

  async start(
    id: string,
    workspaceId: string,
    dto: StartPutawayDto,
  ): Promise<PutawayResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PutawayStatus;

    this.assertStatusTransition(currentStatus, PutawayStatus.IN_PROGRESS);

    const updated = await this.repository.update(id, {
      status: PutawayStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PutawayStatus.IN_PROGRESS,
      'Started',
      dto.startedBy ?? null,
    );
    await this.publishEvent(updated, PutawayEvent.STARTED, { startedBy: dto.startedBy });

    return PutawayResponseDto.from(updated, true);
  }

  async execute(
    id: string,
    workspaceId: string,
    dto: ExecutePutawayDto,
  ): Promise<PutawayResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PutawayStatus;

    if (currentStatus !== PutawayStatus.IN_PROGRESS) {
      throw new BusinessRuleException(
        'Can only execute putaway when task is in progress',
        ErrorCode.PUTAWAY_EXECUTE_NOT_ALLOWED,
      );
    }

    const lineUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];
    let totalPutaway = existing['putawayQuantity'] as number;

    for (const lineDto of dto.lines) {
      const line = await this.repository.findLine(lineDto.lineId, workspaceId);
      if (!line) {
        throw new ResourceNotFoundException('Putaway line', lineDto.lineId);
      }

      const quantity = lineDto.quantity;
      const newPutawayQty = (line['putawayQuantity'] as number) + quantity;
      const totalQty = line['quantity'] as number;

      if (newPutawayQty > totalQty) {
        throw new BusinessRuleException(
          'Cannot putaway more than requested quantity',
          ErrorCode.PUTAWAY_OVER_EXECUTION,
        );
      }

      const scannedBarcodes = [...(line['scannedBarcodes'] as string[]), ...(lineDto.scannedBarcodes ?? [])];

      lineUpdates.push({
        id: lineDto.lineId,
        data: {
          status: newPutawayQty >= totalQty ? PutawayStatus.COMPLETED : PutawayStatus.IN_PROGRESS,
          putawayQuantity: newPutawayQty,
          destinationZoneId: lineDto.destinationZoneId ?? line['destinationZoneId'],
          destinationLocationId: lineDto.destinationLocationId ?? line['destinationLocationId'],
          destinationBinId: lineDto.destinationBinId ?? line['destinationBinId'],
          overrideReason: lineDto.overrideReason ?? line['overrideReason'],
          scannedBarcodes,
          metadata: { ...line['metadata'], ...lineDto.metadata },
        },
      });

      totalPutaway += quantity;

      await this.publishEvent(existing, PutawayEvent.LINE_COMPLETED, {
        lineId: lineDto.lineId,
        quantity,
      });
    }

    await this.repository.updateLines(id, lineUpdates);

    const updated = await this.repository.update(id, {
      putawayQuantity: totalPutaway,
    });

    return PutawayResponseDto.from(updated, true);
  }

  async complete(
    id: string,
    workspaceId: string,
    dto: CompletePutawayDto,
  ): Promise<PutawayResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PutawayStatus;

    this.assertStatusTransition(currentStatus, PutawayStatus.COMPLETED);

    const updated = await this.repository.update(id, {
      status: PutawayStatus.COMPLETED,
      completedAt: new Date(),
      notes: dto.notes ?? existing['notes'],
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PutawayStatus.COMPLETED,
      'Completed',
      dto.completedBy ?? null,
    );
    await this.publishEvent(updated, PutawayEvent.COMPLETED, { completedBy: dto.completedBy });

    return PutawayResponseDto.from(updated, true);
  }

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelPutawayDto,
  ): Promise<PutawayResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PutawayStatus;

    this.assertStatusTransition(currentStatus, PutawayStatus.CANCELLED);

    const updated = await this.repository.update(id, {
      status: PutawayStatus.CANCELLED,
      cancelReason: dto.reason,
      cancelledBy: dto.cancelledBy ?? null,
      cancelledAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PutawayStatus.CANCELLED,
      dto.reason,
      dto.cancelledBy ?? null,
    );
    await this.publishEvent(updated, PutawayEvent.CANCELLED, {
      cancelledBy: dto.cancelledBy,
      reason: dto.reason,
    });

    return PutawayResponseDto.from(updated, true);
  }

  async reassign(
    id: string,
    workspaceId: string,
    dto: ReassignPutawayDto,
  ): Promise<PutawayResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);

    const updated = await this.repository.update(id, {
      assignedTo: dto.newAssignee,
      assignedAt: new Date(),
    });

    await this.publishEvent(updated, PutawayEvent.REASSIGNED, {
      previousAssignee: existing['assignedTo'],
      newAssignee: dto.newAssignee,
      reason: dto.reason,
      reassignedBy: dto.reassignedBy,
    });

    return PutawayResponseDto.from(updated, true);
  }

  async scanLocation(
    id: string,
    workspaceId: string,
    dto: ScanLocationDto,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.findOrFail(id, workspaceId);

    return {
      success: true,
      message: `Location ${dto.barcode} scanned successfully`,
    };
  }

  async findAll(
    workspaceId: string,
    filter: PutawayFilterDto,
  ): Promise<PutawayListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return PutawayListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<PutawayResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return PutawayResponseDto.from(record, true);
  }
}
