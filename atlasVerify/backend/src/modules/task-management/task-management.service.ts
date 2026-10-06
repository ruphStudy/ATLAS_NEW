import { Injectable, Logger } from '@nestjs/common';
import { RolesPermissionsService } from '@modules/roles-permissions/roles-permissions.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { CreateNotificationDto } from '@modules/notifications/dto';
import { NotificationType, NotificationPriority, NotificationTargetType } from '@modules/notifications/interfaces';
import { ActivityCenterService } from '@modules/activity-center/activity-center.service';
import { RecordActivityDto } from '@modules/activity-center/dto';
import { ActivityActorType, ActivityOutcome } from '@modules/activity-center/interfaces';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { AuditActionCategory } from '@modules/audit-logs/interfaces';
import { TaskManagementRepository } from './task-management.repository';
import { TaskManagementEventQueue } from './jobs';
import {
  CreateTaskDto,
  UpdateTaskDto,
  AssignTaskDto,
  UpdateProgressDto,
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
  CreateCommentDto,
  CreateAttachmentDto,
  AddWatcherDto,
  TaskActionReasonDto,
  TaskFilterDto,
  PaginatedTaskResponseDto,
  TaskDashboardResponseDto,
} from './dto';
import {
  ITask,
  ITaskChecklistItem,
  ITaskComment,
  ITaskAttachment,
  ITaskWatcher,
  TaskStatus,
  TaskSource,
  TaskAssigneeType,
  TaskManagementEvent,
  IRecurrenceConfig,
  IReminderConfig,
  IEscalationConfig,
} from './interfaces';
import { TASK_MANAGEMENT_MODULE, TASK_ALLOWED_TRANSITIONS, TASK_ADMIN_ROLES, RECURRENCE_FREQUENCY_TO_MS } from './constants';
import {
  TaskNotFoundException,
  TaskInvalidStateTransitionException,
  TaskDependencyNotSatisfiedException,
  TaskChecklistItemNotFoundException,
  TaskAttachmentNotFoundException,
  TaskAttachmentAlreadyExistsException,
  TaskWatcherAlreadyExistsException,
  TaskWatcherNotFoundException,
  TaskAccessDeniedException,
} from './exceptions/task-management.exceptions';

@Injectable()
export class TaskManagementService {
  private readonly logger = new Logger(TaskManagementService.name);

  constructor(
    private readonly repository: TaskManagementRepository,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly notificationsService: NotificationsService,
    private readonly activityCenterService: ActivityCenterService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: TaskManagementEventQueue,
  ) {}

  // ── Create ───────────────────────────────────────────────────────

