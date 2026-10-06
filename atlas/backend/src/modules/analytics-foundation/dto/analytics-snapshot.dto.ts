import {
  IsString,
  IsEnum,
  IsDate,
  IsObject,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AnalyticsEntityType,
  AnalyticsAggregation,
} from '../interfaces';

export class CreateAnalyticsSnapshotDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  snapshotKey!: string;

  @IsEnum(AnalyticsEntityType)
  entityType!: AnalyticsEntityType;

  @IsEnum(AnalyticsAggregation)
  period!: AnalyticsAggregation;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsObject()
  data!: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AnalyticsSnapshotResponseDto {
  id!: string;
  workspaceId!: string;
  snapshotKey!: string;
  entityType!: AnalyticsEntityType;
  period!: AnalyticsAggregation;
  startDate!: Date;
  endDate!: Date;
  data!: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt!: Date;
}
