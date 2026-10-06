import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class CreateWorkflowScheduleDto {
  @IsString()
  workspaceId: string;

  @IsString()
  workflowId: string;

  @IsString()
  cronExpression: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  input?: unknown;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateWorkflowScheduleDto {
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  input?: unknown;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
