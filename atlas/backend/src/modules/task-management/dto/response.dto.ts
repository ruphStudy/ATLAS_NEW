import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskSource, TaskStatus, TaskPriority, TaskAssigneeType } from '../interfaces';

export class TaskResponseDto {
  id!: string;
  workspaceId!: string;
  title!: string;
  description?: string | null;
  source!: TaskSource;
  taskType?: string | null;
  category?: string | null;
  labels!: string[];
  status!: TaskStatus;
  priority!: TaskPriority;
  module?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  sourceReference?: unknown;
  @ApiPropertyOptional({ enum: TaskAssigneeType, nullable: true })
  assigneeType?: TaskAssigneeType | null;
  assigneeRef?: string | null;
  createdBy?: string | null;
  parentTaskId?: string | null;
  dependsOnTaskIds!: string[];
  isMilestone!: boolean;
  dueAt?: Date | null;
  startedAt?: Date | null;
  pausedAt?: Date | null;
  completedAt?: Date | null;
  progressPercent!: number;
  effortEstimateHours?: number | null;
  timeSpentMinutes!: number;
  recurrence?: unknown;
  recurrenceParentTaskId?: string | null;
  reminderConfig?: unknown;
  escalation?: unknown;
  metadata: unknown;
  createdAt!: Date;
  updatedAt!: Date;
  archivedAt?: Date | null;
}

export class PaginatedTaskResponseDto {
  data!: TaskResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class TaskChecklistItemResponseDto {
  id!: string;
  taskId!: string;
  text!: string;
  isDone!: boolean;
  order!: number;
  completedAt?: Date | null;
  completedBy?: string | null;
}

export class TaskCommentResponseDto {
  id!: string;
  taskId!: string;
  authorId?: string | null;
  comment!: string;
  createdAt!: Date;
}

export class TaskAttachmentResponseDto {
  id!: string;
  taskId!: string;
  fileId!: string;
  addedBy?: string | null;
  createdAt!: Date;
}

export class TaskWatcherResponseDto {
  id!: string;
  taskId!: string;
  userId!: string;
  createdAt!: Date;
}

export class TaskDashboardResponseDto {
  myTasks!: TaskResponseDto[];
  teamTasks!: TaskResponseDto[];
  overdueTasks!: TaskResponseDto[];
  upcomingTasks!: TaskResponseDto[];
}
