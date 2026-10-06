import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsDateString,
} from 'class-validator';
import { TaskSource, TaskPriority, TaskAssigneeType } from '../interfaces';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskSource)
  @IsOptional()
  source?: TaskSource;

  @IsString()
  @IsOptional()
  taskType?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

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

  @IsObject()
  @IsOptional()
  sourceReference?: Record<string, unknown>;

  @IsEnum(TaskAssigneeType)
  @IsOptional()
  assigneeType?: TaskAssigneeType;

  @IsString()
  @IsOptional()
  assigneeRef?: string;

  @IsString()
  @IsOptional()
  parentTaskId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependsOnTaskIds?: string[];

  @IsBoolean()
  @IsOptional()
  isMilestone?: boolean;

  @IsDateString()
  @IsOptional()
  dueAt?: string;

  @IsNumber()
  @IsOptional()
  effortEstimateHours?: number;

  @IsObject()
  @IsOptional()
  recurrence?: { frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; interval: number; endDate?: string };

  @IsObject()
  @IsOptional()
  reminderConfig?: { beforeDueHours: number[] };

  @IsObject()
  @IsOptional()
  escalation?: { afterOverdueHours: number; escalateToRoleKeys?: string[]; escalateToUserIds?: string[] };

  /** Client-supplied idempotency key — a repeat create with the same key returns the existing task instead of creating a duplicate. */
  @IsString()
  @IsOptional()
  dedupeKey?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
