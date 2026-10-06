import { Injectable } from '@nestjs/common';
import {
  BusinessRuleException,
  DuplicateResourceException,
  ResourceNotFoundException,
} from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { DispatchRepository } from './dispatch.repository';
import { DispatchEventQueue } from './jobs';
import {
  CreateDispatchDto,
  GenerateDispatchFromPackingDto,
  AssignDispatchDto,
  StartDispatchDto,
  ExecuteDispatchDto,
  UpdateDispatchDto,
  CompleteDispatchDto,
  CancelDispatchDto,
  ReopenDispatchDto,
  RecordExceptionDto,
  ScanBarcodeDto,
  DispatchFilterDto,
  DispatchResponseDto,
  DispatchListResponseDto,
  DispatchPackageResponseDto,
  DispatchExceptionResponseDto,
} from './dto';
import { DISPATCH_CONSTANTS } from './constants';
import { DispatchStatus, DispatchEvent } from './interfaces';

@Injectable()
export class DispatchService {
  constructor(
    private readonly repository: DispatchRepository,
    private readonly eventQueue: DispatchEventQueue,
  ) {}

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Dispatch task', id);
    return record;
  }

  private async recordHistory(
    taskId: string,
    workspaceId: string,
    fromStatus: DispatchStatus | null,
    toStatus: DispatchStatus,
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
    event: DispatchEvent,
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

  private assertStatusTransition(current: DispatchStatus, next: DispatchStatus): void {
    const allowed = DISPATCH_CONSTANTS.ALLOWED_STATUS_TRANSITIONS[current];
    if (!allowed?.includes(next)) {
      throw new BusinessRuleException(
        `Cannot transition dispatch from ${current} to ${next}`,
        ErrorCode.DISPATCH_INVALID_STATUS_TRANSITION,
      );
    }
  }

  async create(
    workspaceId: string,
    dto: CreateDispatchDto,
    createdBy: string,
  ): Promise<DispatchResponseDto> {
    const sequence = await this.repository.getNextSequence(workspaceId);
    const taskNumber = `DISP-${sequence.toString().padStart(6, '0')}`;

    const existing = await this.repository.findByNumber(taskNumber, workspaceId);
    if (existing) {
      throw new DuplicateResourceException('Dispatch task', 'taskNumber', taskNumber);
    }

    const packages = dto.packages?.map((pkg) => ({
      ...pkg,
      workspaceId,
      dispatched: false,
      scannedBarcodes: [],
      metadata: pkg.metadata ?? {},
    })) ?? [];

    const totalPackages = packages.length;

    const record = await this.repository.create({
      workspaceId,
      taskNumber,
      taskSequence: sequence,
      status: DispatchStatus.PENDING,
      dispatchType: dto.dispatchType,
      warehouseId: dto.warehouseId,
      packingTaskId: dto.packingTaskId ?? null,
      orderId: dto.orderId ?? null,
      shipmentId: dto.shipmentId ?? null,
      sourceType: dto.sourceType ?? 'PACKING',
      sourceId: dto.sourceId ?? null,
      carrierId: dto.carrierId ?? null,
      carrierName: dto.carrierName ?? null,
      serviceType: dto.serviceType ?? null,
      dispatchLocationId: dto.dispatchLocationId ?? null,
      totalPackages,
      dispatchedPackages: 0,
      priority: dto.priority ?? 0,
      notes: dto.notes ?? null,
      metadata: dto.metadata ?? {},
      packages: { create: packages },
    });

    await this.recordHistory(record['id'] as string, workspaceId, null, DispatchStatus.PENDING, 'Created', createdBy);
    await this.publishEvent(record, DispatchEvent.CREATED, { createdBy });

    return DispatchResponseDto.from(record, true, false);
  }

  async generateFromPacking(
    workspaceId: string,
    dto: GenerateDispatchFromPackingDto,
    createdBy: string,
  ): Promise<DispatchResponseDto> {
    return this.create(
      workspaceId,
      {
        dispatchType: dto.dispatchType,
        warehouseId: '',
        packingTaskId: dto.packingTaskId,
        sourceType: 'PACKING',
        sourceId: dto.packingTaskId,
        carrierId: dto.carrierId,
        carrierName: dto.carrierName,
        serviceType: dto.serviceType,
        dispatchLocationId: dto.dispatchLocationId,
        priority: dto.priority,
      },
      createdBy,
    );
  }

  async assign(
    id: string,
    workspaceId: string,
    dto: AssignDispatchDto,
  ): Promise<DispatchResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as DispatchStatus;

    this.assertStatusTransition(currentStatus, DispatchStatus.ASSIGNED);

    const updated = await this.repository.update(id, {
      status: DispatchStatus.ASSIGNED,
      assignedTo: dto.assignedTo,
      assignedAt: new Date(),
      notes: dto.notes ?? existing['notes'],
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      DispatchStatus.ASSIGNED,
      'Assigned',
      dto.assignedTo,
    );
    await this.publishEvent(updated, DispatchEvent.ASSIGNED, { assignedTo: dto.assignedTo });

    return DispatchResponseDto.from(updated, true, false);
  }

  async start(
    id: string,
    workspaceId: string,
    dto: StartDispatchDto,
  ): Promise<DispatchResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as DispatchStatus;

    this.assertStatusTransition(currentStatus, DispatchStatus.IN_PROGRESS);

    const updated = await this.repository.update(id, {
      status: DispatchStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      DispatchStatus.IN_PROGRESS,
      'Started',
      dto.startedBy ?? null,
    );
    await this.publishEvent(updated, DispatchEvent.STARTED, { startedBy: dto.startedBy });

    return DispatchResponseDto.from(updated, true, false);
  }

  async execute(
    id: string,
    workspaceId: string,
    dto: ExecuteDispatchDto,
  ): Promise<DispatchResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as DispatchStatus;

    if (currentStatus !== DispatchStatus.IN_PROGRESS) {
      throw new BusinessRuleException(
        'Can only execute dispatch when task is in progress',
        ErrorCode.DISPATCH_EXECUTE_NOT_ALLOWED,
      );
    }

    const packageUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];
    let totalDispatched = existing['dispatchedPackages'] as number;

    for (const pkgDto of dto.packages) {
      const packages = existing['packages'] as Record<string, unknown>[];
      const pkg = packages.find((p) => p['packageId'] === pkgDto.packageId);
      
      if (!pkg) {
        throw new ResourceNotFoundException('Package', pkgDto.packageId);
      }

      if (pkg['dispatched'] as boolean) {
        throw new BusinessRuleException(
          'Package already dispatched',
          ErrorCode.DISPATCH_DUPLICATE_PACKAGE,
        );
      }

      const scannedBarcodes = [...(pkg['scannedBarcodes'] as string[]), ...(pkgDto.scannedBarcodes ?? [])];

      packageUpdates.push({
        id: pkg['id'] as string,
        data: {
          dispatched: true,
          dispatchedAt: new Date(),
          scannedBarcodes,
          metadata: { ...pkg['metadata'], ...pkgDto.metadata },
        },
      });

      totalDispatched += 1;

      await this.publishEvent(existing, DispatchEvent.PACKAGE_DISPATCHED, {
        packageId: pkgDto.packageId,
      });
    }

    await this.repository.updatePackages(id, packageUpdates);

    const updated = await this.repository.update(id, {
      dispatchedPackages: totalDispatched,
    });

    return DispatchResponseDto.from(updated, true, false);
  }

  async updateDispatch(
    id: string,
    workspaceId: string,
    dto: UpdateDispatchDto,
  ): Promise<DispatchResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);

    const updated = await this.repository.update(id, {
      ...(dto.carrierId !== undefined && { carrierId: dto.carrierId }),
      ...(dto.carrierName !== undefined && { carrierName: dto.carrierName }),
      ...(dto.serviceType !== undefined && { serviceType: dto.serviceType }),
      ...(dto.manifestId !== undefined && { manifestId: dto.manifestId }),
      ...(dto.manifestUrl !== undefined && { manifestUrl: dto.manifestUrl }),
      ...(dto.pickupReference !== undefined && { pickupReference: dto.pickupReference }),
      ...(dto.dispatchReference !== undefined && { dispatchReference: dto.dispatchReference }),
      ...(dto.dispatchNoteUrl !== undefined && { dispatchNoteUrl: dto.dispatchNoteUrl }),
      ...(dto.handoverUrl !== undefined && { handoverUrl: dto.handoverUrl }),
      ...(dto.metadata !== undefined && { metadata: { ...existing['metadata'], ...dto.metadata } }),
    });

    if (dto.manifestUrl) {
      await this.publishEvent(updated, DispatchEvent.MANIFEST_GENERATED, { manifestId: dto.manifestId });
    }

    if (dto.handoverUrl) {
      await this.publishEvent(updated, DispatchEvent.HANDOVER_COMPLETED, { handoverUrl: dto.handoverUrl });
    }

    return DispatchResponseDto.from(updated, true, false);
  }

  async complete(
    id: string,
    workspaceId: string,
    dto: CompleteDispatchDto,
  ): Promise<DispatchResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as DispatchStatus;

    this.assertStatusTransition(currentStatus, DispatchStatus.COMPLETED);

    const updated = await this.repository.update(id, {
      status: DispatchStatus.COMPLETED,
      completedAt: new Date(),
      notes: dto.notes ?? existing['notes'],
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      DispatchStatus.COMPLETED,
      'Completed',
      dto.completedBy ?? null,
    );
    await this.publishEvent(updated, DispatchEvent.COMPLETED, { completedBy: dto.completedBy });

    return DispatchResponseDto.from(updated, true, false);
  }

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelDispatchDto,
  ): Promise<DispatchResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as DispatchStatus;

    this.assertStatusTransition(currentStatus, DispatchStatus.CANCELLED);

    const updated = await this.repository.update(id, {
      status: DispatchStatus.CANCELLED,
      cancelReason: dto.reason,
      cancelledBy: dto.cancelledBy ?? null,
      cancelledAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      DispatchStatus.CANCELLED,
      dto.reason,
      dto.cancelledBy ?? null,
    );
    await this.publishEvent(updated, DispatchEvent.CANCELLED, {
      cancelledBy: dto.cancelledBy,
      reason: dto.reason,
    });

    return DispatchResponseDto.from(updated, true, false);
  }

  async reopen(
    id: string,
    workspaceId: string,
    dto: ReopenDispatchDto,
  ): Promise<DispatchResponseDto> {
    const existing = await this.findOrFail(id, workspaceId);
    const currentStatus = existing['status'] as DispatchStatus;

    this.assertStatusTransition(currentStatus, DispatchStatus.REOPENED);

    const updated = await this.repository.update(id, {
      status: DispatchStatus.REOPENED,
    });

    await this.recordHistory(
      id,
      workspaceId,
      currentStatus,
      DispatchStatus.REOPENED,
      dto.reason,
      dto.reopenedBy ?? null,
    );
    await this.publishEvent(updated, DispatchEvent.REOPENED, {
      reopenedBy: dto.reopenedBy,
      reason: dto.reason,
    });

    return DispatchResponseDto.from(updated, true, false);
  }

  async recordException(
    id: string,
    workspaceId: string,
    dto: RecordExceptionDto,
  ): Promise<DispatchExceptionResponseDto> {
    await this.findOrFail(id, workspaceId);

    const exception = await this.repository.createException({
      taskId: id,
      packageId: dto.packageId ?? null,
      workspaceId,
      exceptionType: dto.exceptionType,
      description: dto.description,
      evidenceUrls: dto.evidenceUrls ?? [],
      metadata: dto.metadata ?? {},
    });

    await this.publishEvent(
      { id, workspaceId, taskNumber: '' } as Record<string, unknown>,
      DispatchEvent.EXCEPTION_RECORDED,
      {
        exceptionId: exception['id'],
        exceptionType: dto.exceptionType,
        packageId: dto.packageId,
      },
    );

    return DispatchExceptionResponseDto.from(exception);
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
    filter: DispatchFilterDto,
  ): Promise<DispatchListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return DispatchListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<DispatchResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return DispatchResponseDto.from(record, true, true);
  }

  async getPackages(id: string, workspaceId: string): Promise<DispatchPackageResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const packages = await this.repository.findPackagesByTask(id, workspaceId);
    return packages.map(DispatchPackageResponseDto.from);
  }

  async getExceptions(id: string, workspaceId: string): Promise<DispatchExceptionResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const exceptions = await this.repository.findExceptions(id, workspaceId);
    return exceptions.map(DispatchExceptionResponseDto.from);
  }
}
