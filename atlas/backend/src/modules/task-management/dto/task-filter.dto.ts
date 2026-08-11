import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus, TaskPriority, TaskAssigneeType } from '../interfaces';
import { TASK_SORT_FIELDS } from '../constants';

export class TaskFilterDto {
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  taskType?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  parentTaskId?: string;

  @IsEnum(TaskAssigneeType)
  @IsOptional()
  assigneeType?: TaskAssigneeType;

  @IsString()
  @IsOptional()
  assigneeRef?: string;

  @IsString()
  @IsOptional()
  search?: string;

  /** Dashboard widget: tasks currently assigned to the caller (directly, or via a role/team they hold). */
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  myTasks?: boolean;

  /** Dashboard widget: past-due, still-open tasks. */
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  overdue?: boolean;

  /** Dashboard widget: open tasks due within the next 7 days. */
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  upcoming?: boolean;

  @IsIn(TASK_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof TASK_SORT_FIELDS)[number];

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(200)
  limit?: number;
}
