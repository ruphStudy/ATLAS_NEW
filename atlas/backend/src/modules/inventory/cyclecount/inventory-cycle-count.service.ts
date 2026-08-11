import { Injectable } from '@nestjs/common';
import {
  BusinessRuleException,
  DuplicateResourceException,
  ResourceNotFoundException,
} from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { InventoryRepository } from '../inventory.repository';
import { InventoryStockRepository } from '../stock/inventory-stock.repository';
import { InventoryStockService } from '../stock/inventory-stock.service';
import { InventoryReconciliationService } from '../reconciliation/inventory-reconciliation.service';
import { InventoryValidator } from '../validator/inventory.validator';
import { InventoryEventQueue } from '../jobs';
import { InventoryCycleCountRepository } from './inventory-cycle-count.repository';
import {
  InventoryCycleCountLineStatus,
  InventoryCycleCountStatus,
  InventoryCycleCountType,
  InventoryEvent,
  InventoryOwnershipType,
  InventoryReconciliationFindingStatus,
  InventoryReconciliationSourceType,
  InventoryReconciliationTrigger,
  InventoryReconciliationVarianceType,
  InventoryStockStatus,
} from '../interfaces';
import {
  AssignCycleCountDto,
  CancelCycleCountDto,
  CompleteCycleCountDto,
  ApproveCycleCountDto,
  CreateCycleCountDto,
  FlagRecountDto,
  InventoryCycleCountFilterDto,
  InventoryCycleCountHistoryResponseDto,
  InventoryCycleCountLineFilterDto,
  InventoryCycleCountLineListResponseDto,
  InventoryCycleCountLineResponseDto,
  InventoryCycleCountListResponseDto,
  InventoryCycleCountResponseDto,
  InventoryReconciliationLineFilterDto,
  PauseCycleCountDto,
  RejectCycleCountDto,
  ScheduleCycleCountDto,
  StartCycleCountDto,
  SubmitCycleCountLineDto,
} from '../dto';
import { INVENTORY_CYCLE_COUNT_CONSTANTS } from '../constants';

@Injectable()
export class InventoryCycleCountService {
  constructor(
    private readonly repository: InventoryCycleCountRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly stockRepository: InventoryStockRepository,
    private readonly stockService: InventoryStockService,
    private readonly reconciliationService: InventoryReconciliationService,
    private readonly validator: InventoryValidator,
    private readonly eventQueue: InventoryEventQueue,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Inventory cycle count', id);
    return record;
  }

