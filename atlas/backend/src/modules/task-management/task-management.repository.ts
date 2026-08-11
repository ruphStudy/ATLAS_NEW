import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  ITask,
  ITaskChecklistItem,
  ITaskComment,
  ITaskAttachment,
  ITaskWatcher,
  TaskStatus,
} from './interfaces';
import { TaskFilterDto } from './dto';
import { TASK_SCAN_LIMIT } from './constants';

@Injectable()
export class TaskManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Tasks ────────────────────────────────────────────────────────

  async create(data: Partial<ITask>): Promise<ITask> {
    return this.prisma.task.create({ data: data as any }) as Promise<ITask>;
  }

  async findById(id: string, workspaceId: string): Promise<ITask | null> {
    return this.prisma.task.findFirst({
      where: { id, workspaceId, deletedAt: null },
    }) as Promise<ITask | null>;
  }

  async findByIds(ids: string[], workspaceId: string): Promise<ITask[]> {
    return this.prisma.task.findMany({
      where: { id: { in: ids }, workspaceId, deletedAt: null },
    }) as Promise<ITask[]>;
  }

  async findByDedupeKey(workspaceId: string, dedupeKey: string): Promise<ITask | null> {
    return this.prisma.task.findFirst({
      where: { workspaceId, dedupeKey, deletedAt: null },
    }) as Promise<ITask | null>;
  }

  async update(id: string, data: Partial<ITask>): Promise<ITask> {
    return this.prisma.task.update({ where: { id }, data: data as any }) as Promise<ITask>;
  }

  async listSubtasks(parentTaskId: string, workspaceId: string): Promise<ITask[]> {
    return this.prisma.task.findMany({
      where: { parentTaskId, workspaceId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    }) as Promise<ITask[]>;
  }

  async findAll(
    workspaceId: string,
    filter: TaskFilterDto,
    restrictToTaskIds?: string[],
  ): Promise<[ITask[], number]> {
    const where: Record<string, unknown> = { workspaceId, deletedAt: null };
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.module) where.module = filter.module;
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.taskType) where.taskType = filter.taskType;
    if (filter.category) where.category = filter.category;
    if (filter.label) where.labels = { has: filter.label };
    if (filter.parentTaskId) where.parentTaskId = filter.parentTaskId;
    if (filter.assigneeType) where.assigneeType = filter.assigneeType;
    if (filter.assigneeRef) where.assigneeRef = filter.assigneeRef;
    if (restrictToTaskIds) where.id = { in: restrictToTaskIds };

    if (filter.overdue) {
      where.dueAt = { lt: new Date() };
      where.status = { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.PAUSED] };
    }
    if (filter.upcoming) {
      where.dueAt = { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 3_600_000) };
      where.status = { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.PAUSED] };
    }

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.task.count({ where: where as any }),
    ]);

    return [data as ITask[], total];
  }

  async findOverdueTasks(now: Date, limit = TASK_SCAN_LIMIT): Promise<ITask[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      dueAt: { lt: now },
      status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.PAUSED] },
    };
    return this.prisma.task.findMany({ where: where as any, take: limit }) as Promise<ITask[]>;
  }

  async findTasksWithUpcomingReminders(now: Date, limit = TASK_SCAN_LIMIT): Promise<ITask[]> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      dueAt: { gt: now, not: null },
      reminderConfig: { not: null },
      status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.PAUSED] },
    };
    return this.prisma.task.findMany({ where: where as any, take: limit }) as Promise<ITask[]>;
  }

  /** Task ids currently assigned directly to this user, or to one of their held role keys — the "my tasks" / "team tasks" resolution. */
  async findTaskIdsForAssignee(workspaceId: string, userId: string, roleKeys: string[]): Promise<string[]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      OR: [
        { assigneeType: 'USER', assigneeRef: userId },
        ...(roleKeys.length > 0 ? [{ assigneeType: 'ROLE', assigneeRef: { in: roleKeys } }] : []),
      ],
    };
    const rows = await this.prisma.task.findMany({ where: where as any, select: { id: true } });
    return rows.map((r: { id: string }) => r.id);
  }

  // ── Checklist items ──────────────────────────────────────────────

  async createChecklistItem(data: Partial<ITaskChecklistItem>): Promise<ITaskChecklistItem> {
    return this.prisma.taskChecklistItem.create({ data: data as any }) as Promise<ITaskChecklistItem>;
  }

  async findChecklistItemById(id: string): Promise<ITaskChecklistItem | null> {
    return this.prisma.taskChecklistItem.findUnique({ where: { id } }) as Promise<ITaskChecklistItem | null>;
  }

  async listChecklistItems(taskId: string): Promise<ITaskChecklistItem[]> {
    return this.prisma.taskChecklistItem.findMany({
      where: { taskId },
      orderBy: { order: 'asc' },
    }) as Promise<ITaskChecklistItem[]>;
  }

  async updateChecklistItem(id: string, data: Partial<ITaskChecklistItem>): Promise<ITaskChecklistItem> {
    return this.prisma.taskChecklistItem.update({
      where: { id },
      data: data as any,
    }) as Promise<ITaskChecklistItem>;
  }

  async deleteChecklistItem(id: string): Promise<void> {
    await this.prisma.taskChecklistItem.delete({ where: { id } });
  }

  // ── Comments ─────────────────────────────────────────────────────

  async createComment(data: Partial<ITaskComment>): Promise<ITaskComment> {
    return this.prisma.taskComment.create({ data: data as any }) as Promise<ITaskComment>;
  }

  async listComments(taskId: string): Promise<ITaskComment[]> {
    return this.prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<ITaskComment[]>;
  }

  // ── Attachments ──────────────────────────────────────────────────

  async createAttachment(data: Partial<ITaskAttachment>): Promise<ITaskAttachment> {
    return this.prisma.taskAttachment.create({ data: data as any }) as Promise<ITaskAttachment>;
  }

  async findAttachment(taskId: string, fileId: string): Promise<ITaskAttachment | null> {
    return this.prisma.taskAttachment.findUnique({
      where: { taskId_fileId: { taskId, fileId } },
    }) as Promise<ITaskAttachment | null>;
  }

  async findAttachmentById(id: string): Promise<ITaskAttachment | null> {
    return this.prisma.taskAttachment.findUnique({ where: { id } }) as Promise<ITaskAttachment | null>;
  }

  async listAttachments(taskId: string): Promise<ITaskAttachment[]> {
    return this.prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    }) as Promise<ITaskAttachment[]>;
  }

  async deleteAttachment(id: string): Promise<void> {
    await this.prisma.taskAttachment.delete({ where: { id } });
  }

  // ── Watchers ─────────────────────────────────────────────────────

  async createWatcher(data: Partial<ITaskWatcher>): Promise<ITaskWatcher> {
    return this.prisma.taskWatcher.create({ data: data as any }) as Promise<ITaskWatcher>;
  }

  async findWatcher(taskId: string, userId: string): Promise<ITaskWatcher | null> {
    return this.prisma.taskWatcher.findUnique({
      where: { taskId_userId: { taskId, userId } },
    }) as Promise<ITaskWatcher | null>;
  }

  async findWatcherById(id: string): Promise<ITaskWatcher | null> {
    return this.prisma.taskWatcher.findUnique({ where: { id } }) as Promise<ITaskWatcher | null>;
  }

  async listWatchers(taskId: string): Promise<ITaskWatcher[]> {
    return this.prisma.taskWatcher.findMany({ where: { taskId } }) as Promise<ITaskWatcher[]>;
  }

  async deleteWatcher(id: string): Promise<void> {
    await this.prisma.taskWatcher.delete({ where: { id } });
  }
}