  async createTask(workspaceId: string, userId: string, dto: CreateTaskDto): Promise<ITask> {
    if (dto.dedupeKey) {
      const existing = await this.repository.findByDedupeKey(workspaceId, dto.dedupeKey);
      if (existing) {
        return existing;
      }
    }

    if (dto.parentTaskId) {
      await this.getTaskOrThrow(dto.parentTaskId, workspaceId);
    }
    if (dto.dependsOnTaskIds?.length) {
      const found = await this.repository.findByIds(dto.dependsOnTaskIds, workspaceId);
      if (found.length !== dto.dependsOnTaskIds.length) {
        const missing = dto.dependsOnTaskIds.find((id) => !found.some((t) => t.id === id));
        throw new TaskNotFoundException(missing ?? 'unknown');
      }
    }

    const task = await this.repository.create({
      workspaceId,
      title: dto.title,
      description: dto.description,
      source: dto.source ?? TaskSource.MANUAL,
      taskType: dto.taskType,
      category: dto.category,
      labels: dto.labels ?? [],
      status: TaskStatus.TODO,
      priority: dto.priority,
      module: dto.module,
      entityType: dto.entityType,
      entityId: dto.entityId,
      sourceReference: dto.sourceReference ?? null,
      assigneeType: dto.assigneeType,
      assigneeRef: dto.assigneeRef,
      createdBy: userId,
      parentTaskId: dto.parentTaskId,
      dependsOnTaskIds: dto.dependsOnTaskIds ?? [],
      isMilestone: dto.isMilestone ?? false,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      effortEstimateHours: dto.effortEstimateHours,
      recurrence: (dto.recurrence as IRecurrenceConfig) ?? null,
      reminderConfig: (dto.reminderConfig as IReminderConfig) ?? null,
      escalation: (dto.escalation as IEscalationConfig) ?? null,
      dedupeKey: dto.dedupeKey,
      metadata: dto.metadata ?? {},
    });

    await this.recordActivity(workspaceId, userId, 'task.created', task.id, `Task created: ${task.title}`);
    await this.recordAudit(workspaceId, userId, 'task-management.task.created', AuditActionCategory.CREATE, task.id);
    await this.publishEvent(TaskManagementEvent.TASK_CREATED, { workspaceId, taskId: task.id, module: task.module ?? undefined, entityType: task.entityType ?? undefined, entityId: task.entityId ?? undefined, status: task.status, actorId: userId });

    if (task.assigneeType === TaskAssigneeType.USER && task.assigneeRef) {
      await this.notifyUser(workspaceId, task.assigneeRef, 'New task assigned', task.title);
      await this.publishEvent(TaskManagementEvent.TASK_ASSIGNED, { workspaceId, taskId: task.id, actorId: userId });
    }

    return task;
  }

