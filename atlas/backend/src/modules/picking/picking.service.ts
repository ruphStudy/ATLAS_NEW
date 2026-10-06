import { Injectable } from '@nestjs/common';
import {
  BusinessRuleException,
  DuplicateResourceException,
  ResourceNotFoundException,
} from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { PickingRepository } from './picking.repository';
import { PickingEventQueue } from './jobs';
import {
  CreatePickingDto,
  GeneratePickingFromOrderDto,
  GeneratePickingFromTransferDto,
  AssignPickingDto,
  ReleasePickingDto,
  StartPickingDto,
  PausePickingDto,
  ResumePickingDto,
  ExecutePickingDto,
  CompletePickingDto,
  CancelPickingDto,
  ReassignPickingDto,
  RecordExceptionDto,
  ScanBarcodeDto,
  PickingFilterDto,
  PickingResponseDto,
  PickingListResponseDto,
  PickingExceptionResponseDto,
} from './dto';
import { PICKING_CONSTANTS } from './constants';
import { PickingStatus, PickingEvent } from './interfaces';

@Injectable()
export class PickingService {
  constructor(
    private readonly repository: PickingRepository,
    private readonly eventQueue: PickingEventQueue,
  ) {}

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Picking task', id);
    return record;
  }

  private async recordHistory(
    taskId: string,
    workspaceId: string,
    fromStatus: PickingStatus | null,
    toStatus: PickingStatus,
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
    event: PickingEvent,
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

  private assertStatusTransition(current: PickingStatus, next: PickingStatus): void {
    const allowed = PICKING_CONSTANTS.ALLOWED_STATUS_TRANSITIONS[current];
    if (!allowed?.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition picking from ${current} to ${next}`,
        ErrorCode.PICKING_INVALID_STATUS_TRANSITION,
      );
    }
  }

  async create(
    workspaceId: string,
    dto: CreatePickingDto,
    createdBy: string,
  ): Promise<PickingResponseDto> {
    const sequence = await this.repository.getNextSequence(workspaceId);
    const taskNumber = `PICK-${sequence.toString().padStart(6, '0')}`;

    const existing = await this.repository.findByNumber(taskNumber, workspaceId);
    if (existing) {
      throw new DuplicateResourceException('Picking task', 'taskNumber', taskNumber);
    }

    const lines = dto.lines?.map((line, index) => ({
      ...line,
      workspaceId,
      lineNumber: index + 1,
      status: PickingStatus.PENDING,
      pickedQuantity: 0,
      shortQuantity: 0,
      scannedBarcodes: [],
      metadata: line.metadata ?? {},
      uom: line.uom ?? 'EA',
    })) ?? [];

    const totalQuantity = lines.reduce((sum, line) => sum + line.requestedQuantity, 0);

    const record = await this.repository.create({
      workspaceId,
      taskNumber,
      taskSequence: sequence,
      status: PickingStatus.PENDING,
      pickingType: dto.pickingType,
      strategy: dto.strategy,
      warehouseId: dto.warehouseId,
      orderId: dto.orderId ?? null,
      transferId: dto.transferId ?? null,
      sourceType: dto.sourceType ?? 'ORDER',
      sourceId: dto.sourceId ?? null,
      stagingLocationId: dto.stagingLocationId ?? null,
      totalQuantity,
      pickedQuantity: 0,
      priority: dto.priority ?? 0,
      waveId: dto.waveId ?? null,
      batchId: dto.batchId ?? null,
      notes: dto.notes ?? null,
      metadata: dto.metadata ?? {},
      lines: { create: lines },
    });

    await this.recordHistory(record['id'] as string, workspaceId, null, PickingStatus.PENDING, 'Created', createdBy);
    await this.publishEvent(record, PickingEvent.CREATED, { createdBy });

    return PickingResponseDto.from(record, true, false);
  }

  async generateFromOrder(
    workspaceId: string,
    dto: GeneratePickingFromOrderDto,
    createdBy: string,
  ): Promise<PickingResponseDto> {
    return this.create(
      workspaceId,
      {
        pickingType: dto.pickingType,
        strategy: dto.strategy,
        warehouseId: dto.warehouseId ?? '',
        orderId: dto.orderId,
        sourceType: 'ORDER',
        sourceId: dto.orderId,
        stagingLocationId: dto.stagingLocationId,
        priority: dto.priority,
        waveId: dto.waveId,
        batchId: dto.batchId,
      },
      createdBy,
    );
  }

  async generateFromTransfer(
    workspaceId: string,
    dto: GeneratePickingFromTransferDto,
    createdBy: string,
  ): Promise<PickingResponseDto> {
    return this.create(
      workspaceId,
      {
        pickingType: dto.pickingType,
        strategy: dto.strategy,
        warehouseId: '',
        transferId: dto.transferId,
        sourceType: 'TRANSFER',
        sourceId: dto.transferId,
        stagingLocationId: dto.stagingLocationId,
        priority: dto.priority,
      },
      createdBy,
    );
  }

  async assign(
    id: string,
    workspaceId: string,
    dto: AssignPickingDto,
  ): Promise<PickingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PickingStatus;

    this.assertStatusTransition(currentStatus, PickingStatus.ASSIGNED);

    const updated = await this.repository.update(id, {
      status: PickingStatus.ASSIGNED,
      assignedTo: dto.assignedTo,
      assignedAt: new Date(),
      notes: dto.notes ?? existing['notes'],
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PickingStatus.ASSIGNED,
      'Assigned',
      dto.assignedTo,
    );
    await this.publishEvent(updated, PickingEvent.ASSIGNED, { assignedTo: dto.assignedTo });

    return PickingResponseDto.from(updated, true, false);
  }

  async release(
    id: string,
    workspaceId: string,
    dto: ReleasePickingDto,
  ): Promise<PickingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PickingStatus;

    this.assertStatusTransition(currentStatus, PickingStatus.RELEASED);

    const updated = await this.repository.update(id, {
      status: PickingStatus.RELEASED,
      releasedAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PickingStatus.RELEASED,
      dto.reason ?? 'Released',
      dto.releasedBy ?? null,
    );
    await this.publishEvent(updated, PickingEvent.RELEASED, { releasedBy: dto.releasedBy, reason: dto.reason });

    return PickingResponseDto.from(updated, true, false);
  }

  async start(
    id: string,
    workspaceId: string,
    dto: StartPickingDto,
  ): Promise<PickingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PickingStatus;

    this.assertStatusTransition(currentStatus, PickingStatus.IN_PROGRESS);

    const updated = await this.repository.update(id, {
      status: PickingStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PickingStatus.IN_PROGRESS,
      'Started',
      dto.startedBy ?? null,
    );
    await this.publishEvent(updated, PickingEvent.STARTED, { startedBy: dto.startedBy });

    return PickingResponseDto.from(updated, true, false);
  }

  async pause(
    id: string,
    workspaceId: string,
    dto: PausePickingDto,
  ): Promise<PickingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PickingStatus;

    this.assertStatusTransition(currentStatus, PickingStatus.PAUSED);

    const updated = await this.repository.update(id, {
      status: PickingStatus.PAUSED,
      pausedAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PickingStatus.PAUSED,
      dto.reason,
      dto.pausedBy ?? null,
    );
    await this.publishEvent(updated, PickingEvent.PAUSED, { pausedBy: dto.pausedBy, reason: dto.reason });

    return PickingResponseDto.from(updated, true, false);
  }

  async resume(
    id: string,
    workspaceId: string,
    dto: ResumePickingDto,
  ): Promise<PickingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PickingStatus;

    this.assertStatusTransition(currentStatus, PickingStatus.IN_PROGRESS);

    const updated = await this.repository.update(id, {
      status: PickingStatus.IN_PROGRESS,
      pausedAt: null,
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PickingStatus.IN_PROGRESS,
      'Resumed',
      dto.resumedBy ?? null,
    );
    await this.publishEvent(updated, PickingEvent.RESUMED, { resumedBy: dto.resumedBy });

    return PickingResponseDto.from(updated, true, false);
  }

  async execute(
    id: string,
    workspaceId: string,
    dto: ExecutePickingDto,
  ): Promise<PickingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PickingStatus;

    if (currentStatus !== PickingStatus.IN_PROGRESS) {
      throw new BusinessRuleException(
        'Can only execute picking when task is in progress',
        ErrorCode.PICKING_EXECUTE_NOT_ALLOWED,
      );
    }

    const lineUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];
    let totalPicked = existing['pickedQuantity'] as number;

    for (const lineDto of dto.lines) {
      const line = await this.repository.findLine(lineDto.lineId, workspaceId);
      if (!line) {
        throw new ResourceNotFoundException('Picking line', lineDto.lineId);
      }

      const pickedQty = lineDto.quantity;
      const shortQty = lineDto.shortQuantity ?? 0;
      const newPickedQty = (line['pickedQuantity'] as number) + pickedQty;
      const newShortQty = (line['shortQuantity'] as number) + shortQty;
      const requestedQty = line['requestedQuantity'] as number;

      if (newPickedQty + newShortQty > requestedQty) {
        throw new BusinessRuleException(
          'Cannot pick more than requested quantity',
          ErrorCode.PICKING_OVER_EXECUTION,
        );
      }

      const scannedBarcodes = [...(line['scannedBarcodes'] as string[]), ...(lineDto.scannedBarcodes ?? [])];

      lineUpdates.push({
        id: lineDto.lineId,
        data: {
          status: newPickedQty >= requestedQty ? PickingStatus.COMPLETED : PickingStatus.IN_PROGRESS,
          pickedQuantity: newPickedQty,
          shortQuantity: newShortQty,
          stagingLocationId: lineDto.stagingLocationId ?? line['stagingLocationId'],
          scannedBarcodes,
          metadata: { ...(line['metadata'] as Record<string, unknown> | undefined), ...lineDto.metadata },
        },
      });

      totalPicked += pickedQty;

      await this.publishEvent(existing, PickingEvent.LINE_PICKED, {
        lineId: lineDto.lineId,
        quantity: pickedQty,
        shortQuantity: shortQty,
      });
    }

    await this.repository.updateLines(id, lineUpdates);

    const updated = await this.repository.update(id, {
      pickedQuantity: totalPicked,
    });

    return PickingResponseDto.from(updated, true, false);
  }

  async complete(
    id: string,
    workspaceId: string,
    dto: CompletePickingDto,
  ): Promise<PickingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PickingStatus;

    this.assertStatusTransition(currentStatus, PickingStatus.COMPLETED);

    const updated = await this.repository.update(id, {
      status: PickingStatus.COMPLETED,
      completedAt: new Date(),
      notes: dto.notes ?? existing['notes'],
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PickingStatus.COMPLETED,
      'Completed',
      dto.completedBy ?? null,
    );
    await this.publishEvent(updated, PickingEvent.COMPLETED, { completedBy: dto.completedBy });

    return PickingResponseDto.from(updated, true, false);
  }

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelPickingDto,
  ): Promise<PickingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PickingStatus;

    this.assertStatusTransition(currentStatus, PickingStatus.CANCELLED);

    const updated = await this.repository.update(id, {
      status: PickingStatus.CANCELLED,
      cancelReason: dto.reason,
      cancelledBy: dto.cancelledBy ?? null,
      cancelledAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PickingStatus.CANCELLED,
      dto.reason,
      dto.cancelledBy ?? null,
    );
    await this.publishEvent(updated, PickingEvent.CANCELLED, {
      cancelledBy: dto.cancelledBy,
      reason: dto.reason,
    });

    return PickingResponseDto.from(updated, true, false);
  }

  async reassign(
    id: string,
    workspaceId: string,
    dto: ReassignPickingDto,
  ): Promise<PickingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);

    const updated = await this.repository.update(id, {
      assignedTo: dto.newAssignee,
      assignedAt: new Date(),
    });

    await this.publishEvent(updated, PickingEvent.REASSIGNED, {
      previousAssignee: existing['assignedTo'],
      newAssignee: dto.newAssignee,
      reason: dto.reason,
      reassignedBy: dto.reassignedBy,
    });

    return PickingResponseDto.from(updated, true, false);
  }

  async recordException(
    id: string,
    workspaceId: string,
    dto: RecordExceptionDto,
  ): Promise<PickingExceptionResponseDto> {
    await this.findOrFail(id, workspaceId);

    const exception = await this.repository.createException({
      taskId: id,
      lineId: dto.lineId ?? null,
      workspaceId,
      exceptionType: dto.exceptionType,
      description: dto.description,
      quantity: dto.quantity ?? null,
      evidenceUrls: dto.evidenceUrls ?? [],
      metadata: dto.metadata ?? {},
    });

    await this.publishEvent(
      { id, workspaceId, taskNumber: '' } as Record<string, unknown>,
      PickingEvent.EXCEPTION_RECORDED,
      {
        exceptionId: exception['id'],
        exceptionType: dto.exceptionType,
        lineId: dto.lineId,
      },
    );

    return PickingExceptionResponseDto.from(exception);
  }

  async scanBarcode(
    id: string,
    workspaceId: string,
    dto: ScanBarcodeDto,
  ): Promise<{ success: boolean; message: string; data?: unknown }> {
    const existing = await this.findOrFail(id, workspaceId);

    return {
      success: true,
      message: `Barcode ${dto.barcode} scanned successfully`,
      data: { scanType: dto.scanType },
    };
  }

  async findAll(
    workspaceId: string,
    filter: PickingFilterDto,
  ): Promise<PickingListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return PickingListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<PickingResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return PickingResponseDto.from(record, true, true);
  }

  async getExceptions(id: string, workspaceId: string): Promise<PickingExceptionResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const exceptions = await this.repository.findExceptions(id, workspaceId);
    return exceptions.map(PickingExceptionResponseDto.from);
  }
}
