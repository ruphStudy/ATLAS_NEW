import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityStatus, ActivityActorType, ActivityOutcome } from '../interfaces';

export class ActivityFilterDto {
  @IsEnum(ActivityStatus)
  @IsOptional()
  status?: ActivityStatus;

  @IsEnum(ActivityActorType)
  @IsOptional()
  actorType?: ActivityActorType;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsString()
  @IsOptional()
  sourceModule?: string;

  @IsString()
  @IsOptional()
  action?: string;

  @IsEnum(ActivityOutcome)
  @IsOptional()
  outcome?: ActivityOutcome;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  pinned?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsIn(['createdAt'])
  @IsOptional()
  sortBy?: 'createdAt';

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
  @Max(100)
  limit?: number;
}
