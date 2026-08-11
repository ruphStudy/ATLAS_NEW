import { Injectable, Logger } from '@nestjs/common';
import { ActivityCenterRepository } from './activity-center.repository';
import { ActivityEventQueue } from './jobs';
import {
  RecordActivityDto,
  ActivityFilterDto,
  PaginatedActivityEntryResponseDto,
  ActivityTimelineResponseDto,
} from './dto';
import {
  IActivityEntry,
  ActivityOutcome,
  ActivityStatus,
  ActivityEvent,
} from './interfaces';
import { ActivityEntryNotFoundException } from './exceptions/activity.exceptions';
import { DEFAULT_ACTIVITY_RETENTION_DAYS } from './constants';

@Injectable()
export class ActivityCenterService {
  private readonly logger = new Logger(ActivityCenterService.name);

  constructor(
    private readonly repository: ActivityCenterRepository,
    private readonly eventQueue: ActivityEventQueue,
  ) {}

  // ── Recording ────────────────────────────────────────────────────

  async record(dto: RecordActivityDto): Promise<IActivityEntry> {
    if (dto.dedupeKey) {
      const existing = await this.repository.findExistingByDedupeKey(
        dto.workspaceId,
        dto.recipientUserId,
        dto.dedupeKey,
      );
      if (existing) {
        return existing;
      }
    }

    const entry = await this.repository.create({
      workspaceId: dto.workspaceId,
      actorType: dto.actorType,
      actorId: dto.actorId,
      actorName: dto.actorName,
      action: dto.action,
      sourceModule: dto.sourceModule,
      entityType: dto.entityType,
      entityId: dto.entityId,
      outcome: dto.outcome ?? ActivityOutcome.SUCCESS,
      title: dto.title,
      description: dto.description,
      correlationId: dto.correlationId,
      requestId: dto.requestId,
      jobId: dto.jobId,
      workflowId: dto.workflowId,
      externalRef: dto.externalRef,
      timelineId: dto.timelineId,
      status: ActivityStatus.UNREAD,
      pinned: false,
      recipientUserId: dto.recipientUserId,
      dedupeKey: dto.dedupeKey,
      metadata: dto.metadata ?? {},
    });

    await this.eventQueue.publish({
      event: ActivityEvent.ACTIVITY_RECORDED,
      workspaceId: dto.workspaceId,
      activityId: entry.id,
      recipientUserId: dto.recipientUserId,
      timelineId: dto.timelineId,
    });

    return entry;
  }

  // ── Feeds ────────────────────────────────────────────────────────

  async findPersonalFeed(
    workspaceId: string,
    recipientUserId: string,
    filter: ActivityFilterDto,
  ): Promise<PaginatedActivityEntryResponseDto> {
    const [data, total] = await this.repository.findPersonalFeed(workspaceId, recipientUserId, filter);
    return this.paginate(data, total, filter);
  }

  async findWorkspaceFeed(
    workspaceId: string,
    filter: ActivityFilterDto,
  ): Promise<PaginatedActivityEntryResponseDto> {
    const [data, total] = await this.repository.findWorkspaceFeed(workspaceId, filter);
    return this.paginate(data, total, filter);
  }

  async findEntityFeed(
    workspaceId: string,
    entityType: string,
    entityId: string,
    filter: ActivityFilterDto,
  ): Promise<PaginatedActivityEntryResponseDto> {
    const [data, total] = await this.repository.findEntityFeed(workspaceId, entityType, entityId, filter);
    return this.paginate(data, total, filter);
  }

  async findTimeline(workspaceId: string, timelineId: string): Promise<ActivityTimelineResponseDto> {
    const entries = await this.repository.findTimeline(workspaceId, timelineId);
    return { timelineId, entries: entries as any };
  }

