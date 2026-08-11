import { TaskStatus } from '../interfaces';

export const TASK_MANAGEMENT_MODULE = 'task-management';

export const TASK_ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED, TaskStatus.ARCHIVED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.PAUSED, TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.ARCHIVED],
  [TaskStatus.PAUSED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED, TaskStatus.ARCHIVED],
  [TaskStatus.COMPLETED]: [TaskStatus.ARCHIVED],
  [TaskStatus.CANCELLED]: [TaskStatus.ARCHIVED],
  [TaskStatus.ARCHIVED]: [TaskStatus.TODO],
};

export const TASK_TERMINAL_STATUSES: TaskStatus[] = [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.ARCHIVED];

/** Roles permitted to manage/reassign any task in the workspace, beyond a task's own creator/assignee/watcher rights. */
export const TASK_ADMIN_ROLES: string[] = ['OWNER', 'ADMIN', 'MANAGER'];

export const TASK_SORT_FIELDS = ['createdAt', 'updatedAt', 'dueAt', 'priority', 'status', 'title'] as const;

/** Cap on rows scanned per tick when scanning for reminders/escalations/overdue tasks — mirrors every other module's bounded-scan convention this session. */
export const TASK_SCAN_LIMIT = 500;

export const RECURRENCE_FREQUENCY_TO_MS: Record<string, number> = {
  DAILY: 24 * 3_600_000,
  WEEKLY: 7 * 24 * 3_600_000,
  MONTHLY: 30 * 24 * 3_600_000,
};
