import { Injectable } from '@nestjs/common';
import {
  BusinessRuleException,
  DuplicateResourceException,
  ResourceNotFoundException,
} from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { PackingRepository } from './packing.repository';
import { PackingEventQueue } from './jobs';
import {
  CreatePackingDto,
  GeneratePackingFromPickingDto,
  CreatePackageDto,
  AssignPackingDto,
  StartPackingDto,
  PausePackingDto,
  ResumePackingDto,
  ExecutePackingDto,
  UpdatePackageDto,
  CompletePackingDto,
  CancelPackingDto,
  ReopenPackingDto,
  RecordExceptionDto,
  ScanBarcodeDto,
  PackingFilterDto,
  PackingResponseDto,
  PackingListResponseDto,
  PackingPackageResponseDto,
  PackingExceptionResponseDto,
} from './dto';
import { PACKING_CONSTANTS } from './constants';
import { PackingStatus, PackingEvent } from './interfaces';

@Injectable()
export class PackingService {
  constructor(
    private readonly repository: PackingRepository,
    private readonly eventQueue: PackingEventQueue,
  ) {}

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Packing task', id);
    return record;
  }

  private async recordHistory(
    taskId: string,
    workspaceId: string,
    fromStatus: PackingStatus | null,
    toStatus: PackingStatus,
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
    event: PackingEvent,
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

  private assertStatusTransition(current: PackingStatus, next: PackingStatus): void {
    const allowed = PACKING_CONSTANTS.ALLOWED_STATUS_TRANSITIONS[current];
    if (!allowed?.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition packing from ${current} to ${next}`,
        ErrorCode.PACKING_INVALID_STATUS_TRANSITION,
      );
    }
  }

  async create(
    workspaceId: string,
    dto: CreatePackingDto,
    createdBy: string,
  ): Promise<PackingResponseDto> {
    const sequence = await this.repository.getNextSequence(workspaceId);
    const taskNumber = `PACK-${sequence.toString().padStart(6, '0')}`;

    const existing = await this.repository.findByNumber(taskNumber, workspaceId);
    if (existing) {
      throw new DuplicateResourceException('Packing task', 'taskNumber', taskNumber);
    }

    const lines = dto.lines?.map((line, index) => ({
      ...line,
      workspaceId,
      lineNumber: index + 1,
      status: PackingStatus.PENDING,
      packedQuantity: 0,
      scannedBarcodes: [],
      metadata: line.metadata ?? {},
      uom: line.uom ?? 'EA',
    })) ?? [];

    const totalQuantity = lines.reduce((sum, line) => sum + line.pickedQuantity, 0);

    const record = await this.repository.create({
      workspaceId,
      taskNumber,
      taskSequence: sequence,
      status: PackingStatus.PENDING,
      packingType: dto.packingType,
      warehouseId: dto.warehouseId,
      pickingTaskId: dto.pickingTaskId ?? null,
      orderId: dto.orderId ?? null,
      shipmentId: dto.shipmentId ?? null,
      sourceType: dto.sourceType ?? 'PICKING',
      sourceId: dto.sourceId ?? null,
      dispatchLocationId: dto.dispatchLocationId ?? null,
      totalQuantity,
      packedQuantity: 0,
      priority: dto.priority ?? 0,
      notes: dto.notes ?? null,
      metadata: dto.metadata ?? {},
      lines: { create: lines },
    });

    await this.recordHistory(record['id'] as string, workspaceId, null, PackingStatus.PENDING, 'Created', createdBy);
    await this.publishEvent(record, PackingEvent.CREATED, { createdBy });

    return PackingResponseDto.from(record, true, true, false);
  }

  async generateFromPicking(
    workspaceId: string,
    dto: GeneratePackingFromPickingDto,
    createdBy: string,
  ): Promise<PackingResponseDto> {
    return this.create(
      workspaceId,
      {
        packingType: dto.packingType,
        warehouseId: '',
        pickingTaskId: dto.pickingTaskId,
        sourceType: 'PICKING',
        sourceId: dto.pickingTaskId,
        dispatchLocationId: dto.dispatchLocationId,
        priority: dto.priority,
      },
      createdBy,
    );
  }

  async assign(
    id: string,
    workspaceId: string,
    dto: AssignPackingDto,
  ): Promise<PackingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PackingStatus;

    this.assertStatusTransition(currentStatus, PackingStatus.ASSIGNED);

    const updated = await this.repository.update(id, {
      status: PackingStatus.ASSIGNED,
      assignedTo: dto.assignedTo,
      assignedAt: new Date(),
      notes: dto.notes ?? existing['notes'],
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PackingStatus.ASSIGNED,
      'Assigned',
      dto.assignedTo,
    );
    await this.publishEvent(updated, PackingEvent.ASSIGNED, { assignedTo: dto.assignedTo });

    return PackingResponseDto.from(updated, true, true, false);
  }

  async start(
    id: string,
    workspaceId: string,
    dto: StartPackingDto,
  ): Promise<PackingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PackingStatus;

    this.assertStatusTransition(currentStatus, PackingStatus.IN_PROGRESS);

    const updated = await this.repository.update(id, {
      status: PackingStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PackingStatus.IN_PROGRESS,
      'Started',
      dto.startedBy ?? null,
    );
    await this.publishEvent(updated, PackingEvent.STARTED, { startedBy: dto.startedBy });

    return PackingResponseDto.from(updated, true, true, false);
  }

  async pause(
    id: string,
    workspaceId: string,
    dto: PausePackingDto,
  ): Promise<PackingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PackingStatus;

    this.assertStatusTransition(currentStatus, PackingStatus.PAUSED);

    const updated = await this.repository.update(id, {
      status: PackingStatus.PAUSED,
      pausedAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PackingStatus.PAUSED,
      dto.reason,
      dto.pausedBy ?? null,
    );
    await this.publishEvent(updated, PackingEvent.PAUSED, { pausedBy: dto.pausedBy, reason: dto.reason });

    return PackingResponseDto.from(updated, true, true, false);
  }

  async resume(
    id: string,
    workspaceId: string,
    dto: ResumePackingDto,
  ): Promise<PackingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PackingStatus;

    this.assertStatusTransition(currentStatus, PackingStatus.IN_PROGRESS);

    const updated = await this.repository.update(id, {
      status: PackingStatus.IN_PROGRESS,
      pausedAt: null,
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PackingStatus.IN_PROGRESS,
      'Resumed',
      dto.resumedBy ?? null,
    );
    await this.publishEvent(updated, PackingEvent.RESUMED, { resumedBy: dto.resumedBy });

    return PackingResponseDto.from(updated, true, true, false);
  }

  async execute(
    id: string,
    workspaceId: string,
    dto: ExecutePackingDto,
  ): Promise<PackingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PackingStatus;

    if (currentStatus !== PackingStatus.IN_PROGRESS) {
      throw new BusinessRuleException(
        'Can only execute packing when task is in progress',
        ErrorCode.PACKING_EXECUTE_NOT_ALLOWED,
      );
    }

    const lineUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];
    let totalPacked = existing['packedQuantity'] as number;

    for (const lineDto of dto.lines) {
      const line = await this.repository.findLine(lineDto.lineId, workspaceId);
      if (!line) {
        throw new ResourceNotFoundException('Packing line', lineDto.lineId);
      }

      const packedQty = lineDto.quantity;
      const newPackedQty = (line['packedQuantity'] as number) + packedQty;
      const pickedQty = line['pickedQuantity'] as number;

      if (newPackedQty > pickedQty) {
        throw new BusinessRuleException(
          'Cannot pack more than picked quantity',
          ErrorCode.PACKING_OVER_EXECUTION,
        );
      }

      const scannedBarcodes = [...(line['scannedBarcodes'] as string[]), ...(lineDto.scannedBarcodes ?? [])];

      lineUpdates.push({
        id: lineDto.lineId,
        data: {
          status: newPackedQty >= pickedQty ? PackingStatus.COMPLETED : PackingStatus.IN_PROGRESS,
          packedQuantity: newPackedQty,
          packageId: lineDto.packageId ?? line['packageId'],
          scannedBarcodes,
          metadata: { ...line['metadata'], ...lineDto.metadata },
        },
      });

      totalPacked += packedQty;

      await this.publishEvent(existing, PackingEvent.LINE_PACKED, {
        lineId: lineDto.lineId,
        quantity: packedQty,
        packageId: lineDto.packageId,
      });
    }

    await this.repository.updateLines(id, lineUpdates);

    const updated = await this.repository.update(id, {
      packedQuantity: totalPacked,
    });

    return PackingResponseDto.from(updated, true, true, false);
  }

  async createPackage(
    id: string,
    workspaceId: string,
    dto: CreatePackageDto,
  ): Promise<PackingPackageResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);

    const packages = await this.repository.findPackagesByTask(id, workspaceId);
    const packageNumber = `PKG-${(packages.length + 1).toString().padStart(3, '0')}`;
    const packageId = `${existing['taskNumber']}-${packageNumber}`;

    const pkg = await this.repository.createPackage({
      taskId: id,
      workspaceId,
      packageNumber,
      packageId,
      packageType: dto.packageType,
      length: dto.length ?? null,
      width: dto.width ?? null,
      height: dto.height ?? null,
      dimensionUnit: dto.dimensionUnit ?? 'cm',
      weight: dto.weight ?? null,
      weightUnit: dto.weightUnit ?? 'kg',
      maxWeight: dto.maxWeight ?? null,
      contents: dto.contents ?? [],
      packingMaterial: dto.packingMaterial ?? [],
      metadata: dto.metadata ?? {},
    });

    await this.publishEvent(existing, PackingEvent.PACKAGE_CREATED, {
      packageId: pkg['id'],
      packageNumber,
    });

    return PackingPackageResponseDto.from(pkg);
  }

  async updatePackage(
    taskId: string,
    packageId: string,
    workspaceId: string,
    dto: UpdatePackageDto,
  ): Promise<PackingPackageResponseDto> {
    await this.findOrFail(taskId, workspaceId);

    const pkg = await this.repository.findPackage(packageId, workspaceId);
    if (!pkg) {
      throw new ResourceNotFoundException('Package', packageId);
    }

    const updated = await this.repository.updatePackage(packageId, {
      ...(dto.length !== undefined && { length: dto.length }),
      ...(dto.width !== undefined && { width: dto.width }),
      ...(dto.height !== undefined && { height: dto.height }),
      ...(dto.weight !== undefined && { weight: dto.weight }),
      ...(dto.contents !== undefined && { contents: dto.contents }),
      ...(dto.packingMaterial !== undefined && { packingMaterial: dto.packingMaterial }),
      ...(dto.labelUrl !== undefined && { labelUrl: dto.labelUrl }),
      ...(dto.packingSlipUrl !== undefined && { packingSlipUrl: dto.packingSlipUrl }),
      ...(dto.evidenceUrls !== undefined && { evidenceUrls: dto.evidenceUrls }),
      ...(dto.shipmentReady !== undefined && { shipmentReady: dto.shipmentReady }),
      ...(dto.metadata !== undefined && { metadata: { ...pkg['metadata'], ...dto.metadata } }),
    });

    if (dto.shipmentReady) {
      await this.publishEvent(
        { id: taskId, workspaceId, taskNumber: '' } as Record<string, unknown>,
        PackingEvent.PACKAGE_COMPLETED,
        { packageId },
      );
    }

    return PackingPackageResponseDto.from(updated);
  }

  async complete(
    id: string,
    workspaceId: string,
    dto: CompletePackingDto,
  ): Promise<PackingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PackingStatus;

    this.assertStatusTransition(currentStatus, PackingStatus.COMPLETED);

    const updated = await this.repository.update(id, {
      status: PackingStatus.COMPLETED,
      completedAt: new Date(),
      notes: dto.notes ?? existing['notes'],
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PackingStatus.COMPLETED,
      'Completed',
      dto.completedBy ?? null,
    );
    await this.publishEvent(updated, PackingEvent.COMPLETED, { completedBy: dto.completedBy });

    return PackingResponseDto.from(updated, true, true, false);
  }

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelPackingDto,
  ): Promise<PackingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PackingStatus;

    this.assertStatusTransition(currentStatus, PackingStatus.CANCELLED);

    const updated = await this.repository.update(id, {
      status: PackingStatus.CANCELLED,
      cancelReason: dto.reason,
      cancelledBy: dto.cancelledBy ?? null,
      cancelledAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PackingStatus.CANCELLED,
      dto.reason,
      dto.cancelledBy ?? null,
    );
    await this.publishEvent(updated, PackingEvent.CANCELLED, {
      cancelledBy: dto.cancelledBy,
      reason: dto.reason,
    });

    return PackingResponseDto.from(updated, true, true, false);
  }

  async reopen(
    id: string,
    workspaceId: string,
    dto: ReopenPackingDto,
  ): Promise<PackingResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as PackingStatus;

    this.assertStatusTransition(currentStatus, PackingStatus.REOPENED);

    const updated = await this.repository.update(id, {
      status: PackingStatus.REOPENED,
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      PackingStatus.REOPENED,
      dto.reason,
      dto.reopenedBy ?? null,
    );
    await this.publishEvent(updated, PackingEvent.REOPENED, {
      reopenedBy: dto.reopenedBy,
      reason: dto.reason,
    });

    return PackingResponseDto.from(updated, true, true, false);
  }

  async recordException(
    id: string,
    workspaceId: string,
    dto: RecordExceptionDto,
  ): Promise<PackingExceptionResponseDto> {
    await this.findOrFail(id, workspaceId);

    const exception = await this.repository.createException({
      taskId: id,
      lineId: dto.lineId ?? null,
      packageId: dto.packageId ?? null,
      workspaceId,
      exceptionType: dto.exceptionType,
      description: dto.description,
      quantity: dto.quantity ?? null,
      evidenceUrls: dto.evidenceUrls ?? [],
      metadata: dto.metadata ?? {},
    });

    await this.publishEvent(
      { id, workspaceId, taskNumber: '' } as Record<string, unknown>,
      PackingEvent.EXCEPTION_RECORDED,
      {
        exceptionId: exception['id'],
        exceptionType: dto.exceptionType,
        lineId: dto.lineId,
        packageId: dto.packageId,
      },
    );

    return PackingExceptionResponseDto.from(exception);
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
    filter: PackingFilterDto,
  ): Promise<PackingListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return PackingListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<PackingResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return PackingResponseDto.from(record, true, true, true);
  }

  async getPackages(id: string, workspaceId: string): Promise<PackingPackageResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const packages = await this.repository.findPackagesByTask(id, workspaceId);
    return packages.map(PackingPackageResponseDto.from);
  }

  async getExceptions(id: string, workspaceId: string): Promise<PackingExceptionResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const exceptions = await this.repository.findExceptions(id, workspaceId);
    return exceptions.map(PackingExceptionResponseDto.from);
  }
}
