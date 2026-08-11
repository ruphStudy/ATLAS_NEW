import { Injectable } from '@nestjs/common';
import {
  BusinessRuleException,
  DuplicateResourceException,
  ResourceNotFoundException,
} from '@common/exceptions/atlas.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';
import { InventoryRepository } from '../inventory.repository';
import { InventoryStockRepository } from '../stock/inventory-stock.repository';
import { InventoryAdjustmentService } from '../adjustment/inventory-adjustment.service';
import { InventoryValidator } from '../validator/inventory.validator';
import { InventoryEventQueue } from '../jobs';
import { InventoryReconciliationRepository } from './inventory-reconciliation.repository';
import {
  InventoryAdjustmentType,
  InventoryEvent,
  InventoryOwnershipType,
  InventoryReconciliationClassification,
  InventoryReconciliationFindingStatus,
  InventoryReconciliationStatus,
  InventoryReconciliationTrigger,
  InventoryReconciliationVarianceType,
  InventoryStockStatus,
} from '../interfaces';
import {
  ApproveReconciliationLineDto,
  CancelReconciliationRunDto,
  CreateReconciliationRunDto,
  IgnoreReconciliationLineDto,
  InventoryReconciliationHistoryResponseDto,
  InventoryReconciliationLineFilterDto,
  InventoryReconciliationLineHistoryResponseDto,
  InventoryReconciliationLineListResponseDto,
  InventoryReconciliationLineResponseDto,
  InventoryReconciliationRunFilterDto,
  InventoryReconciliationRunListResponseDto,
  InventoryReconciliationRunResponseDto,
  InventoryStockFilterDto,
  RejectReconciliationLineDto,
  ReopenReconciliationLineDto,
  ResolveReconciliationLineDto,
} from '../dto';
import { INVENTORY_RECONCILIATION_CONSTANTS } from '../constants';

interface VarianceTally {
  matched: number;
  warning: number;
  critical: number;
  unresolved: number;
}

@Injectable()
export class InventoryReconciliationService {
  constructor(
    private readonly repository: InventoryReconciliationRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly stockRepository: InventoryStockRepository,
    private readonly adjustmentService: InventoryAdjustmentService,
    private readonly validator: InventoryValidator,
    private readonly eventQueue: InventoryEventQueue,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findRunOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findRunById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Inventory reconciliation run', id);
    return record;
  }

