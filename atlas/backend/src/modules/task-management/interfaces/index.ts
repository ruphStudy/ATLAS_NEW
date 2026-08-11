export enum TaskSource {
  MANUAL = 'MANUAL',
  SYSTEM_GENERATED = 'SYSTEM_GENERATED',
  WORKFLOW_GENERATED = 'WORKFLOW_GENERATED',
  APPROVAL_GENERATED = 'APPROVAL_GENERATED',
  AI_GENERATED = 'AI_GENERATED',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskAssigneeType {
  USER = 'USER',
  ROLE = 'ROLE',
  TEAM = 'TEAM',
  WORKSPACE = 'WORKSPACE',
}

export enum TaskManagementEvent {
  TASK_CREATED = 'task-management.task_created',
  TASK_UPDATED = 'task-management.task_updated',
  TASK_ASSIGNED = 'task-management.task_assigned',
  TASK_REASSIGNED = 'task-management.task_reassigned',
  TASK_STARTED = 'task-management.task_started',
  TASK_PAUSED = 'task-management.task_paused',
  TASK_RESUMED = 'task-management.task_resumed',
  TASK_COMPLETED = 'task-management.task_completed',
  TASK_CANCELLED = 'task-management.task_cancelled',
  TASK_ARCHIVED = 'task-management.task_archived',
  TASK_RESTORED = 'task-management.task_restored',
  TASK_REMINDER_DUE = 'task-management.reminder_due',
  TASK_ESCALATED = 'task-management.escalated',
  TASK_OVERDUE = 'task-management.overdue',
  RECURRING_TASK_CREATED = 'task-management.recurring_task_created',
}

export interface IRecurrenceConfig {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  endDate?: string;
}

export interface IReminderConfig {
  beforeDueHours: number[];
}

export interface IEscalationConfig {
  afterOverdueHours: number;
  escalateToRoleKeys?: string[];
  escalateToUserIds?: string[];
}

export interface ITask {
  id: string;
  workspaceId: string;
  title: string;
  description?: string | null;
  source: TaskSource;
  taskType?: string | null;
  category?: string | null;
  labels: string[];
  status: TaskStatus;
  priority: TaskPriority;
  module?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  sourceReference?: unknown;
  assigneeType?: TaskAssigneeType | null;
  assigneeRef?: string | null;
  createdBy?: string | null;
  parentTaskId?: string | null;
  dependsOnTaskIds: string[];
  isMilestone: boolean;
  dueAt?: Date | null;
  startedAt?: Date | null;
  pausedAt?: Date | null;
  completedAt?: Date | null;
  progressPercent: number;
  effortEstimateHours?: number | null;
  timeSpentMinutes: number;
  recurrence?: IRecurrenceConfig | null;
  recurrenceParentTaskId?: string | null;
  reminderConfig?: IReminderConfig | null;
  escalation?: IEscalationConfig | null;
  lastEscalatedAt?: Date | null;
  dedupeKey?: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
  deletedAt?: Date | null;
}

export interface ITaskChecklistItem {
  id: string;
  taskId: string;
  workspaceId: string;
  text: string;
  isDone: boolean;
  order: number;
  completedAt?: Date | null;
  completedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskComment {
  id: string;
  taskId: string;
  workspaceId: string;
  authorId?: string | null;
  comment: string;
  createdAt: Date;
}

export interface ITaskAttachment {
  id: string;
  taskId: string;
  workspaceId: string;
  fileId: string;
  addedBy?: string | null;
  createdAt: Date;
}

export interface ITaskWatcher {
  id: string;
  taskId: string;
  workspaceId: string;
  userId: string;
  createdAt: Date;
}

export interface ITaskManagementEventPayload {
  event: TaskManagementEvent;
  workspaceId: string;
  taskId?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  status?: TaskStatus;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
