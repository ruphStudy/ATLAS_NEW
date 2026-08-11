import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ActivityActorType, ActivityOutcome } from '../interfaces';

export class RecordActivityDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(ActivityActorType)
  actorType: ActivityActorType;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsString()
  @IsOptional()
  actorName?: string;

  /** Free-form, dot-namespaced, source-module-defined (e.g. 'order.created') — not a fixed enum, config-driven like every other module's own *Event vocabulary. */
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsString()
  @IsNotEmpty()
  sourceModule: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsEnum(ActivityOutcome)
  @IsOptional()
  outcome?: ActivityOutcome;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsString()
  @IsOptional()
  requestId?: string;

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsString()
  @IsOptional()
  workflowId?: string;

  @IsString()
  @IsOptional()
  externalRef?: string;

  @IsString()
  @IsOptional()
  timelineId?: string;

  /** Omit for a workspace-wide activity; set to personalize into a specific user's feed. */
  @IsString()
  @IsOptional()
  recipientUserId?: string;

  @IsString()
  @IsOptional()
  dedupeKey?: string;

  /** Safe, non-sensitive metadata only — never secrets/tokens/credentials. */
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
