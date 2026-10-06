import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ActivityModule,
  ActivityAction,
  ActivityStatus,
  ActorType,
  EntityType,
} from '../interfaces';

export class ActorDto {
  @IsEnum(ActorType)
  type!: ActorType;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ChangeReferenceDto {
  @IsOptional()
  @IsObject()
  before?: Record<string, any>;

  @IsOptional()
  @IsObject()
  after?: Record<string, any>;

  @IsOptional()
  @IsString({ each: true })
  changedFields?: string[];
}

export class RecordActivityRequestDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  provider!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsEnum(ActivityModule)
  module!: ActivityModule;

  @IsEnum(ActivityAction)
  action!: ActivityAction;

  @IsEnum(ActivityStatus)
  status!: ActivityStatus;

  @IsEnum(EntityType)
  entityType!: EntityType;

  @IsString()
  entityId!: string;

  @IsOptional()
  @IsString()
  entityName?: string;

  @ValidateNested()
  @Type(() => ActorDto)
  actor!: ActorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChangeReferenceDto)
  changeReference?: ChangeReferenceDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  errorCode?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class SearchActivitiesQueryDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsEnum(ActivityModule)
  module?: ActivityModule;

  @IsOptional()
  @IsEnum(ActivityAction)
  action?: ActivityAction;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsOptional()
  @IsEnum(ActorType)
  actorType?: ActorType;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsEnum(EntityType)
  entityType?: EntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsEnum(['timestamp', 'action', 'status'])
  sortBy?: 'timestamp' | 'action' | 'status';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class GetEntityHistoryQueryDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(EntityType)
  entityType!: EntityType;

  @IsString()
  entityId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class GetTimelineQueryDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class GetStatisticsQueryDto {
  @IsString()
  workspaceId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

export class CreateRetentionPolicyRequestDto {
  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsEnum(ActivityModule)
  module?: ActivityModule;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  retentionDays!: number;

  @Type(() => Boolean)
  archiveBeforeDelete!: boolean;

  @Type(() => Boolean)
  enabled!: boolean;
}

export class ActivityRecordResponseDto {
  id!: string;
  workspaceId!: string;
  provider!: string;
  accountId?: string;
  module!: ActivityModule;
  action!: ActivityAction;
  status!: ActivityStatus;
  entityType!: EntityType;
  entityId!: string;
  entityName?: string;
  actor!: ActorDto;
  changeReference?: ChangeReferenceDto;
  metadata?: Record<string, any>;
  correlationId?: string;
  requestId?: string;
  jobId?: string;
  externalId?: string;
  duration?: number;
  errorCode?: string;
  errorMessage?: string;
  timestamp!: Date;
}

export class EntityHistoryResponseDto {
  entityType!: EntityType;
  entityId!: string;
  entityName?: string;
  activities!: ActivityRecordResponseDto[];
  totalCount!: number;
}

export class ActivityTimelineResponseDto {
  workspaceId!: string;
  provider?: string;
  accountId?: string;
  startDate!: Date;
  endDate!: Date;
  activities!: ActivityRecordResponseDto[];
  totalCount!: number;
}

export class AuditStatisticsResponseDto {
  workspaceId!: string;
  totalActivities!: number;
  successCount!: number;
  failureCount!: number;
  retryCount!: number;
  cancelledCount!: number;
  byModule!: Record<string, number>;
  byAction!: Record<string, number>;
  byStatus!: Record<string, number>;
  byActor!: Record<string, number>;
  topEntities!: Array<{
    entityType: EntityType;
    entityId: string;
    activityCount: number;
  }>;
}

export class SuspiciousActivityResponseDto {
  activityId!: string;
  workspaceId!: string;
  reason!: string;
  severity!: string;
  detectedAt!: Date;
  isResolved!: boolean;
  resolvedAt?: Date;
}

export class RetentionPolicyResponseDto {
  id!: string;
  workspaceId!: string;
  module?: ActivityModule;
  retentionDays!: number;
  archiveBeforeDelete!: boolean;
  enabled!: boolean;
}