  private paginate(
    data: IActivityEntry[],
    total: number,
    filter: ActivityFilterDto,
  ): PaginatedActivityEntryResponseDto {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Reads / state transitions ───────────────────────────────────

  async findById(id: string, workspaceId: string, userId: string): Promise<IActivityEntry> {
    const entry = await this.repository.findById(id, workspaceId);
    if (!entry || !this.isVisibleTo(entry, userId)) {
      throw new ActivityEntryNotFoundException(id);
    }
    return entry;
  }

  async getUnreadCount(workspaceId: string, userId: string): Promise<number> {
    return this.repository.countUnreadPersonal(workspaceId, userId);
  }

  async markAllRead(workspaceId: string, userId: string): Promise<number> {
    const count = await this.repository.markAllReadPersonal(workspaceId, userId);

    await this.eventQueue.publish({
      event: ActivityEvent.ACTIVITY_ALL_READ,
      workspaceId,
      recipientUserId: userId,
      metadata: { count },
    });

    return count;
  }

  async markRead(id: string, workspaceId: string, userId: string): Promise<IActivityEntry> {
    await this.assertMutable(id, workspaceId, userId);

    const updated = await this.repository.updateStatus(id, {
      status: ActivityStatus.READ,
      readAt: new Date(),
    });

    await this.eventQueue.publish({
      event: ActivityEvent.ACTIVITY_READ,
      workspaceId,
      activityId: id,
      recipientUserId: userId,
    });

    return updated;
  }

  async pin(id: string, workspaceId: string, userId: string): Promise<IActivityEntry> {
    await this.assertMutable(id, workspaceId, userId);

    const updated = await this.repository.updateStatus(id, { pinned: true, pinnedAt: new Date() });

    await this.eventQueue.publish({
      event: ActivityEvent.ACTIVITY_PINNED,
      workspaceId,
      activityId: id,
      recipientUserId: userId,
    });

    return updated;
  }

  async unpin(id: string, workspaceId: string, userId: string): Promise<IActivityEntry> {
    await this.assertMutable(id, workspaceId, userId);

    const updated = await this.repository.updateStatus(id, { pinned: false, pinnedAt: null });

    await this.eventQueue.publish({
      event: ActivityEvent.ACTIVITY_UNPINNED,
      workspaceId,
      activityId: id,
      recipientUserId: userId,
    });

    return updated;
  }

  async archive(id: string, workspaceId: string, userId: string): Promise<IActivityEntry> {
    await this.assertMutable(id, workspaceId, userId);

    const updated = await this.repository.updateStatus(id, {
      status: ActivityStatus.ARCHIVED,
      archivedAt: new Date(),
    });

    await this.eventQueue.publish({
      event: ActivityEvent.ACTIVITY_ARCHIVED,
      workspaceId,
      activityId: id,
      recipientUserId: userId,
    });

    return updated;
  }

  async restore(id: string, workspaceId: string, userId: string): Promise<IActivityEntry> {
    const entry = await this.assertMutable(id, workspaceId, userId);

    const updated = await this.repository.updateStatus(id, {
      status: entry.readAt ? ActivityStatus.READ : ActivityStatus.UNREAD,
      archivedAt: null,
      dismissedAt: null,
    });

    await this.eventQueue.publish({
      event: ActivityEvent.ACTIVITY_RESTORED,
      workspaceId,
      activityId: id,
      recipientUserId: userId,
    });

    return updated;
  }

  async dismiss(id: string, workspaceId: string, userId: string): Promise<IActivityEntry> {
    await this.assertMutable(id, workspaceId, userId);

    const updated = await this.repository.updateStatus(id, {
      status: ActivityStatus.DISMISSED,
      dismissedAt: new Date(),
    });

    await this.eventQueue.publish({
      event: ActivityEvent.ACTIVITY_DISMISSED,
      workspaceId,
      activityId: id,
      recipientUserId: userId,
    });

    return updated;
  }

  async remove(id: string, workspaceId: string, userId: string): Promise<void> {
    await this.assertMutable(id, workspaceId, userId);
    await this.repository.softDelete(id);

    await this.eventQueue.publish({
      event: ActivityEvent.ACTIVITY_DELETED,
      workspaceId,
      activityId: id,
      recipientUserId: userId,
    });
  }

  async purgeRetention(workspaceId: string, retentionDays?: number): Promise<number> {
    const days = retentionDays ?? DEFAULT_ACTIVITY_RETENTION_DAYS;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const purged = await this.repository.purgeOlderThan(workspaceId, cutoff);
    this.logger.debug(`Purged ${purged} retained activity entries for workspace ${workspaceId}`);
    return purged;
  }

  /**
   * A workspace-wide entry (recipientUserId=null) is a shared record — any
   * workspace member may view/mutate it (its read/pinned/archived state is
   * shared, not per-viewer, since no per-viewer read-receipt table exists
   * for this). A personalized entry (recipientUserId set) may only be
   * viewed/mutated by that exact user — returning "not found" rather than
   * "forbidden" for a mismatch, so a caller can never confirm another
   * user's activity even exists.
   */
  private isVisibleTo(entry: IActivityEntry, userId: string): boolean {
    return !entry.recipientUserId || entry.recipientUserId === userId;
  }

  private async assertMutable(id: string, workspaceId: string, userId: string): Promise<IActivityEntry> {
    const entry = await this.repository.findById(id, workspaceId);
    if (!entry || !this.isVisibleTo(entry, userId)) {
      throw new ActivityEntryNotFoundException(id);
    }
    return entry;
  }
}
