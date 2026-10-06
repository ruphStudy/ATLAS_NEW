import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsNumber, IsObject, IsDateString } from 'class-validator';
import { TaskPriority } from '../interfaces';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

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

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