  // ── Read ─────────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<ITask> {
    return this.getTaskOrThrow(id, workspaceId);
  }

  async findAll(
    workspaceId: string,
    userId: string,
    userRole: string,
    filter: TaskFilterDto,
  ): Promise<PaginatedTaskResponseDto> {
    let restrictToTaskIds: string[] | undefined;
    if (filter.myTasks) {
      restrictToTaskIds = await this.repository.findTaskIdsForAssignee(workspaceId, userId, [userRole.toLowerCase()]);
    }

    const [data, total] = await this.repository.findAll(workspaceId, filter, restrictToTaskIds);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listSubtasks(id: string, workspaceId: string): Promise<ITask[]> {
    await this.getTaskOrThrow(id, workspaceId);
    return this.repository.listSubtasks(id, workspaceId);
  }

  async getDashboard(workspaceId: string, userId: string, userRole: string): Promise<TaskDashboardResponseDto> {
    const myTaskIds = await this.repository.findTaskIdsForAssignee(workspaceId, userId, [userRole.toLowerCase()]);
    const [myTasksPage, teamTasksPage, overduePage, upcomingPage] = await Promise.all([
      this.repository.findAll(workspaceId, { limit: 20, page: 1 } as TaskFilterDto, myTaskIds),
      this.repository.findAll(workspaceId, { assigneeType: TaskAssigneeType.ROLE, limit: 20, page: 1 } as TaskFilterDto),
      this.repository.findAll(workspaceId, { overdue: true, limit: 20, page: 1 } as TaskFilterDto),
      this.repository.findAll(workspaceId, { upcoming: true, limit: 20, page: 1 } as TaskFilterDto),
    ]);

    return {
      myTasks: myTasksPage[0] as any,
      teamTasks: teamTasksPage[0] as any,
      overdueTasks: overduePage[0] as any,
      upcomingTasks: upcomingPage[0] as any,
    };
  }

  // ── Update ───────────────────────────────────────────────────────

  async updateTask(id: string, workspaceId: string, userId: string, dto: UpdateTaskDto): Promise<ITask> {
    const task = await this.getTaskOrThrow(id, workspaceId);

    if (dto.dependsOnTaskIds?.length) {
      const found = await this.repository.findByIds(dto.dependsOnTaskIds, workspaceId);
      if (found.length !== dto.dependsOnTaskIds.length) {
        const missing = dto.dependsOnTaskIds.find((depId) => !found.some((t) => t.id === depId));
        throw new TaskNotFoundException(missing ?? 'unknown');
      }
    }

    const updated = await this.repository.update(id, {
      title: dto.title,
      description: dto.description,
      taskType: dto.taskType,
      category: dto.category,
      labels: dto.labels,
      priority: dto.priority,
      dependsOnTaskIds: dto.dependsOnTaskIds,
      isMilestone: dto.isMilestone,
      dueAt: dto.dueAt !== undefined ? new Date(dto.dueAt) : undefined,
      effortEstimateHours: dto.effortEstimateHours,
      recurrence: dto.recurrence as IRecurrenceConfig,
      reminderConfig: dto.reminderConfig as IReminderConfig,
      escalation: dto.escalation as IEscalationConfig,
      metadata: dto.metadata,
    } as Partial<ITask>);

    await this.recordActivity(workspaceId, userId, 'task.updated', id, `Task updated: ${task.title}`);
    await this.recordAudit(workspaceId, userId, 'task-management.task.updated', AuditActionCategory.UPDATE, id);
    await this.publishEvent(TaskManagementEvent.TASK_UPDATED, { workspaceId, taskId: id, actorId: userId });
    return updated;
  }

  async assignTask(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    dto: AssignTaskDto,
  ): Promise<ITask> {
    const task = await this.getTaskOrThrow(id, workspaceId);
    const isReassignment = !!task.assigneeRef;

    // Reassigning someone else's task away from them requires elevated authority; the creator, the
    // current assignee, or a workspace admin may always do it — anyone else cannot.
    if (isReassignment && task.createdBy !== userId && task.assigneeRef !== userId) {
      await this.assertCanManageWorkspaceTasks(workspaceId, userId, userRole);
    }

    const updated = await this.repository.update(id, {
      assigneeType: dto.assigneeType,
      assigneeRef: dto.assigneeRef,
    } as Partial<ITask>);

    await this.recordActivity(
      workspaceId,
      userId,
      isReassignment ? 'task.reassigned' : 'task.assigned',
      id,
      `Task ${isReassignment ? 'reassigned' : 'assigned'}: ${task.title}`,
    );
    await this.recordAudit(workspaceId, userId, `task-management.task.${isReassignment ? 'reassigned' : 'assigned'}`, AuditActionCategory.UPDATE, id);
    await this.publishEvent(isReassignment ? TaskManagementEvent.TASK_REASSIGNED : TaskManagementEvent.TASK_ASSIGNED, {
      workspaceId,
      taskId: id,
      actorId: userId,
    });

    if (dto.assigneeType === TaskAssigneeType.USER) {
      await this.notifyUser(workspaceId, dto.assigneeRef, isReassignment ? 'Task reassigned to you' : 'New task assigned', task.title);
    }
    return updated;
  }

  async updateProgress(id: string, workspaceId: string, userId: string, dto: UpdateProgressDto): Promise<ITask> {
    const task = await this.getTaskOrThrow(id, workspaceId);
    const updated = await this.repository.update(id, {
      progressPercent: dto.progressPercent ?? task.progressPercent,
      timeSpentMinutes: task.timeSpentMinutes + (dto.timeSpentMinutesDelta ?? 0),
    } as Partial<ITask>);

    await this.recordAudit(workspaceId, userId, 'task-management.task.progress_updated', AuditActionCategory.UPDATE, id);
    return updated;
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  async start(id: string, workspaceId: string, userId: string): Promise<ITask> {
    const task = await this.getTaskOrThrow(id, workspaceId);

    if (task.dependsOnTaskIds.length > 0) {
      const dependencies = await this.repository.findByIds(task.dependsOnTaskIds, workspaceId);
      const incomplete = dependencies.find((d) => d.status !== TaskStatus.COMPLETED);
      if (incomplete) {
        throw new TaskDependencyNotSatisfiedException(incomplete.id);
      }
    }

    return this.transition(task, workspaceId, userId, TaskStatus.IN_PROGRESS, TaskManagementEvent.TASK_STARTED, {
      startedAt: new Date(),
    });
  }

  async pause(id: string, workspaceId: string, userId: string): Promise<ITask> {
    const task = await this.getTaskOrThrow(id, workspaceId);
    return this.transition(task, workspaceId, userId, TaskStatus.PAUSED, TaskManagementEvent.TASK_PAUSED, {
      pausedAt: new Date(),
    });
  }

  async resume(id: string, workspaceId: string, userId: string): Promise<ITask> {
    const task = await this.getTaskOrThrow(id, workspaceId);
    return this.transition(task, workspaceId, userId, TaskStatus.IN_PROGRESS, TaskManagementEvent.TASK_RESUMED, {
      pausedAt: null,
    });
  }

  async complete(id: string, workspaceId: string, userId: string): Promise<ITask> {
    const task = await this.getTaskOrThrow(id, workspaceId);
    const completed = await this.transition(task, workspaceId, userId, TaskStatus.COMPLETED, TaskManagementEvent.TASK_COMPLETED, {
      completedAt: new Date(),
      progressPercent: 100,
    });

    if (task.recurrence) {
      await this.createNextRecurrence(task, workspaceId, userId);
    }
    await this.notifyWatchers(workspaceId, id, 'Task completed', task.title);
    return completed;
  }

  async cancel(id: string, workspaceId: string, userId: string, dto: TaskActionReasonDto): Promise<ITask> {
    const task = await this.getTaskOrThrow(id, workspaceId);
    return this.transition(task, workspaceId, userId, TaskStatus.CANCELLED, TaskManagementEvent.TASK_CANCELLED, {}, dto.reason);
  }

  async archive(id: string, workspaceId: string, userId: string, dto: TaskActionReasonDto): Promise<ITask> {
    const task = await this.getTaskOrThrow(id, workspaceId);
    return this.transition(task, workspaceId, userId, TaskStatus.ARCHIVED, TaskManagementEvent.TASK_ARCHIVED, {
      archivedAt: new Date(),
    }, dto.reason);
  }

  async restore(id: string, workspaceId: string, userId: string): Promise<ITask> {
    const task = await this.getTaskOrThrow(id, workspaceId);
    return this.transition(task, workspaceId, userId, TaskStatus.TODO, TaskManagementEvent.TASK_RESTORED, {
      archivedAt: null,
    });
  }

  // ── Checklist ────────────────────────────────────────────────────

  async addChecklistItem(taskId: string, workspaceId: string, dto: CreateChecklistItemDto): Promise<ITaskChecklistItem> {
    await this.getTaskOrThrow(taskId, workspaceId);
    const existing = await this.repository.listChecklistItems(taskId);
    const order = dto.order ?? existing.length;
    return this.repository.createChecklistItem({ taskId, workspaceId, text: dto.text, order });
  }

  async listChecklistItems(taskId: string, workspaceId: string): Promise<ITaskChecklistItem[]> {
    await this.getTaskOrThrow(taskId, workspaceId);
    return this.repository.listChecklistItems(taskId);
  }

  async updateChecklistItem(
    taskId: string,
    itemId: string,
    workspaceId: string,
    userId: string,
    dto: UpdateChecklistItemDto,
  ): Promise<ITaskChecklistItem> {
    await this.getTaskOrThrow(taskId, workspaceId);
    const item = await this.repository.findChecklistItemById(itemId);
    if (!item || item.taskId !== taskId) {
      throw new TaskChecklistItemNotFoundException(itemId);
    }

    return this.repository.updateChecklistItem(itemId, {
      text: dto.text,
      order: dto.order,
      isDone: dto.isDone,
      completedAt: dto.isDone === true ? new Date() : dto.isDone === false ? null : undefined,
      completedBy: dto.isDone === true ? userId : dto.isDone === false ? null : undefined,
    } as Partial<ITaskChecklistItem>);
  }

  async removeChecklistItem(taskId: string, itemId: string, workspaceId: string): Promise<void> {
    await this.getTaskOrThrow(taskId, workspaceId);
    const item = await this.repository.findChecklistItemById(itemId);
    if (!item || item.taskId !== taskId) {
      throw new TaskChecklistItemNotFoundException(itemId);
    }
    await this.repository.deleteChecklistItem(itemId);
  }

  // ── Comments ─────────────────────────────────────────────────────

  async addComment(taskId: string, workspaceId: string, userId: string, dto: CreateCommentDto): Promise<ITaskComment> {
    const task = await this.getTaskOrThrow(taskId, workspaceId);
    const comment = await this.repository.createComment({ taskId, workspaceId, authorId: userId, comment: dto.comment });

    await this.recordActivity(workspaceId, userId, 'task.commented', taskId, `Comment added on: ${task.title}`);
    await this.notifyWatchers(workspaceId, taskId, 'New comment on task', task.title, userId);
    return comment;
  }

  async listComments(taskId: string, workspaceId: string): Promise<ITaskComment[]> {
    await this.getTaskOrThrow(taskId, workspaceId);
    return this.repository.listComments(taskId);
  }

  // ── Attachments ──────────────────────────────────────────────────

  async addAttachment(taskId: string, workspaceId: string, userId: string, dto: CreateAttachmentDto): Promise<ITaskAttachment> {
    await this.getTaskOrThrow(taskId, workspaceId);
    const existing = await this.repository.findAttachment(taskId, dto.fileId);
    if (existing) {
      throw new TaskAttachmentAlreadyExistsException();
    }
    return this.repository.createAttachment({ taskId, workspaceId, fileId: dto.fileId, addedBy: userId });
  }

  async listAttachments(taskId: string, workspaceId: string): Promise<ITaskAttachment[]> {
    await this.getTaskOrThrow(taskId, workspaceId);
    return this.repository.listAttachments(taskId);
  }

  async removeAttachment(taskId: string, attachmentId: string, workspaceId: string): Promise<void> {
    await this.getTaskOrThrow(taskId, workspaceId);
    const attachment = await this.repository.findAttachmentById(attachmentId);
    if (!attachment || attachment.taskId !== taskId) {
      throw new TaskAttachmentNotFoundException(attachmentId);
    }
    await this.repository.deleteAttachment(attachmentId);
  }

  // ── Watchers ─────────────────────────────────────────────────────

  async addWatcher(taskId: string, workspaceId: string, userId: string, dto: AddWatcherDto): Promise<ITaskWatcher> {
    await this.getTaskOrThrow(taskId, workspaceId);
    const targetUserId = dto.userId ?? userId;
    const existing = await this.repository.findWatcher(taskId, targetUserId);
    if (existing) {
      throw new TaskWatcherAlreadyExistsException();
    }
    return this.repository.createWatcher({ taskId, workspaceId, userId: targetUserId });
  }

  async listWatchers(taskId: string, workspaceId: string): Promise<ITaskWatcher[]> {
    await this.getTaskOrThrow(taskId, workspaceId);
    return this.repository.listWatchers(taskId);
  }

  async removeWatcher(taskId: string, watcherId: string, workspaceId: string): Promise<void> {
    await this.getTaskOrThrow(taskId, workspaceId);
    const watcher = await this.repository.findWatcherById(watcherId);
    if (!watcher || watcher.taskId !== taskId) {
      throw new TaskWatcherNotFoundException(watcherId);
    }
    await this.repository.deleteWatcher(watcherId);
  }

  // ── Reminders / escalation (scheduler-callable; no active scheduler wired — mirrors prior modules' approach) ──

  async processRemindersAndEscalations(): Promise<{ remindersSent: number; escalatedCount: number }> {
    const now = new Date();
    let remindersSent = 0;

    const candidates = await this.repository.findTasksWithUpcomingReminders(now);
    for (const task of candidates) {
      const config = task.reminderConfig as IReminderConfig | null;
      if (!config?.beforeDueHours?.length || !task.dueAt) {
        continue;
      }
      const metadata = (task.metadata as Record<string, unknown>) ?? {};
      const remindersAlreadySent: number[] = Array.isArray(metadata.remindersSent) ? (metadata.remindersSent as number[]) : [];

      for (const hoursBefore of config.beforeDueHours) {
        if (remindersAlreadySent.includes(hoursBefore)) {
          continue;
        }
        const threshold = new Date(task.dueAt.getTime() - hoursBefore * 3_600_000);
        if (now >= threshold) {
          if (task.assigneeType === TaskAssigneeType.USER && task.assigneeRef) {
            await this.notifyUser(task.workspaceId, task.assigneeRef, 'Task reminder', task.title);
          }
          await this.publishEvent(TaskManagementEvent.TASK_REMINDER_DUE, { workspaceId: task.workspaceId, taskId: task.id });
          remindersAlreadySent.push(hoursBefore);
          remindersSent += 1;
        }
      }

      await this.repository.update(task.id, {
        metadata: { ...metadata, remindersSent: remindersAlreadySent },
      } as Partial<ITask>);
    }

    let escalatedCount = 0;
    const overdue = await this.repository.findOverdueTasks(now);
    for (const task of overdue) {
      const escalation = task.escalation as IEscalationConfig | null;
      if (!escalation || task.lastEscalatedAt || !task.dueAt) {
        continue;
      }
      const escalateAt = new Date(task.dueAt.getTime() + escalation.afterOverdueHours * 3_600_000);
      if (now < escalateAt) {
        continue;
      }

      await this.repository.update(task.id, { lastEscalatedAt: now } as Partial<ITask>);
      for (const targetUserId of escalation.escalateToUserIds ?? []) {
        await this.notifyUser(task.workspaceId, targetUserId, 'Task escalated — overdue', task.title);
      }
      await this.publishEvent(TaskManagementEvent.TASK_ESCALATED, { workspaceId: task.workspaceId, taskId: task.id });
      escalatedCount += 1;
    }

    return { remindersSent, escalatedCount };
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private async getTaskOrThrow(id: string, workspaceId: string): Promise<ITask> {
    const task = await this.repository.findById(id, workspaceId);
    if (!task) {
      throw new TaskNotFoundException(id);
    }
    return task;
  }

  async assertCanManageWorkspaceTasks(workspaceId: string, userId: string, userRole: string): Promise<void> {
    if (TASK_ADMIN_ROLES.includes(userRole)) {
      return;
    }
    const hasAdminRole = await this.rolesPermissionsService.userHasActiveRole(workspaceId, userId, 'admin');
    if (!hasAdminRole) {
      throw new TaskAccessDeniedException();
    }
  }

  private async transition(
    task: ITask,
    workspaceId: string,
    userId: string,
    to: TaskStatus,
    event: TaskManagementEvent,
    extraFields: Partial<ITask>,
    reason?: string,
  ): Promise<ITask> {
    if (!TASK_ALLOWED_TRANSITIONS[task.status]?.includes(to)) {
      throw new TaskInvalidStateTransitionException(task.status, to);
    }

    const updated = await this.repository.update(task.id, { status: to, ...extraFields } as Partial<ITask>);

    await this.recordActivity(workspaceId, userId, `task.${to.toLowerCase()}`, task.id, `Task ${to.toLowerCase()}: ${task.title}`, reason);
    await this.recordAudit(workspaceId, userId, `task-management.task.${to.toLowerCase()}`, AuditActionCategory.UPDATE, task.id, reason);
    await this.publishEvent(event, { workspaceId, taskId: task.id, status: to, actorId: userId });
    return updated;
  }

  private async createNextRecurrence(task: ITask, workspaceId: string, userId: string): Promise<void> {
    const recurrence = task.recurrence as IRecurrenceConfig;
    const intervalMs = (RECURRENCE_FREQUENCY_TO_MS[recurrence.frequency] ?? 0) * (recurrence.interval || 1);
    if (intervalMs <= 0) {
      return;
    }

    const baseDue = task.dueAt ?? new Date();
    const nextDueAt = new Date(baseDue.getTime() + intervalMs);
    if (recurrence.endDate && nextDueAt > new Date(recurrence.endDate)) {
      return;
    }

    const next = await this.repository.create({
      workspaceId,
      title: task.title,
      description: task.description,
      source: task.source,
      taskType: task.taskType,
      category: task.category,
      labels: task.labels,
      status: TaskStatus.TODO,
      priority: task.priority,
      module: task.module,
      entityType: task.entityType,
      entityId: task.entityId,
      sourceReference: task.sourceReference ?? null,
      assigneeType: task.assigneeType,
      assigneeRef: task.assigneeRef,
      createdBy: userId,
      dependsOnTaskIds: [],
      isMilestone: task.isMilestone,
      dueAt: nextDueAt,
      effortEstimateHours: task.effortEstimateHours,
      recurrence: task.recurrence,
      recurrenceParentTaskId: task.recurrenceParentTaskId ?? task.id,
      reminderConfig: task.reminderConfig,
      escalation: task.escalation,
      metadata: {},
    });

    await this.publishEvent(TaskManagementEvent.RECURRING_TASK_CREATED, { workspaceId, taskId: next.id, actorId: userId });
  }

  private async notifyWatchers(
    workspaceId: string,
    taskId: string,
    title: string,
    message: string,
    excludeUserId?: string,
  ): Promise<void> {
    const watchers = await this.repository.listWatchers(taskId);
    for (const watcher of watchers) {
      if (watcher.userId === excludeUserId) {
        continue;
      }
      await this.notifyUser(workspaceId, watcher.userId, title, message);
    }
  }

  private async notifyUser(workspaceId: string, userId: string, title: string, message: string): Promise<void> {
    try {
      const dto: CreateNotificationDto = {
        workspaceId,
        targetType: NotificationTargetType.USER,
        targetUserId: userId,
        type: NotificationType.INFO,
        priority: NotificationPriority.NORMAL,
        category: TASK_MANAGEMENT_MODULE,
        title,
        message,
        actionRequired: false,
      } as CreateNotificationDto;
      await this.notificationsService.create(dto);
    } catch (error) {
      this.logger.warn(`Failed to notify user ${userId}: ${(error as Error).message}`);
    }
  }

  private async recordActivity(
    workspaceId: string,
    actorId: string,
    action: string,
    taskId: string,
    title: string,
    description?: string,
  ): Promise<void> {
    try {
      const dto: RecordActivityDto = {
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId,
        action,
        sourceModule: TASK_MANAGEMENT_MODULE,
        entityType: 'Task',
        entityId: taskId,
        outcome: ActivityOutcome.SUCCESS,
        title,
        description,
        timelineId: taskId,
      } as RecordActivityDto;
      await this.activityCenterService.record(dto);
    } catch (error) {
      this.logger.warn(`Failed to record activity for task ${taskId}: ${(error as Error).message}`);
    }
  }

  private async recordAudit(
    workspaceId: string,
    actorId: string,
    action: string,
    actionCategory: AuditActionCategory,
    entityId: string,
    reason?: string,
  ): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.USER,
      actorId,
      action,
      actionCategory,
      module: TASK_MANAGEMENT_MODULE,
      entityType: 'Task',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
      reason,
    });
  }

  private async publishEvent(
    event: TaskManagementEvent,
    opts: {
      workspaceId: string;
      taskId?: string;
      module?: string;
      entityType?: string;
      entityId?: string;
      status?: TaskStatus;
      actorId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.publish({ event, ...opts });
  }
}
