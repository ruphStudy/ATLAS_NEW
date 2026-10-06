import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QualityInspectionRepository } from './quality-inspection.repository';
import { InspectionEventQueue } from './jobs';
import { QualityScoreEngine } from './engine/quality-score.engine';
import {
  QualityInspectionStatus,
  InspectionEvent,
  DefectDetail,
  ChecklistItem,
} from './interfaces';
import {
  CloseInspectionDto,
  CompleteInspectionDto,
  ConditionalApprovalDto,
  CreateQualityInspectionDto,
  QualityInspectionFilterDto,
  QualityInspectionHistoryResponseDto,
  QualityInspectionListResponseDto,
  QualityInspectionResponseDto,
  QualityInspectionStatsDto,
  RejectInspectionDto,
  RequestReInspectionDto,
  ScheduleInspectionDto,
  StartInspectionDto,
  UpdateQualityInspectionDto,
} from './dto';
import { INSPECTION_CONSTANTS } from './constants';

@Injectable()
export class QualityInspectionService {
  private readonly logger = new Logger(QualityInspectionService.name);

  constructor(
    private readonly repository: QualityInspectionRepository,
    private readonly eventQueue: InspectionEventQueue,
    private readonly scoreEngine: QualityScoreEngine,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Quality inspection ${id} not found`);
    return record;
  }

  private assertTransition(
    current: QualityInspectionStatus,
    next: QualityInspectionStatus,
  ): void {
    const allowed = INSPECTION_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition inspection from ${current} to ${next}`,
      );
    }
  }

  private async recordHistory(
    inspectionId: string,
    workspaceId: string,
    fromStatus: QualityInspectionStatus,
    toStatus: QualityInspectionStatus,
    reason: string | null,
    changedBy: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.repository.createHistoryEvent({
      inspectionId,
      workspaceId,
      fromStatus,
      toStatus,
      reason,
      changedBy,
      metadata: metadata ?? null,
    });
  }

  private async publishEvent(
    record: Record<string, unknown>,
    event: InspectionEvent,
    triggeredBy?: string,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      inspectionId: record['id'] as string,
      inspectionNumber: record['inspectionNumber'] as string,
      workspaceId: record['workspaceId'] as string,
      event,
      triggeredBy,
    });
  }

  // ── CRUD ─────────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateQualityInspectionDto,
    createdBy: string,
  ): Promise<QualityInspectionResponseDto> {
    const sequence = await this.repository.getNextSequence(workspaceId);
    const inspectionNumber = `${INSPECTION_CONSTANTS.NUMBER_PREFIX}-${String(sequence).padStart(INSPECTION_CONSTANTS.NUMBER_PAD_LENGTH, '0')}`;

    const record = await this.repository.create({
      workspaceId,
      inspectionNumber,
      inspectionSequence: sequence,
      status: QualityInspectionStatus.PENDING,
      inspectionType: dto.inspectionType,
      samplingMethod: dto.samplingMethod,
      shipmentId: dto.shipmentId ?? null,
      purchaseOrderId: dto.purchaseOrderId ?? null,
      supplierId: dto.supplierId ?? null,
      parentInspectionId: dto.parentInspectionId ?? null,
      products: dto.products ?? [],
      inspector: dto.inspector ?? null,
      inspectorName: dto.inspectorName ?? null,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
      inspectionDate: dto.inspectionDate ? new Date(dto.inspectionDate) : null,
      completedAt: null,
      quantityOrdered: dto.quantityOrdered,
      quantityInspected: dto.quantityInspected ?? 0,
      quantityPassed: dto.quantityPassed ?? 0,
      quantityFailed: dto.quantityFailed ?? 0,
      defects: dto.defects ?? [],
      checklist: dto.checklist ?? [],
      qualityScore: null,
      recommendation: null,
      images: dto.images ?? [],
      attachments: dto.attachments ?? [],
      notes: dto.notes ?? null,
      internalNotes: dto.internalNotes ?? null,
      conditionsForApproval: null,
      rejectionReason: null,
    });

    await this.recordHistory(
      record['id'] as string,
      workspaceId,
      QualityInspectionStatus.PENDING,
      QualityInspectionStatus.PENDING,
      'Inspection created',
      createdBy,
    );

    await this.publishEvent(record, InspectionEvent.CREATED, createdBy);
    return QualityInspectionResponseDto.from(record);
  }

  async update(
    id: string,
    workspaceId: string,
    dto: UpdateQualityInspectionDto,
  ): Promise<QualityInspectionResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as QualityInspectionStatus;

    if (
      current !== QualityInspectionStatus.PENDING &&
      current !== QualityInspectionStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        `Cannot update inspection in status ${current}`,
      );
    }

    const updated = await this.repository.update(id, workspaceId, {
      ...(dto.shipmentId !== undefined && { shipmentId: dto.shipmentId }),
      ...(dto.purchaseOrderId !== undefined && { purchaseOrderId: dto.purchaseOrderId }),
      ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
      ...(dto.inspectionType !== undefined && { inspectionType: dto.inspectionType }),
      ...(dto.samplingMethod !== undefined && { samplingMethod: dto.samplingMethod }),
      ...(dto.products !== undefined && { products: dto.products }),
      ...(dto.inspector !== undefined && { inspector: dto.inspector }),
      ...(dto.inspectorName !== undefined && { inspectorName: dto.inspectorName }),
      ...(dto.scheduledDate !== undefined && { scheduledDate: new Date(dto.scheduledDate) }),
      ...(dto.inspectionDate !== undefined && { inspectionDate: new Date(dto.inspectionDate) }),
      ...(dto.quantityOrdered !== undefined && { quantityOrdered: dto.quantityOrdered }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.internalNotes !== undefined && { internalNotes: dto.internalNotes }),
      ...(dto.images !== undefined && { images: dto.images }),
      ...(dto.attachments !== undefined && { attachments: dto.attachments }),
    });

    return QualityInspectionResponseDto.from(updated);
  }

  async findAll(
    workspaceId: string,
    filter: QualityInspectionFilterDto,
  ): Promise<QualityInspectionListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return QualityInspectionListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<QualityInspectionResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return QualityInspectionResponseDto.from(record);
  }

  async getStats(workspaceId: string): Promise<QualityInspectionStatsDto> {
    const raw = await this.repository.getStats(workspaceId);
    const dto = new QualityInspectionStatsDto();
    dto.total = raw['total'] as number;
    dto.byStatus = raw['byStatus'] as Record<string, number>;
    dto.averageQualityScore = raw['averageQualityScore'] as number;
    dto.passRate = raw['passRate'] as number;
    dto.failRate = raw['failRate'] as number;
    return dto;
  }

  async getHistory(
    id: string,
    workspaceId: string,
  ): Promise<QualityInspectionHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(QualityInspectionHistoryResponseDto.from);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const record = await this.findOrFail(id, workspaceId);
    const status = record['status'] as QualityInspectionStatus;
    if (status === QualityInspectionStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete an inspection that is in progress');
    }
    await this.repository.softDelete(id, workspaceId);
  }

  // ── Action: Schedule ─────────────────────────────────────────

  async schedule(
    id: string,
    workspaceId: string,
    dto: ScheduleInspectionDto,
    userId: string,
  ): Promise<QualityInspectionResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as QualityInspectionStatus;
    this.assertTransition(current, QualityInspectionStatus.SCHEDULED);

    const updated = await this.repository.update(id, workspaceId, {
      status: QualityInspectionStatus.SCHEDULED,
      scheduledDate: new Date(dto.scheduledDate),
      ...(dto.inspector !== undefined && { inspector: dto.inspector }),
      ...(dto.inspectorName !== undefined && { inspectorName: dto.inspectorName }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    await this.recordHistory(
      id,
      workspaceId,
      current,
      QualityInspectionStatus.SCHEDULED,
      `Scheduled for ${dto.scheduledDate}`,
      userId,
    );

    return QualityInspectionResponseDto.from(updated);
  }

  // ── Action: Start ────────────────────────────────────────────

  async start(
    id: string,
    workspaceId: string,
    dto: StartInspectionDto,
    userId: string,
  ): Promise<QualityInspectionResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as QualityInspectionStatus;
    this.assertTransition(current, QualityInspectionStatus.IN_PROGRESS);

    const updated = await this.repository.update(id, workspaceId, {
      status: QualityInspectionStatus.IN_PROGRESS,
      inspectionDate: new Date(dto.inspectionDate),
      ...(dto.inspector !== undefined && { inspector: dto.inspector }),
      ...(dto.inspectorName !== undefined && { inspectorName: dto.inspectorName }),
    });

    await this.recordHistory(
      id,
      workspaceId,
      current,
      QualityInspectionStatus.IN_PROGRESS,
      'Inspection started',
      userId,
    );

    await this.publishEvent(updated, InspectionEvent.STARTED, userId);
    return QualityInspectionResponseDto.from(updated);
  }

  // ── Action: Complete (calculates score, derives final status) ─

  async complete(
    id: string,
    workspaceId: string,
    dto: CompleteInspectionDto,
    userId: string,
  ): Promise<QualityInspectionResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as QualityInspectionStatus;

    if (current !== QualityInspectionStatus.IN_PROGRESS) {
      throw new BadRequestException('Inspection must be IN_PROGRESS to complete it');
    }

    if (dto.quantityPassed + dto.quantityFailed > dto.quantityInspected) {
      throw new BadRequestException(
        'quantityPassed + quantityFailed cannot exceed quantityInspected',
      );
    }

    const { qualityScore, recommendation, finalStatus } = this.scoreEngine.calculate({
      quantityInspected: dto.quantityInspected,
      quantityPassed: dto.quantityPassed,
      quantityFailed: dto.quantityFailed,
      defects: (dto.defects ?? []) as DefectDetail[],
      checklist: (dto.checklist ?? []) as ChecklistItem[],
    });

    const updated = await this.repository.update(id, workspaceId, {
      status: finalStatus,
      quantityInspected: dto.quantityInspected,
      quantityPassed: dto.quantityPassed,
      quantityFailed: dto.quantityFailed,
      defects: dto.defects ?? [],
      checklist: dto.checklist ?? [],
      qualityScore,
      recommendation,
      completedAt: new Date(),
      ...(dto.images !== undefined && { images: dto.images }),
      ...(dto.attachments !== undefined && { attachments: dto.attachments }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.internalNotes !== undefined && { internalNotes: dto.internalNotes }),
    });

    await this.recordHistory(
      id,
      workspaceId,
      current,
      finalStatus,
      `Completed with score ${qualityScore}. Recommendation: ${recommendation}`,
      userId,
      { qualityScore, recommendation },
    );

    const event =
      finalStatus === QualityInspectionStatus.PASSED
        ? InspectionEvent.PASSED
        : InspectionEvent.FAILED;

    await this.publishEvent(updated, InspectionEvent.COMPLETED, userId);
    await this.publishEvent(updated, event, userId);

    return QualityInspectionResponseDto.from(updated);
  }

  // ── Action: Conditional Approval ─────────────────────────────

  async conditionallyApprove(
    id: string,
    workspaceId: string,
    dto: ConditionalApprovalDto,
    userId: string,
  ): Promise<QualityInspectionResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as QualityInspectionStatus;
    this.assertTransition(current, QualityInspectionStatus.CONDITIONAL_APPROVAL);

    const updated = await this.repository.update(id, workspaceId, {
      status: QualityInspectionStatus.CONDITIONAL_APPROVAL,
      conditionsForApproval: dto.conditionsForApproval,
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    await this.recordHistory(
      id,
      workspaceId,
      current,
      QualityInspectionStatus.CONDITIONAL_APPROVAL,
      dto.conditionsForApproval,
      userId,
    );

    return QualityInspectionResponseDto.from(updated);
  }

  // ── Action: Reject ───────────────────────────────────────────

  async reject(
    id: string,
    workspaceId: string,
    dto: RejectInspectionDto,
    userId: string,
  ): Promise<QualityInspectionResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as QualityInspectionStatus;
    this.assertTransition(current, QualityInspectionStatus.REJECTED);

    const updated = await this.repository.update(id, workspaceId, {
      status: QualityInspectionStatus.REJECTED,
      rejectionReason: dto.rejectionReason,
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    await this.recordHistory(
      id,
      workspaceId,
      current,
      QualityInspectionStatus.REJECTED,
      dto.rejectionReason,
      userId,
    );

    return QualityInspectionResponseDto.from(updated);
  }

  // ── Action: Close ────────────────────────────────────────────

  async close(
    id: string,
    workspaceId: string,
    dto: CloseInspectionDto,
    userId: string,
  ): Promise<QualityInspectionResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as QualityInspectionStatus;
    this.assertTransition(current, QualityInspectionStatus.CLOSED);

    const updated = await this.repository.update(id, workspaceId, {
      status: QualityInspectionStatus.CLOSED,
      ...(dto.notes !== undefined && { notes: dto.notes }),
    });

    await this.recordHistory(
      id,
      workspaceId,
      current,
      QualityInspectionStatus.CLOSED,
      'Inspection closed',
      userId,
    );

    await this.publishEvent(updated, InspectionEvent.CLOSED, userId);
    return QualityInspectionResponseDto.from(updated);
  }

  // ── Action: Re-Inspect ────────────────────────────────────────

  async requestReInspection(
    id: string,
    workspaceId: string,
    dto: RequestReInspectionDto,
    userId: string,
  ): Promise<QualityInspectionResponseDto> {
    const parent = await this.findOrFail(id, workspaceId);
    const parentStatus = parent['status'] as QualityInspectionStatus;

    if (
      ![
        QualityInspectionStatus.FAILED,
        QualityInspectionStatus.CONDITIONAL_APPROVAL,
        QualityInspectionStatus.REJECTED,
        QualityInspectionStatus.CLOSED,
      ].includes(parentStatus)
    ) {
      throw new BadRequestException(
        `Re-inspection can only be requested for completed inspections`,
      );
    }

    const sequence = await this.repository.getNextSequence(workspaceId);
    const inspectionNumber = `${INSPECTION_CONSTANTS.NUMBER_PREFIX}-${String(sequence).padStart(INSPECTION_CONSTANTS.NUMBER_PAD_LENGTH, '0')}`;

    const reInspection = await this.repository.create({
      workspaceId,
      inspectionNumber,
      inspectionSequence: sequence,
      status: QualityInspectionStatus.PENDING,
      inspectionType: 'RE_INSPECTION',
      samplingMethod: parent['samplingMethod'],
      shipmentId: parent['shipmentId'] ?? null,
      purchaseOrderId: parent['purchaseOrderId'] ?? null,
      supplierId: parent['supplierId'] ?? null,
      parentInspectionId: id,
      products: parent['products'],
      inspector: null,
      inspectorName: null,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
      inspectionDate: null,
      completedAt: null,
      quantityOrdered: parent['quantityOrdered'],
      quantityInspected: 0,
      quantityPassed: 0,
      quantityFailed: 0,
      defects: [],
      checklist: [],
      qualityScore: null,
      recommendation: null,
      images: [],
      attachments: [],
      notes: dto.notes ?? null,
      internalNotes: null,
      conditionsForApproval: null,
      rejectionReason: null,
    });

    await this.recordHistory(
      reInspection['id'] as string,
      workspaceId,
      QualityInspectionStatus.PENDING,
      QualityInspectionStatus.PENDING,
      `Re-inspection requested from ${parent['inspectionNumber'] as string}`,
      userId,
      { parentInspectionId: id },
    );

    await this.publishEvent(reInspection, InspectionEvent.CREATED, userId);
    return QualityInspectionResponseDto.from(reInspection);
  }
}