  private async findLineOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findLineById(id, workspaceId);
    if (!record) throw new ResourceNotFoundException('Inventory reconciliation finding', id);
    return record;
  }

  private async recordRunHistory(
    runId: string,
    workspaceId: string,
    fromStatus: InventoryReconciliationStatus | null,
    toStatus: InventoryReconciliationStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createRunHistoryEntry({ runId, workspaceId, fromStatus, toStatus, reason, changedBy });
  }

  private async recordLineHistory(
    lineId: string,
    workspaceId: string,
    fromStatus: InventoryReconciliationFindingStatus | null,
    toStatus: InventoryReconciliationFindingStatus,
    reason: string | null,
    changedBy: string | null,
  ): Promise<void> {
    await this.repository.createLineHistoryEntry({ lineId, workspaceId, fromStatus, toStatus, reason, changedBy });
  }

  private async publishEvent(
    workspaceId: string,
    event: InventoryEvent,
    metadata: Record<string, unknown>,
    item?: Record<string, unknown> | null,
  ): Promise<void> {
    await this.eventQueue.enqueue({
      inventoryItemId: (item?.['id'] as string) ?? 'reconciliation',
      sku: (item?.['sku'] as string) ?? 'RECONCILIATION',
      workspaceId,
      event,
      metadata,
    });
  }

  private bucketKey(
    inventoryItemId: string,
    warehouseId: string,
    locationId: string | null | undefined,
    batchId: string | null | undefined,
    serialId: string | null | undefined,
    status: InventoryStockStatus,
  ): string {
    return [inventoryItemId, warehouseId, locationId ?? '', batchId ?? '', serialId ?? '', status].join('|');
  }

  private classify(
    varianceType: InventoryReconciliationVarianceType,
    varianceQuantity: number,
    systemQuantity: number,
    varianceValue: number | null,
  ): InventoryReconciliationClassification {
    if (
      varianceType === InventoryReconciliationVarianceType.DUPLICATE ||
      varianceType === InventoryReconciliationVarianceType.STALE
    ) {
      return InventoryReconciliationClassification.UNRESOLVED;
    }

    const absQty = Math.abs(varianceQuantity);
    if (absQty === 0) return InventoryReconciliationClassification.MATCHED;

    const pct = systemQuantity !== 0 ? absQty / Math.abs(systemQuantity) : 1;
    const absValue = Math.abs(varianceValue ?? 0);
    const T = INVENTORY_RECONCILIATION_CONSTANTS;

    if (absQty <= T.MATCHED_MAX_QUANTITY || pct <= T.MATCHED_MAX_PERCENTAGE) {
      return InventoryReconciliationClassification.MATCHED;
    }
    if (absQty <= T.WARNING_MAX_QUANTITY || pct <= T.WARNING_MAX_PERCENTAGE || absValue <= T.WARNING_MAX_VALUE) {
      return InventoryReconciliationClassification.WARNING;
    }
    return InventoryReconciliationClassification.CRITICAL;
  }

  private tallyInto(tally: VarianceTally, classification: InventoryReconciliationClassification): void {
    if (classification === InventoryReconciliationClassification.MATCHED) tally.matched++;
    else if (classification === InventoryReconciliationClassification.WARNING) tally.warning++;
    else if (classification === InventoryReconciliationClassification.CRITICAL) tally.critical++;
    else tally.unresolved++;
  }

  /**
   * Flags system buckets holding stock that were not covered by the submitted
   * count at all and haven't moved in a while. Reuses the existing per-item
   * stock repository as-is, so this only runs for single-item-scoped runs.
   */
  private async detectStaleBuckets(
    runId: string,
    inventoryItemId: string,
    workspaceId: string,
    scopeWarehouseId: string | undefined,
    seenKeys: Set<string>,
  ): Promise<Record<string, unknown>[]> {
    const filter = new InventoryStockFilterDto();
    filter.page = 1;
    filter.limit = 1000;
    if (scopeWarehouseId) filter.warehouseId = scopeWarehouseId;

    const [buckets] = await this.stockRepository.findAll(inventoryItemId, workspaceId, filter);
    const item = await this.inventoryRepository.findById(inventoryItemId, workspaceId);

    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - INVENTORY_RECONCILIATION_CONSTANTS.STALE_AFTER_DAYS);

    const created: Record<string, unknown>[] = [];

    for (const bucket of buckets) {
      const quantity = bucket['quantity'] as number;
      if (quantity <= 0) continue;

      const key = this.bucketKey(
        inventoryItemId,
        bucket['warehouseId'] as string,
        bucket['locationId'] as string | null,
        bucket['batchId'] as string | null,
        null,
        bucket['status'] as InventoryStockStatus,
      );
      if (seenKeys.has(key)) continue;

      const updatedAt = new Date(bucket['updatedAt'] as Date);
      if (updatedAt > staleThreshold) continue;

      const line = await this.repository.createLine({
        runId,
        workspaceId,
        inventoryItemId,
        sku: (item?.['sku'] as string | null) ?? null,
        catalogProductId: (item?.['catalogProductId'] as string | null) ?? null,
        variantId: (item?.['variantId'] as string | null) ?? null,
        warehouseId: bucket['warehouseId'],
        locationId: (bucket['locationId'] as string | null) ?? null,
        batchId: (bucket['batchId'] as string | null) ?? null,
        serialId: null,
        status: bucket['status'],
        systemQuantity: quantity,
        countedQuantity: null,
        varianceQuantity: null,
        unitCost: null,
        varianceValue: null,
        varianceType: InventoryReconciliationVarianceType.STALE,
        classification: InventoryReconciliationClassification.UNRESOLVED,
        findingStatus: InventoryReconciliationFindingStatus.OPEN,
        reason: `No count submitted since last movement on ${updatedAt.toISOString()}`,
      });
      created.push(line);
    }

    return created;
  }

  // ── Create / Run ─────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateReconciliationRunDto,
    createdBy: string,
  ): Promise<InventoryReconciliationRunResponseDto> {
    if (dto.idempotencyKey) {
      const existing = await this.repository.findRunByIdempotencyKey(workspaceId, dto.idempotencyKey);
      if (existing) {
        const [lines] = await this.repository.findLines(existing['id'] as string, workspaceId);
        return InventoryReconciliationRunResponseDto.from(existing, lines);
      }
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    const existingActive = await this.repository.findActiveRunByScopeAndPeriod(
      workspaceId,
      dto.sourceType,
      dto.inventoryItemId ?? null,
      dto.scopeWarehouseId ?? null,
      periodStart,
      periodEnd,
    );
    if (existingActive) {
      throw new DuplicateResourceException(
        'Inventory reconciliation run',
        'period',
        `${dto.periodStart} – ${dto.periodEnd}`,
      );
    }

    const run = await this.repository.createRun({
      workspaceId,
      sourceType: dto.sourceType,
      trigger: dto.trigger ?? InventoryReconciliationTrigger.MANUAL,
      status: InventoryReconciliationStatus.PENDING,
      inventoryItemId: dto.inventoryItemId ?? null,
      scopeWarehouseId: dto.scopeWarehouseId ?? null,
      periodStart,
      periodEnd,
      sourceReferenceType: dto.sourceReferenceType ?? null,
      sourceReferenceId: dto.sourceReferenceId ?? null,
      totalLines: 0,
      matchedCount: 0,
      warningCount: 0,
      criticalCount: 0,
      unresolvedCount: 0,
      idempotencyKey: dto.idempotencyKey ?? null,
      metadata: dto.metadata ?? {},
      createdBy,
    });

    const runId = run['id'] as string;

    await this.recordRunHistory(
      runId,
      workspaceId,
      null,
      InventoryReconciliationStatus.PENDING,
      'Reconciliation run created',
      createdBy,
    );
    await this.publishEvent(workspaceId, InventoryEvent.RECONCILIATION_RUN_STARTED, { runId });

    const seenKeys = new Set<string>();
    const tally: VarianceTally = { matched: 0, warning: 0, critical: 0, unresolved: 0 };
    const createdLines: Record<string, unknown>[] = [];

    for (const inputLine of dto.lines) {
      const status = inputLine.status ?? InventoryStockStatus.AVAILABLE;
      const item = await this.inventoryRepository.findById(inputLine.inventoryItemId, workspaceId);
      if (!item) throw new ResourceNotFoundException('Inventory item', inputLine.inventoryItemId);

      const key = this.bucketKey(
        inputLine.inventoryItemId,
        inputLine.warehouseId,
        inputLine.locationId,
        inputLine.batchId,
        inputLine.serialId,
        status,
      );

      const bucket = await this.stockRepository.findBucket(
        {
          inventoryItemId: inputLine.inventoryItemId,
          warehouseId: inputLine.warehouseId,
          locationId: inputLine.locationId ?? null,
          batchId: inputLine.batchId ?? null,
          status,
          ownershipType: InventoryOwnershipType.WORKSPACE,
          ownerRef: null,
        },
        workspaceId,
      );

      const systemQuantity = (bucket?.['quantity'] as number) ?? 0;
      const countedQuantity = inputLine.countedQuantity;
      const varianceQuantity = countedQuantity - systemQuantity;
      const unitCost = inputLine.unitCost ?? null;
      const varianceValue = unitCost != null ? varianceQuantity * unitCost : null;

      let varianceType: InventoryReconciliationVarianceType;
      if (seenKeys.has(key)) {
        varianceType = InventoryReconciliationVarianceType.DUPLICATE;
      } else if (varianceQuantity === 0) {
        varianceType = InventoryReconciliationVarianceType.MATCHED;
      } else if (varianceQuantity < 0) {
        varianceType = InventoryReconciliationVarianceType.MISSING;
      } else {
        varianceType = InventoryReconciliationVarianceType.EXCESS;
      }
      seenKeys.add(key);

      const classification = this.classify(varianceType, varianceQuantity, systemQuantity, varianceValue);

      const created = await this.repository.createLine({
        runId,
        workspaceId,
        inventoryItemId: inputLine.inventoryItemId,
        sku: (item['sku'] as string | null) ?? null,
        catalogProductId: (item['catalogProductId'] as string | null) ?? null,
        variantId: (item['variantId'] as string | null) ?? null,
        warehouseId: inputLine.warehouseId,
        locationId: inputLine.locationId ?? null,
        batchId: inputLine.batchId ?? null,
        serialId: inputLine.serialId ?? null,
        status,
        systemQuantity,
        countedQuantity,
        varianceQuantity,
        unitCost,
        varianceValue,
        varianceType,
        classification,
        findingStatus: InventoryReconciliationFindingStatus.OPEN,
      });

      createdLines.push(created);
      this.tallyInto(tally, classification);

      if (
        classification === InventoryReconciliationClassification.CRITICAL ||
        classification === InventoryReconciliationClassification.UNRESOLVED
      ) {
        await this.publishEvent(
          workspaceId,
          InventoryEvent.RECONCILIATION_VARIANCE_DETECTED,
          { runId, lineId: created['id'], varianceType, classification },
          item,
        );
      }
    }

    if ((dto.detectStale ?? true) && dto.inventoryItemId) {
      const staleLines = await this.detectStaleBuckets(
        runId,
        dto.inventoryItemId,
        workspaceId,
        dto.scopeWarehouseId,
        seenKeys,
      );
      if (staleLines.length > 0) {
        const item = await this.inventoryRepository.findById(dto.inventoryItemId, workspaceId);
        for (const staleLine of staleLines) {
          createdLines.push(staleLine);
          this.tallyInto(tally, InventoryReconciliationClassification.UNRESOLVED);
          await this.publishEvent(
            workspaceId,
            InventoryEvent.RECONCILIATION_VARIANCE_DETECTED,
            {
              runId,
              lineId: staleLine['id'],
              varianceType: InventoryReconciliationVarianceType.STALE,
              classification: InventoryReconciliationClassification.UNRESOLVED,
            },
            item,
          );
        }
      }
    }

    const updatedRun = await this.repository.updateRun(runId, {
      status: InventoryReconciliationStatus.COMPLETED,
      totalLines: createdLines.length,
      matchedCount: tally.matched,
      warningCount: tally.warning,
      criticalCount: tally.critical,
      unresolvedCount: tally.unresolved,
    });

    await this.recordRunHistory(
      runId,
      workspaceId,
      InventoryReconciliationStatus.PENDING,
      InventoryReconciliationStatus.COMPLETED,
      'Reconciliation run completed',
      createdBy,
    );
    await this.publishEvent(workspaceId, InventoryEvent.RECONCILIATION_RUN_COMPLETED, {
      runId,
      totalLines: createdLines.length,
      ...tally,
    });

    return InventoryReconciliationRunResponseDto.from(updatedRun, createdLines);
  }

  async cancel(
    id: string,
    workspaceId: string,
    dto: CancelReconciliationRunDto,
    userId: string,
  ): Promise<InventoryReconciliationRunResponseDto> {
    const run = await this.findRunOrFail(id, workspaceId);
    const status = run['status'] as InventoryReconciliationStatus;
    this.validator.assertReconciliationRunTransition(status, InventoryReconciliationStatus.CANCELLED);

    const updated = await this.repository.updateRun(id, { status: InventoryReconciliationStatus.CANCELLED });
    await this.recordRunHistory(
      id,
      workspaceId,
      status,
      InventoryReconciliationStatus.CANCELLED,
      dto.reason ?? 'Reconciliation run cancelled',
      userId,
    );
    await this.publishEvent(workspaceId, InventoryEvent.RECONCILIATION_RUN_CANCELLED, { runId: id });

    const [lines] = await this.repository.findLines(id, workspaceId);
    return InventoryReconciliationRunResponseDto.from(updated, lines);
  }

  // ── Findings ─────────────────────────────────────────────────

  async approveLine(
    id: string,
    workspaceId: string,
    dto: ApproveReconciliationLineDto,
    userId: string,
  ): Promise<InventoryReconciliationLineResponseDto> {
    const line = await this.findLineOrFail(id, workspaceId);
    const status = line['findingStatus'] as InventoryReconciliationFindingStatus;
    this.validator.assertReconciliationFindingTransition(status, InventoryReconciliationFindingStatus.APPROVED);

    const varianceType = line['varianceType'] as InventoryReconciliationVarianceType;
    if (
      varianceType !== InventoryReconciliationVarianceType.MISSING &&
      varianceType !== InventoryReconciliationVarianceType.EXCESS
    ) {
      throw new BusinessRuleException(
        `Cannot approve a ${varianceType} finding directly — use resolve or ignore instead`,
        ErrorCode.INVENTORY_RECONCILIATION_INVALID_FINDING_TRANSITION,
      );
    }

    const adjustment = await this.adjustmentService.create(
      workspaceId,
      {
        inventoryItemId: line['inventoryItemId'] as string,
        type: InventoryAdjustmentType.COUNT_VARIANCE,
        warehouseId: line['warehouseId'] as string,
        locationId: (line['locationId'] as string | null) ?? undefined,
        batchId: (line['batchId'] as string | null) ?? undefined,
        serialId: (line['serialId'] as string | null) ?? undefined,
        toStatus: line['status'] as InventoryStockStatus,
        quantityDelta: line['varianceQuantity'] as number,
        uom: undefined,
        unitCost: (line['unitCost'] as number | null) ?? undefined,
        reason: `Reconciliation variance: counted ${line['countedQuantity']} vs system ${line['systemQuantity']}`,
        sourceReferenceType: 'inventory_reconciliation_line',
        sourceReferenceId: id,
        notes: dto.notes,
      },
      userId,
    );

    const updated = await this.repository.updateLine(id, {
      findingStatus: InventoryReconciliationFindingStatus.APPROVED,
      adjustmentId: adjustment.id,
    });

    await this.recordLineHistory(
      id,
      workspaceId,
      status,
      InventoryReconciliationFindingStatus.APPROVED,
      dto.notes ?? 'Finding approved; adjustment draft created',
      userId,
    );

    const item = await this.inventoryRepository.findById(line['inventoryItemId'] as string, workspaceId);
    await this.publishEvent(
      workspaceId,
      InventoryEvent.RECONCILIATION_FINDING_APPROVED,
      { lineId: id, adjustmentId: adjustment.id },
      item,
    );

    return InventoryReconciliationLineResponseDto.from(updated);
  }

  async rejectLine(
    id: string,
    workspaceId: string,
    dto: RejectReconciliationLineDto,
    userId: string,
  ): Promise<InventoryReconciliationLineResponseDto> {
    const line = await this.findLineOrFail(id, workspaceId);
    const status = line['findingStatus'] as InventoryReconciliationFindingStatus;
    this.validator.assertReconciliationFindingTransition(status, InventoryReconciliationFindingStatus.REJECTED);

    const updated = await this.repository.updateLine(id, {
      findingStatus: InventoryReconciliationFindingStatus.REJECTED,
    });
    await this.recordLineHistory(id, workspaceId, status, InventoryReconciliationFindingStatus.REJECTED, dto.reason, userId);

    const item = await this.inventoryRepository.findById(line['inventoryItemId'] as string, workspaceId);
    await this.publishEvent(
      workspaceId,
      InventoryEvent.RECONCILIATION_FINDING_REJECTED,
      { lineId: id, reason: dto.reason },
      item,
    );

    return InventoryReconciliationLineResponseDto.from(updated);
  }

  async ignoreLine(
    id: string,
    workspaceId: string,
    dto: IgnoreReconciliationLineDto,
    userId: string,
  ): Promise<InventoryReconciliationLineResponseDto> {
    const line = await this.findLineOrFail(id, workspaceId);
    const status = line['findingStatus'] as InventoryReconciliationFindingStatus;
    this.validator.assertReconciliationFindingTransition(status, InventoryReconciliationFindingStatus.IGNORED);

    const updated = await this.repository.updateLine(id, {
      findingStatus: InventoryReconciliationFindingStatus.IGNORED,
    });
    await this.recordLineHistory(
      id,
      workspaceId,
      status,
      InventoryReconciliationFindingStatus.IGNORED,
      dto.reason ?? 'Finding ignored',
      userId,
    );

    const item = await this.inventoryRepository.findById(line['inventoryItemId'] as string, workspaceId);
    await this.publishEvent(workspaceId, InventoryEvent.RECONCILIATION_FINDING_IGNORED, { lineId: id }, item);

    return InventoryReconciliationLineResponseDto.from(updated);
  }

  async resolveLine(
    id: string,
    workspaceId: string,
    dto: ResolveReconciliationLineDto,
    userId: string,
  ): Promise<InventoryReconciliationLineResponseDto> {
    const line = await this.findLineOrFail(id, workspaceId);
    const status = line['findingStatus'] as InventoryReconciliationFindingStatus;
    this.validator.assertReconciliationFindingTransition(status, InventoryReconciliationFindingStatus.RESOLVED);

    const updated = await this.repository.updateLine(id, {
      findingStatus: InventoryReconciliationFindingStatus.RESOLVED,
      resolvedBy: userId,
      resolvedAt: new Date(),
    });
    await this.recordLineHistory(
      id,
      workspaceId,
      status,
      InventoryReconciliationFindingStatus.RESOLVED,
      dto.reason ?? 'Finding resolved',
      userId,
    );

    const item = await this.inventoryRepository.findById(line['inventoryItemId'] as string, workspaceId);
    await this.publishEvent(workspaceId, InventoryEvent.RECONCILIATION_FINDING_RESOLVED, { lineId: id }, item);

    return InventoryReconciliationLineResponseDto.from(updated);
  }

  async reopenLine(
    id: string,
    workspaceId: string,
    dto: ReopenReconciliationLineDto,
    userId: string,
  ): Promise<InventoryReconciliationLineResponseDto> {
    const line = await this.findLineOrFail(id, workspaceId);
    const status = line['findingStatus'] as InventoryReconciliationFindingStatus;
    this.validator.assertReconciliationFindingTransition(status, InventoryReconciliationFindingStatus.OPEN);

    const updated = await this.repository.updateLine(id, {
      findingStatus: InventoryReconciliationFindingStatus.OPEN,
      resolvedBy: null,
      resolvedAt: null,
    });
    await this.recordLineHistory(
      id,
      workspaceId,
      status,
      InventoryReconciliationFindingStatus.OPEN,
      dto.reason ?? 'Finding reopened',
      userId,
    );

    const item = await this.inventoryRepository.findById(line['inventoryItemId'] as string, workspaceId);
    await this.publishEvent(workspaceId, InventoryEvent.RECONCILIATION_FINDING_REOPENED, { lineId: id }, item);

    return InventoryReconciliationLineResponseDto.from(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAllRuns(
    workspaceId: string,
    filter: InventoryReconciliationRunFilterDto,
  ): Promise<InventoryReconciliationRunListResponseDto> {
    const [items, total] = await this.repository.findAllRuns(workspaceId, filter);
    return InventoryReconciliationRunListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findRunById(id: string, workspaceId: string): Promise<InventoryReconciliationRunResponseDto> {
    const run = await this.findRunOrFail(id, workspaceId);
    const [lines] = await this.repository.findLines(id, workspaceId);
    return InventoryReconciliationRunResponseDto.from(run, lines);
  }

  async getRunHistory(id: string, workspaceId: string): Promise<InventoryReconciliationHistoryResponseDto[]> {
    await this.findRunOrFail(id, workspaceId);
    const history = await this.repository.findRunHistory(id, workspaceId);
    return history.map(InventoryReconciliationHistoryResponseDto.from);
  }

  async findLines(
    runId: string,
    workspaceId: string,
    filter: InventoryReconciliationLineFilterDto,
  ): Promise<InventoryReconciliationLineListResponseDto> {
    await this.findRunOrFail(runId, workspaceId);
    const [items, total] = await this.repository.findLines(runId, workspaceId, filter);
    return InventoryReconciliationLineListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findLineById(id: string, workspaceId: string): Promise<InventoryReconciliationLineResponseDto> {
    const line = await this.findLineOrFail(id, workspaceId);
    return InventoryReconciliationLineResponseDto.from(line);
  }

  async getLineHistory(
    id: string,
    workspaceId: string,
  ): Promise<InventoryReconciliationLineHistoryResponseDto[]> {
    await this.findLineOrFail(id, workspaceId);
    const history = await this.repository.findLineHistory(id, workspaceId);
    return history.map(InventoryReconciliationLineHistoryResponseDto.from);
  }
}
