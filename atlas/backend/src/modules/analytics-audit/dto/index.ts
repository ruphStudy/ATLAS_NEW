import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDate,
  IsObject,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AnalyticsAuditModule,
  AnalyticsAuditAction,
  AuditActor,
  AuditOutcome,
  IAnalyticsAuditRecord,
  IAuditMetadata,
  IAuditInputOutput,
  IAuditTimeline,
  ISuspiciousActivity,
} from '../interfaces';

export class AuditMetadataDto implements IAuditMetadata {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  metrics?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dimensions?: string[];

  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @IsObject()
  @IsOptional()
  dateRange?: {
    start: Date;
    end: Date;
  };

  @IsString()
  @IsOptional()
  reportId?: string;

  @IsString()
  @IsOptional()
  forecastId?: string;

  @IsString()
  @IsOptional()
  insightId?: string;

  @IsString()
  @IsOptional()
  aggregationId?: string;

  @IsString()
  @IsOptional()
  kpiId?: string;

  @IsString()
  @IsOptional()
  dashboardId?: string;

  @IsString()
  @IsOptional()
  widgetId?: string;

  @IsString()
  @IsOptional()
  exportFormat?: string;

  @IsString()
  @IsOptional()
  cacheKey?: string;
}

export class AuditInputOutputDto implements IAuditInputOutput {
  @IsNumber()
  @IsOptional()
  inputSize?: number;

  @IsNumber()
  @IsOptional()
  outputSize?: number;

  @IsNumber()
  @IsOptional()
  rowCount?: number;

  @IsNumber()
  @IsOptional()
  recordCount?: number;

  @IsString()
  @IsOptional()
  errorMessage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  warnings?: string[];
}

export class RecordAuditDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(AnalyticsAuditModule)
  @IsNotEmpty()
  module!: AnalyticsAuditModule;

  @IsEnum(AnalyticsAuditAction)
  @IsNotEmpty()
  action!: AnalyticsAuditAction;

  @IsEnum(AuditActor)
  @IsNotEmpty()
  actor!: AuditActor;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsEnum(AuditOutcome)
  @IsNotEmpty()
  outcome!: AuditOutcome;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsString()
  @IsOptional()
  parentAuditId?: string;

  @ValidateNested()
  @Type(() => AuditMetadataDto)
  @IsOptional()
  metadata?: AuditMetadataDto;

  @ValidateNested()
  @Type(() => AuditInputOutputDto)
  @IsOptional()
  inputOutput?: AuditInputOutputDto;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}

export class BulkRecordAuditDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordAuditDto)
  @IsNotEmpty()
  records!: RecordAuditDto[];
}

export class AuditFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(AnalyticsAuditModule)
  @IsOptional()
  module?: AnalyticsAuditModule;

  @IsEnum(AnalyticsAuditAction)
  @IsOptional()
  action?: AnalyticsAuditAction;

  @IsEnum(AuditActor)
  @IsOptional()
  actor?: AuditActor;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsEnum(AuditOutcome)
  @IsOptional()
  outcome?: AuditOutcome;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class EntityTimelineDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}

export class ArchiveOldRecordsDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  beforeDate!: Date;

  @IsBoolean()
  @IsOptional()
  dryRun?: boolean;
}

export class AnalyticsAuditRecordResponseDto implements IAnalyticsAuditRecord {
  id!: string;
  workspaceId!: string;
  module!: AnalyticsAuditModule;
  action!: AnalyticsAuditAction;
  actor!: AuditActor;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  timestamp!: Date;
  outcome!: AuditOutcome;
  duration?: number;
  correlationId?: string;
  parentAuditId?: string;
  metadata?: IAuditMetadata;
  inputOutput?: IAuditInputOutput;
  status?: string;
  ipAddress?: string;
  userAgent?: string;
  immutable!: boolean;
  createdAt!: Date;
}

export class AuditTimelineResponseDto implements IAuditTimeline {
  entityType!: string;
  entityId!: string;
  records!: IAnalyticsAuditRecord[];
  totalEvents!: number;
  firstEvent!: Date;
  lastEvent!: Date;
}

export class SuspiciousActivityResponseDto implements ISuspiciousActivity {
  id!: string;
  workspaceId!: string;
  actorId?: string;
  pattern!: string;
  severity!: 'low' | 'medium' | 'high' | 'critical';
  detectedAt!: Date;
  auditRecordIds!: string[];
  description!: string;
  metadata?: Record<string, any>;
}

export class PaginatedAuditRecordResponseDto {
  data!: AnalyticsAuditRecordResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class AuditStatisticsDto {
  workspaceId!: string;
  totalRecords!: number;
  recordsByModule!: Record<string, number>;
  recordsByAction!: Record<string, number>;
  recordsByOutcome!: Record<string, number>;
  averageDuration?: number;
  suspiciousActivityCount!: number;
}
