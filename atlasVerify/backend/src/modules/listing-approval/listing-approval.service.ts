import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ListingApprovalRepository } from './listing-approval.repository';
import {
  ListingApprovalEventQueue,
  ListingApprovalNotificationQueue,
} from './jobs';
import { ApprovalValidationEngine } from './engine/approval-validation.engine';
import {
  ApprovalCheckResult,
  ApprovalEvent,
  ApprovalRule,
  ApprovalStatus,
} from './interfaces';
import {
  ApproveListingApprovalDto,
  CreateListingApprovalDto,
  ListingApprovalFilterDto,
  ListingApprovalHistoryResponseDto,
  ListingApprovalListResponseDto,
  ListingApprovalResponseDto,
  ListingApprovalStatsDto,
  MarkReadyToPublishDto,
  RejectListingApprovalDto,
  RequestRevisionDto,
  ResubmitForApprovalDto,
} from './dto';
import { LISTING_APPROVAL_CONSTANTS } from './constants';

@Injectable()
export class ListingApprovalService {
  private readonly logger = new Logger(ListingApprovalService.name);

  constructor(
    private readonly repository: ListingApprovalRepository,
    private readonly eventQueue: ListingApprovalEventQueue,
    private readonly notificationQueue: ListingApprovalNotificationQueue,
    private readonly validationEngine: ApprovalValidationEngine,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  private async findOrFail(id: string, workspaceId: string): Promise<Record<string, unknown>> {
    const record = await this.repository.findById(id, workspaceId);
    if (!record) throw new NotFoundException(`Listing approval ${id} not found`);
    return record;
  }

  private assertTransition(current: ApprovalStatus, next: ApprovalStatus): void {
    const allowed = LISTING_APPROVAL_CONSTANTS.ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition approval from ${current} to ${next}`,
      );
    }
  }

  private async publishEvent(
    record: Record<string, unknown>,
    event: ApprovalEvent,
    userId: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    const payload = {
      approvalId: record['id'] as string,
      listingId: record['listingId'] as string,
      catalogProductId: record['catalogProductId'] as string,
      workspaceId: record['workspaceId'] as string,
      event,
      triggeredBy: userId,
      metadata: meta,
    };
    await Promise.all([
      this.eventQueue.enqueue(payload),
      this.notificationQueue.enqueue({ ...payload, comment: meta?.['comment'] as string | undefined }),
    ]);
  }

  // ── Create ───────────────────────────────────────────────────

  async create(
    workspaceId: string,
    dto: CreateListingApprovalDto,
    createdBy: string,
  ): Promise<ListingApprovalResponseDto> {
    const version = await this.repository.getNextVersion(dto.listingId, workspaceId);
    const approvalRules = this.validationEngine.defaultRules();

    const record = await this.repository.create({
      workspaceId,
      listingId: dto.listingId,
      catalogProductId: dto.catalogProductId,
      status: ApprovalStatus.PENDING_APPROVAL,
      version,
      reviewedBy: null,
      reviewedAt: null,
      approvalComment: dto.approvalComment ?? null,
      rejectionReason: null,
      revisionNotes: null,
      checkResults: null,
      validationSummary: null,
      approvalRules,
    });

    await this.repository.createHistoryEntry({
      approvalId: record['id'] as string,
      workspaceId,
      fromStatus: ApprovalStatus.PENDING_APPROVAL,
      toStatus: ApprovalStatus.PENDING_APPROVAL,
      version,
      reason: 'Approval request created',
      changedBy: createdBy,
      checkResults: null,
    });

    return ListingApprovalResponseDto.from(record);
  }

  // ── Approve ───────────────────────────────────────────────────

  async approve(
    id: string,
    workspaceId: string,
    dto: ApproveListingApprovalDto,
    userId: string,
  ): Promise<ListingApprovalResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as ApprovalStatus;
    this.assertTransition(current, ApprovalStatus.APPROVED);

    const rules = (record['approvalRules'] as ApprovalRule[]) ?? this.validationEngine.defaultRules();
    const validationSummary = this.validationEngine.validate(
      {},
      rules,
      dto.checkResults as ApprovalCheckResult[] | undefined,
    );

    const updated = await this.repository.update(id, workspaceId, {
      status: ApprovalStatus.APPROVED,
      reviewedBy: userId,
      reviewedAt: new Date(),
      approvalComment: dto.comment ?? null,
      checkResults: dto.checkResults ?? null,
      validationSummary,
    });

    await this.repository.createHistoryEntry({
      approvalId: id,
      workspaceId,
      fromStatus: current,
      toStatus: ApprovalStatus.APPROVED,
      version: record['version'] as number,
      reason: dto.comment ?? 'Approved',
      changedBy: userId,
      checkResults: dto.checkResults ?? null,
    });

    await this.publishEvent(updated, ApprovalEvent.APPROVED, userId, { comment: dto.comment });
    return ListingApprovalResponseDto.from(updated);
  }

  // ── Reject ────────────────────────────────────────────────────

  async reject(
    id: string,
    workspaceId: string,
    dto: RejectListingApprovalDto,
    userId: string,
  ): Promise<ListingApprovalResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as ApprovalStatus;
    this.assertTransition(current, ApprovalStatus.REJECTED);

    const rules = (record['approvalRules'] as ApprovalRule[]) ?? this.validationEngine.defaultRules();
    const validationSummary = this.validationEngine.validate(
      {},
      rules,
      dto.checkResults as ApprovalCheckResult[] | undefined,
    );

    const updated = await this.repository.update(id, workspaceId, {
      status: ApprovalStatus.REJECTED,
      reviewedBy: userId,
      reviewedAt: new Date(),
      rejectionReason: dto.reason,
      checkResults: dto.checkResults ?? null,
      validationSummary,
    });

    await this.repository.createHistoryEntry({
      approvalId: id,
      workspaceId,
      fromStatus: current,
      toStatus: ApprovalStatus.REJECTED,
      version: record['version'] as number,
      reason: dto.reason,
      changedBy: userId,
      checkResults: dto.checkResults ?? null,
    });

    await this.publishEvent(updated, ApprovalEvent.REJECTED, userId, { reason: dto.reason });
    return ListingApprovalResponseDto.from(updated);
  }

  // ── Request Revision ──────────────────────────────────────────

  async requestRevision(
    id: string,
    workspaceId: string,
    dto: RequestRevisionDto,
    userId: string,
  ): Promise<ListingApprovalResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as ApprovalStatus;
    this.assertTransition(current, ApprovalStatus.REVISION_REQUIRED);

    const rules = (record['approvalRules'] as ApprovalRule[]) ?? this.validationEngine.defaultRules();
    const validationSummary = this.validationEngine.validate(
      {},
      rules,
      dto.checkResults as ApprovalCheckResult[] | undefined,
    );

    const updated = await this.repository.update(id, workspaceId, {
      status: ApprovalStatus.REVISION_REQUIRED,
      reviewedBy: userId,
      reviewedAt: new Date(),
      revisionNotes: dto.notes,
      checkResults: dto.checkResults ?? null,
      validationSummary,
    });

    await this.repository.createHistoryEntry({
      approvalId: id,
      workspaceId,
      fromStatus: current,
      toStatus: ApprovalStatus.REVISION_REQUIRED,
      version: record['version'] as number,
      reason: dto.notes,
      changedBy: userId,
      checkResults: dto.checkResults ?? null,
    });

    await this.publishEvent(updated, ApprovalEvent.REVISION_REQUESTED, userId, { notes: dto.notes });
    return ListingApprovalResponseDto.from(updated);
  }

  // ── Resubmit ─────────────────────────────────────────────────

  async resubmit(
    id: string,
    workspaceId: string,
    dto: ResubmitForApprovalDto,
    userId: string,
  ): Promise<ListingApprovalResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as ApprovalStatus;
    this.assertTransition(current, ApprovalStatus.PENDING_APPROVAL);

    const updated = await this.repository.update(id, workspaceId, {
      status: ApprovalStatus.PENDING_APPROVAL,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      revisionNotes: null,
      checkResults: null,
      validationSummary: null,
      approvalComment: dto.comment ?? null,
    });

    await this.repository.createHistoryEntry({
      approvalId: id,
      workspaceId,
      fromStatus: current,
      toStatus: ApprovalStatus.PENDING_APPROVAL,
      version: record['version'] as number,
      reason: dto.comment ?? 'Resubmitted for approval',
      changedBy: userId,
      checkResults: null,
    });

    return ListingApprovalResponseDto.from(updated);
  }

  // ── Mark Ready to Publish ─────────────────────────────────────

  async markReadyToPublish(
    id: string,
    workspaceId: string,
    dto: MarkReadyToPublishDto,
    userId: string,
  ): Promise<ListingApprovalResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    const current = record['status'] as ApprovalStatus;
    this.assertTransition(current, ApprovalStatus.READY_TO_PUBLISH);

    const updated = await this.repository.update(id, workspaceId, {
      status: ApprovalStatus.READY_TO_PUBLISH,
    });

    await this.repository.createHistoryEntry({
      approvalId: id,
      workspaceId,
      fromStatus: current,
      toStatus: ApprovalStatus.READY_TO_PUBLISH,
      version: record['version'] as number,
      reason: dto.comment ?? 'Marked ready to publish',
      changedBy: userId,
      checkResults: null,
    });

    await this.publishEvent(updated, ApprovalEvent.READY_TO_PUBLISH, userId, { comment: dto.comment });
    return ListingApprovalResponseDto.from(updated);
  }

  // ── Read ─────────────────────────────────────────────────────

  async findAll(
    workspaceId: string,
    filter: ListingApprovalFilterDto,
  ): Promise<ListingApprovalListResponseDto> {
    const [items, total] = await this.repository.findAll(workspaceId, filter);
    return ListingApprovalListResponseDto.from(items, total, filter.page, filter.limit);
  }

  async findById(id: string, workspaceId: string): Promise<ListingApprovalResponseDto> {
    const record = await this.findOrFail(id, workspaceId);
    return ListingApprovalResponseDto.from(record);
  }

  async findByListing(
    listingId: string,
    workspaceId: string,
  ): Promise<ListingApprovalResponseDto[]> {
    const items = await this.repository.findByListingId(listingId, workspaceId);
    return items.map(ListingApprovalResponseDto.from);
  }

  async getLatestByListing(
    listingId: string,
    workspaceId: string,
  ): Promise<ListingApprovalResponseDto | null> {
    const record = await this.repository.findLatestByListingId(listingId, workspaceId);
    return record ? ListingApprovalResponseDto.from(record) : null;
  }

  async getStats(workspaceId: string): Promise<ListingApprovalStatsDto> {
    const raw = await this.repository.getStats(workspaceId);
    const dto = new ListingApprovalStatsDto();
    dto.total = raw['total'] as number;
    dto.byStatus = raw['byStatus'] as Record<string, number>;
    dto.pendingCount = raw['pendingCount'] as number;
    dto.approvedCount = raw['approvedCount'] as number;
    dto.rejectedCount = raw['rejectedCount'] as number;
    dto.revisionRequiredCount = raw['revisionRequiredCount'] as number;
    dto.readyToPublishCount = raw['readyToPublishCount'] as number;
    return dto;
  }

  async getHistory(id: string, workspaceId: string): Promise<ListingApprovalHistoryResponseDto[]> {
    await this.findOrFail(id, workspaceId);
    const history = await this.repository.findHistory(id, workspaceId);
    return history.map(ListingApprovalHistoryResponseDto.from);
  }

  // ── Delete ───────────────────────────────────────────────────

  async remove(id: string, workspaceId: string): Promise<void> {
    const record = await this.findOrFail(id, workspaceId);
    const status = record['status'] as ApprovalStatus;
    if (status === ApprovalStatus.READY_TO_PUBLISH) {
      throw new BadRequestException('Cannot delete an approval that is ready to publish');
    }
    await this.repository.softDelete(id);
  }
}