  private async findLineOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findLineById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Cycle count line', id);
    return record;
  }

  private async recordHistory(
    cycleCountId: string,
    workspaceId: string,
    fromStatus: InventoryCycleCountStatus | null,
    toStatus: InventoryCycleCountStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createHistoryEntry({ cycleCountId, workspaceId, fromStatus, toStatus, reason, changedBy });
  }

  private async publishEvent(
    workspaceId: string,
    event: InventoryEvent,
    metadata: Record<string, unknown>,
    item?: Record<string, unknown> | null,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      inventoryItemId: (item?.['id'] as string) ?? 'cycle-count',
      sku: (item?.['sku'] as string) ?? 'CYCLE_COUNT',
      workspaceId,
      event,
      metadata,
    });
  }

  private async resolveItemForEvent(
    cc: Record<string, unknown>,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    const scopeId = cc['scopeInventoryItemId'] as string | null;
    if (!scopeId) return null;
    return this.inventoryRepository.findById(scopeId, workspaceId);
  }

  /**
   * Freezes AVAILABLE stock for every distinct bucket in the count's scope by
   * moving it to BLOCKED via the existing (atomic, transaction-ledger-backed)
   * changeStatus action — reusing the stock-transition rules already in place
   * rather than introducing a new frozen-stock mechanism. Only AVAILABLE is
   * eligible, since that is the only status the shared stock-transition map
   * allows moving into BLOCKED.
   */
  private async applyFreeze(
    lines: Record<string, unknown>[],
    workspaceId: string,
    userId: string,
  ): Promise<Record<string, unknown>[]> {
    const seen = new Set<string>();
    const snapshot: Record<string, unknown>[] = [];

    for (const line of lines) {
      const lineStatus = line['status'] as InventoryStockStatus;
      if (lineStatus !== InventoryStockStatus.AVAILABLE) continue;

      const key = [line['warehouseId'], line['locationId'] ?? '', line['batchId'] ?? ''].join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      const bucket = await this.stockRepository.findBucket(
        {
          inventoryItemId: line['inventoryItemId'] as string,
          warehouseId: line['warehouseId'] as string,
          locationId: (line['locationId'] as string | null) ?? null,
          batchId: (line['batchId'] as string | null) ?? null,
          status: lineStatus,
          ownershipType: InventoryOwnershipType.WORKSPACE,
          ownerRef: null,
        },
        workspaceId,
      );

      const quantity = (bucket?.['quantity'] as number) ?? 0;
      if (quantity <= 0) continue;

      await this.stockService.changeStatus(
        line['inventoryItemId'] as string,
        workspaceId,
        {
          warehouseId: line['warehouseId'] as string,
          locationId: (line['locationId'] as string | null) ?? undefined,
          batchId: (line['batchId'] as string | null) ?? undefined,
          fromStatus: lineStatus,
          toStatus: InventoryStockStatus.BLOCKED,
          quantity,
          reason: INVENTORY_CYCLE_COUNT_CONSTANTS.FREEZE_REASON,
        },
        userId,
      );

      snapshot.push({
        inventoryItemId: line['inventoryItemId'],
        warehouseId: line['warehouseId'],
        locationId: (line['locationId'] as string | null) ?? null,
        batchId: (line['batchId'] as string | null) ?? null,
        fromStatus: lineStatus,
        quantity,
      });
    }

    return snapshot;
  }

  private async releaseFreeze(
    cc: Record<string, unknown>,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const snapshot = (cc['freezeSnapshot'] as Record<string, unknown>[] | null) ?? [];
    for (const entry of snapshot) {
      await this.stockService.changeStatus(
        entry['inventoryItemId'] as string,
        workspaceId,
        {
          warehouseId: entry['warehouseId'] as string,
          locationId: (entry['locationId'] as string | null) ?? undefined,
          batchId: (entry['batchId'] as string | null) ?? undefined,
          fromStatus: InventoryStockStatus.BLOCKED,
          toStatus: entry['fromStatus'] as InventoryStockStatus,
          quantity: entry['quantity'] as number,
          reason: INVENTORY_CYCLE_COUNT_CONSTANTS.UNFREEZE_REASON,
        },
        userId,
      );
    }
  }

  private hideExpected(cc: Record<string, unknown>): boolean {
    const status = cc['status'] as InventoryCycleCountStatus;
    return (
      (cc['isBlind'] as boolean) === true &&
      status !== InventoryCycleCountStatus.COMPLETED &&
      status !== InventoryCycleCountStatus.APPROVED &&
      status !== InventoryCycleCountStatus.REJECTED
    );
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateCycleCountDto,
    createdBy: string,
  ): Promise<InventoryCycleCountResponseDto> {
    if (dto.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(workspaceId, dto.idempotencyKey);
      if (existing) {
        const [lines] = await this.repository.findLines(existing['id'] as string, workspaceId);
        return InventoryCycleCountResponseDto.from(existing, lines);
      }
    }

    const existingActive = await this.repository.findActiveByScope(
      workspaceId,
      dto.scopeWarehouseId ?? null,
      dto.scopeLocationId ?? null,
      dto.scopeInventoryItemId ?? null,
    );
    if (existingActive) {
      throw new DuplicateResourceException(
        'Inventory cycle count',
        'scope',
        `${dto.scopeWarehouseId ?? '*'}/${dto.scopeLocationId ?? '*'}/${dto.scopeInventoryItemId ?? '*'}`,
      );
    }

    const items = new Map<string, Record<string, unknown>>();
    for (const line of dto.lines) {
      if (!items.has(line.inventoryItemId)) {
        const item = await this.inventoryRepository.findById(line.inventoryItemId, workspaceId);
        if (!item) throw new ResourceNotFoundException('Inventory item', line.inventoryItemId);
        items.set(line.inventoryItemId, item);
      }
    }

    const cycleCount = await this.repository.create({
      workspaceId,
      type: dto.type ?? InventoryCycleCountType.FULL,
      status: InventoryCycleCountStatus.DRAFT,
      scopeWarehouseId: dto.scopeWarehouseId ?? null,
      scopeLocationId: dto.scopeLocationId ?? null,
      scopeInventoryItemId: dto.scopeInventoryItemId ?? null,
      abcClass: dto.abcClass ?? null,
      isBlind: dto.isBlind ?? dto.type === InventoryCycleCountType.BLIND,
      freezeStock: dto.freezeStock ?? false,
      freezeStatuses: dto.freezeStatuses ?? null,
      freezeSnapshot: null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      sourceReferenceType: dto.sourceReferenceType ?? null,
      sourceReferenceId: dto.sourceReferenceId ?? null,
      totalLines: dto.lines.length,
      countedLines: 0,
      varianceLines: 0,
      idempotencyKey: dto.idempotencyKey ?? null,
      metadata: dto.metadata ?? {},
      createdBy,
    });

    const cycleCountId = cycleCount['id'] as string;

    for (const line of dto.lines) {
      const item = items.get(line.inventoryItemId);
      await this.repository.createLine({
        cycleCountId,
        workspaceId,
        inventoryItemId: line.inventoryItemId,
        sku: (item?.['sku'] as string | null) ?? null,
        catalogProductId: (item?.['catalogProductId'] as string | null) ?? null,
        variantId: (item?.['variantId'] as string | null) ?? null,
        warehouseId: line.warehouseId,
        locationId: line.locationId ?? null,
        batchId: line.batchId ?? null,
        serialId: line.serialId ?? null,
        status: line.status ?? InventoryStockStatus.AVAILABLE,
        lineStatus: InventoryCycleCountLineStatus.PENDING,
      });
    }

    await this.recordHistory(
      cycleCountId,
      workspaceId,
      null,
      InventoryCycleCountStatus.DRAFT,
      'Cycle count created',
      createdBy,
    );

    const item = await this.resolveItemForEvent(cycleCount, workspaceId);
    await this.publishEvent(
      workspaceId,
      InventoryEvent.CYCLE_COUNT_CREATED,
      { cycleCountId, totalLines: dto.lines.length },
      item,
    );

    const [lines] = await this.repository.findLines(cycleCountId, workspaceId);
    return InventoryCycleCountResponseDto.from(cycleCount, lines);
  }

  // ── Lifecycle ────────────────────────────────────────────────

  async schedule(
    id: string,
    workspaceId: string,
    dto: ScheduleCycleCountDto,
    userId: string,
  ): Promise<InventoryCycleCountResponseDto> {
    const cc = await this.findOrFail(id, workspaceId);
    const status = cc['status'] as InventoryCycleCountStatus;
    if (status !== InventoryCycleCountStatus.SCHEDULED) {
      this.validator.assertCycleCountTransition(status, InventoryCycleCountStatus.SCHEDULED);
    }

    const updated = await this.repository.update(id, {
      status: InventoryCycleCountStatus.SCHEDULED,
      scheduledAt: new Date(dto.scheduledAt),
    });

    await this.recordHistory(id, workspaceId, status, InventoryCycleCountStatus.SCHEDULED, 'Cycle count scheduled', userId);
    const item = await this.resolveItemForEvent(cc, workspaceId);
    await this.publishEvent(workspaceId, InventoryEvent.CYCLE_COUNT_SCHEDULED, { cycleCountId: id }, item);

    const [lines] = await this.repository.findLines(id, workspaceId);
    return InventoryCycleCountResponseDto.from(updated, lines);
  }

  async assign(
    id: string,
    workspaceId: string,
    dto: AssignCycleCountDto,
    userId: string,
  ): Promise<InventoryCycleCountResponseDto> {
    const cc = await this.findOrFail(id, workspaceId);
    const status = cc['status'] as InventoryCycleCountStatus;
    this.validator.assertCycleCountTransition(status, InventoryCycleCountStatus.ASSIGNED);

    const updated = await this.repository.update(id, {
      status: InventoryCycleCountStatus.ASSIGNED,
      assignedTo: dto.assignedTo,
      assignedBy: userId,
      assignedAt: new Date(),
    });

    await this.recordHistory(id, workspaceId, status, InventoryCycleCountStatus.ASSIGNED, 'Cycle count assigned', userId);
    const item = await this.resolveItemForEvent(cc, workspaceId);
    await this.publishEvent(workspaceId, InventoryEvent.CYCLE_COUNT_ASSIGNED, { cycleCountId: id, assignedTo: dto.assignedTo }, item);

    const [lines] = await this.repository.findLines(id, workspaceId);
    return InventoryCycleCountResponseDto.from(updated, lines);
  }

  async start(
    id: string,
    workspaceId: string,
    dto: StartCycleCountDto,
    userId: string,
  ): Promise<InventoryCycleCountResponseDto> {
    const cc = await this.findOrFail(id, workspaceId);
    const status = cc['status'] as InventoryCycleCountStatus;
    this.validator.assertCycleCountTransition(status, InventoryCycleCountStatus.IN_PROGRESS);

    const isFirstStart = status === InventoryCycleCountStatus.ASSIGNED;
    const [lines] = await this.repository.findLines(id, workspaceId);

    let freezeSnapshot: Record<string, unknown>[] | null = null;

    if (isFirstStart) {
      for (const line of lines) {
        const bucket = await this.stockRepository.findBucket(
          {
            inventoryItemId: line['inventoryItemId'] as string,
            warehouseId: line['warehouseId'] as string,
            locationId: (line['locationId'] as string | null) ?? null,
            batchId: (line['batchId'] as string | null) ?? null,
            status: line['status'] as InventoryStockStatus,
            ownershipType: InventoryOwnershipType.WORKSPACE,
            ownerRef: null,
          },
          workspaceId,
        );
        await this.repository.updateLine(line['id'] as string, {
          expectedQuantity: (bucket?.['quantity'] as number) ?? 0,
        });
      }

      if (cc['freezeStock']) {
        freezeSnapshot = await this.applyFreeze(lines, workspaceId, userId);
      }
    }

    const updated = await this.repository.update(id, {
      status: InventoryCycleCountStatus.IN_PROGRESS,
      ...(isFirstStart && { startedAt: new Date(), freezeSnapshot }),
    });

    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryCycleCountStatus.IN_PROGRESS,
      dto.notes ?? (isFirstStart ? 'Cycle count started' : 'Cycle count resumed'),
      userId,
    );

    const item = await this.resolveItemForEvent(cc, workspaceId);
    await this.publishEvent(
      workspaceId,
      isFirstStart ? InventoryEvent.CYCLE_COUNT_STARTED : InventoryEvent.CYCLE_COUNT_RESUMED,
      { cycleCountId: id },
      item,
    );

    const [allLines] = await this.repository.findLines(id, workspaceId);
    return InventoryCycleCountResponseDto.from(updated, allLines);
  }

  async pause(
    id: string,
    workspaceId: string,
    dto: PauseCycleCountDto,
    userId: string,
  ): Promise<InventoryCycleCountResponseDto> {
    const cc = await this.findOrFail(id, workspaceId);
    const status = cc['status'] as InventoryCycleCountStatus;
    this.validator.assertCycleCountTransition(status, InventoryCycleCountStatus.PAUSED);

    const updated = await this.repository.update(id, { status: InventoryCycleCountStatus.PAUSED });
    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryCycleCountStatus.PAUSED,
      dto.reason ?? 'Cycle count paused',
      userId,
    );

    const item = await this.resolveItemForEvent(cc, workspaceId);
    await this.publishEvent(workspaceId, InventoryEvent.CYCLE_COUNT_PAUSED, { cycleCountId: id }, item);

    const [lines] = await this.repository.findLines(id, workspaceId);
    return InventoryCycleCountResponseDto.from(updated, lines);
  }

  async complete(
    id: string,
    workspaceId: string,
    dto: CompleteCycleCountDto,
    userId: string,
  ): Promise<InventoryCycleCountResponseDto> {
    const cc = await this.findOrFail(id, workspaceId);
    const status = cc['status'] as InventoryCycleCountStatus;
    this.validator.assertCycleCountTransition(status, InventoryCycleCountStatus.COMPLETED);

    const [lines] = await this.repository.findLines(id, workspaceId);
    const type = cc['type'] as InventoryCycleCountType;

    if (type === InventoryCycleCountType.FULL && lines.some((l) => l['countedQuantity'] == null)) {
      throw new BusinessRuleException(
        'All lines must be counted before completing a FULL cycle count',
        ErrorCode.INVENTORY_CYCLE_COUNT_INCOMPLETE,
      );
    }

    const countedLines = lines.filter((l) => l['countedQuantity'] != null);

    let reconciliationRunId: string | null = null;
    let varianceLines = 0;

    if (countedLines.length > 0) {
      const run = await this.reconciliationService.create(
        workspaceId,
        {
          sourceType: InventoryReconciliationSourceType.PHYSICAL_COUNT,
          trigger: InventoryReconciliationTrigger.SOURCE_SPECIFIC,
          inventoryItemId: (cc['scopeInventoryItemId'] as string | null) ?? undefined,
          scopeWarehouseId: (cc['scopeWarehouseId'] as string | null) ?? undefined,
          periodStart: ((cc['startedAt'] as Date | null) ?? new Date()).toISOString(),
          periodEnd: new Date().toISOString(),
          sourceReferenceType: 'inventory_cycle_count',
          sourceReferenceId: id,
          detectStale: false,
          lines: countedLines.map((line) => ({
            inventoryItemId: line['inventoryItemId'] as string,
            warehouseId: line['warehouseId'] as string,
            locationId: (line['locationId'] as string | null) ?? undefined,
            batchId: (line['batchId'] as string | null) ?? undefined,
            serialId: (line['serialId'] as string | null) ?? undefined,
            status: line['status'] as InventoryStockStatus,
            countedQuantity: line['countedQuantity'] as number,
          })),
        },
        userId,
      );

      reconciliationRunId = run.id;
      varianceLines = run.warningCount + run.criticalCount + run.unresolvedCount;
    }

    if (cc['freezeStock']) {
      await this.releaseFreeze(cc, workspaceId, userId);
    }

    const updated = await this.repository.update(id, {
      status: InventoryCycleCountStatus.COMPLETED,
      completedAt: new Date(),
      reconciliationRunId,
      countedLines: countedLines.length,
      varianceLines,
      freezeSnapshot: null,
    });

    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryCycleCountStatus.COMPLETED,
      dto.notes ?? 'Cycle count completed',
      userId,
    );

    const item = await this.resolveItemForEvent(cc, workspaceId);
    await this.publishEvent(
      workspaceId,
      InventoryEvent.CYCLE_COUNT_COMPLETED,
      { cycleCountId: id, reconciliationRunId, varianceLines },
      item,
    );
    if (varianceLines > 0) {
      await this.publishEvent(
        workspaceId,
        InventoryEvent.CYCLE_COUNT_VARIANCE_DETECTED,
        { cycleCountId: id, reconciliationRunId, varianceLines },
        item,
      );
    }

    const [allLines] = await this.repository.findLines(id, workspaceId);
    return InventoryCycleCountResponseDto.from(updated, allLines);
  }

  async approve(
    id: string,
    workspaceId: string,
    dto: ApproveCycleCountDto,
    userId: string,
  ): Promise<InventoryCycleCountResponseDto> {
    const cc = await this.findOrFail(id, workspaceId);
    const status = cc['status'] as InventoryCycleCountStatus;
    this.validator.assertCycleCountTransition(status, InventoryCycleCountStatus.APPROVED);

    const runId = cc['reconciliationRunId'] as string | null;
    if (runId) {
      const filter = new InventoryReconciliationLineFilterDto();
      filter.page = 1;
      filter.limit = 1000;
      const findings = await this.reconciliationService.findLines(runId, workspaceId, filter);

      for (const finding of findings.data) {
        if (
          finding.findingStatus === InventoryReconciliationFindingStatus.OPEN &&
          (finding.varianceType === InventoryReconciliationVarianceType.MISSING ||
            finding.varianceType === InventoryReconciliationVarianceType.EXCESS)
        ) {
          await this.reconciliationService.approveLine(finding.id, workspaceId, { notes: dto.notes }, userId);
        }
      }
    }

    const [lines] = await this.repository.findLines(id, workspaceId);
    for (const line of lines) {
      if (line['lineStatus'] === InventoryCycleCountLineStatus.COUNTED) {
        await this.repository.updateLine(line['id'] as string, {
          lineStatus: InventoryCycleCountLineStatus.VERIFIED,
        });
      }
    }

    const updated = await this.repository.update(id, {
      status: InventoryCycleCountStatus.APPROVED,
      approvedBy: userId,
      approvedAt: new Date(),
    });

    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryCycleCountStatus.APPROVED,
      dto.notes ?? 'Cycle count approved',
      userId,
    );

    const item = await this.resolveItemForEvent(cc, workspaceId);
    await this.publishEvent(workspaceId, InventoryEvent.CYCLE_COUNT_APPROVED, { cycleCountId: id }, item);

    const [lines] = await this.repository.findLines(id, workspaceId);
    return InventoryCycleCountResponseDto.from(updated, lines);
  }

  async reject(
    id: string,
    workspaceId: string,
    dto: RejectCycleCountDto,
    userId: string,
  ): Promise<InventoryCycleCountResponseDto> {
    const cc = await this.findOrFail(id, workspaceId);
    const status = cc['status'] as InventoryCycleCountStatus;
    this.validator.assertCycleCountTransition(status, InventoryCycleCountStatus.REJECTED);

    const [lines] = await this.repository.findLines(id, workspaceId);
    const targetLines = dto.lineIds?.length
      ? lines.filter((line) => dto.lineIds!.includes(line['id'] as string))
      : lines.filter((line) => line['lineStatus'] === InventoryCycleCountLineStatus.COUNTED);

    for (const line of targetLines) {
      const lineStatus = line['lineStatus'] as InventoryCycleCountLineStatus;
      if (lineStatus === InventoryCycleCountLineStatus.RECOUNT_REQUIRED) continue;
      this.validator.assertCycleCountLineTransition(lineStatus, InventoryCycleCountLineStatus.RECOUNT_REQUIRED);
      await this.repository.updateLine(line['id'] as string, {
        lineStatus: InventoryCycleCountLineStatus.RECOUNT_REQUIRED,
        countedQuantity: null,
        varianceQuantity: null,
        countedBy: null,
        countedAt: null,
        recountCount: { increment: 1 },
      });
    }

    const recountedCount = targetLines.filter(
      (line) => line['lineStatus'] === InventoryCycleCountLineStatus.COUNTED,
    ).length;

    await this.repository.update(id, {
      status: InventoryCycleCountStatus.REJECTED,
      ...(recountedCount > 0 && { countedLines: { decrement: recountedCount } }),
    });
    await this.recordHistory(id, workspaceId, status, InventoryCycleCountStatus.REJECTED, dto.reason, userId);

    this.validator.assertCycleCountTransition(InventoryCycleCountStatus.REJECTED, InventoryCycleCountStatus.IN_PROGRESS);
    const reopened = await this.repository.update(id, { status: InventoryCycleCountStatus.IN_PROGRESS });
    await this.recordHistory(
      id,
      workspaceId,
      InventoryCycleCountStatus.REJECTED,
      InventoryCycleCountStatus.IN_PROGRESS,
      'Reopened for recount',
      userId,
    );

    const item = await this.resolveItemForEvent(cc, workspaceId);
    await this.publishEvent(
      workspaceId,
      InventoryEvent.CYCLE_COUNT_REJECTED,
      { cycleCountId: id, reason: dto.reason, lineCount: targetLines.length },
      item,
    );

    const [allLines] = await this.repository.findLines(id, workspaceId);
    return InventoryCycleCountResponseDto.from(reopened, allLines);
  }

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelCycleCountDto,
    userId: string,
  ): Promise<InventoryCycleCountResponseDto> {
    const cc = await this.findOrFail(id, workspaceId);
    const status = cc['status'] as InventoryCycleCountStatus;
    this.validator.assertCycleCountTransition(status, InventoryCycleCountStatus.CANCELLED);

    if (cc['freezeStock'] && cc['freezeSnapshot']) {
      await this.releaseFreeze(cc, workspaceId, userId);
    }

    const updated = await this.repository.update(id, {
      status: InventoryCycleCountStatus.CANCELLED,
      freezeSnapshot: null,
    });

    await this.recordHistory(
      id,
      workspaceId,
      status,
      InventoryCycleCountStatus.CANCELLED,
      dto.reason ?? 'Cycle count cancelled',
      userId,
    );

    const item = await this.resolveItemForEvent(cc, workspaceId);
    await this.publishEvent(workspaceId, InventoryEvent.CYCLE_COUNT_CANCELLED, { cycleCountId: id }, item);

    const [lines] = await this.repository.findLines(id, workspaceId);
    return InventoryCycleCountResponseDto.from(updated, lines);
  }

  // ── Line actions ─────────────────────────────────────────────

  async submitCount(
    cycleCountId: string,
    lineId: string,
    workspaceId: string,
    dto: SubmitCycleCountLineDto,
    userId: string,
  ): Promise<InventoryCycleCountLineResponseDto> {
    const cc = await this.findOrFail(cycleCountId, workspaceId);
    const ccStatus = cc['status'] as InventoryCycleCountStatus;
    if (ccStatus !== InventoryCycleCountStatus.IN_PROGRESS) {
      throw new BusinessRuleException(
        `Cannot submit counts while the cycle count is in status ${ccStatus}`,
        ErrorCode.INVENTORY_CYCLE_COUNT_INVALID_STATUS_TRANSITION,
      );
    }

    const line = await this.findLineOrFail(lineId, workspaceId);
    if (line['cycleCountId'] !== cycleCountId) {
      throw new ResourceNotFoundException('Cycle count line', lineId);
    }

    const lineStatus = line['lineStatus'] as InventoryCycleCountLineStatus;
    this.validator.assertCycleCountLineTransition(lineStatus, InventoryCycleCountLineStatus.COUNTED);

    const expectedQuantity = (line['expectedQuantity'] as number | null) ?? 0;
    const varianceQuantity = dto.countedQuantity - expectedQuantity;
    const wasAlreadyCounted = lineStatus === InventoryCycleCountLineStatus.COUNTED;

    const updated = await this.repository.updateLine(lineId, {
      countedQuantity: dto.countedQuantity,
      varianceQuantity,
      lineStatus: InventoryCycleCountLineStatus.COUNTED,
      countedBy: userId,
      countedAt: new Date(),
      evidence: dto.evidence ?? [],
      notes: dto.notes ?? (line['notes'] as string | null),
    });

    if (!wasAlreadyCounted) {
      await this.repository.update(cycleCountId, { countedLines: { increment: 1 } });
    }

    const item = await this.inventoryRepository.findById(line['inventoryItemId'] as string, workspaceId);
    await this.publishEvent(
      workspaceId,
      InventoryEvent.CYCLE_COUNT_LINE_COUNTED,
      { cycleCountId, lineId, varianceQuantity },
      item,
    );

    return InventoryCycleCountLineResponseDto.from(updated, this.hideExpected(cc));
  }

  async flagRecount(
    cycleCountId: string,
    lineId: string,
    workspaceId: string,
    dto: FlagRecountDto,
    userId: string,
  ): Promise<InventoryCycleCountLineResponseDto> {
    const cc = await this.findOrFail(cycleCountId, workspaceId);
    const line = await this.findLineOrFail(lineId, workspaceId);
    if (line['cycleCountId'] !== cycleCountId) {
      throw new ResourceNotFoundException('Cycle count line', lineId);
    }

    const lineStatus = line['lineStatus'] as InventoryCycleCountLineStatus;
    this.validator.assertCycleCountLineTransition(lineStatus, InventoryCycleCountLineStatus.RECOUNT_REQUIRED);

    const updated = await this.repository.updateLine(lineId, {
      lineStatus: InventoryCycleCountLineStatus.RECOUNT_REQUIRED,
      countedQuantity: null,
      varianceQuantity: null,
      countedBy: null,
      countedAt: null,
      recountCount: { increment: 1 },
    });

    if (lineStatus === InventoryCycleCountLineStatus.COUNTED) {
      await this.repository.update(cycleCountId, { countedLines: { decrement: 1 } });
    }

    const ccStatus = cc['status'] as InventoryCycleCountStatus;
    let updatedCc = cc;
    if (ccStatus === InventoryCycleCountStatus.COMPLETED) {
      this.validator.assertCycleCountTransition(ccStatus, InventoryCycleCountStatus.IN_PROGRESS);
      updatedCc = await this.repository.update(cycleCountId, { status: InventoryCycleCountStatus.IN_PROGRESS });
      await this.recordHistory(
        cycleCountId,
        workspaceId,
        ccStatus,
        InventoryCycleCountStatus.IN_PROGRESS,
        'Reopened for recount',
        userId,
      );
    }

    const item = await this.inventoryRepository.findById(line['inventoryItemId'] as string, workspaceId);
    await this.publishEvent(
      workspaceId,
      InventoryEvent.CYCLE_COUNT_LINE_RECOUNT_FLAGGED,
      { cycleCountId, lineId, reason: dto.reason },
      item,
    );

    return InventoryCycleCountLineResponseDto.from(updated, this.hideExpected(updatedCc));
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: InventoryCycleCountFilterDto,
  ): Promise<InventoryCycleCountListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return InventoryCycleCountListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<InventoryCycleCountResponseDto> {
    const cc = await this.findOrFail(id, workspaceId);
    const [lines] = await this.repository.findLines(id, workspaceId);
    return InventoryCycleCountResponseDto.from(cc, lines);
  }

  async getHistory(id: string, workspaceId: string): Promise<InventoryCycleCountHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(InventoryCycleCountHistoryResponseDto.from);
  }

  async findLines(
    cycleCountId: string,
    workspaceId: string,
    filter: InventoryCycleCountLineFilterDto,
  ): Promise<InventoryCycleCountLineListResponseDto> {
    const cc = await this.findOrFail(cycleCountId, workspaceId);
    const [items, total] = await this.repository.findLines(cycleCountId, workspaceId, filter);
    return InventoryCycleCountLineListResponseDto.from(items, total, filter.page, filter.limit, this.hideExpected(cc));
  }

  async findLineById(id: string, workspaceId: string): Promise<InventoryCycleCountLineResponseDto> {
    const line = await this.findLineOrFail(id, workspaceId);
    const cc = await this.findOrFail(line['cycleCountId'] as string, workspaceId);
    return InventoryCycleCountLineResponseDto.from(line, this.hideExpected(cc));
  }
}
