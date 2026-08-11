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
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  InsightDomain,
  InsightType,
  InsightPriority,
  InsightStatus,
  InsightStrategy,
  IInsight,
  IInsightHistory,
  IInsightOutcome,
  IInsightEvidence,
  IInsightImpact,
  IRecommendedAction,
  IAffectedEntity,
} from '../interfaces';

export class InsightEvidenceDto implements IInsightEvidence {
  @IsString()
  @IsNotEmpty()
  sourceType: string;

  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @IsString()
  @IsOptional()
  metric?: string;

  value: any;

  @IsNumber()
  @IsOptional()
  threshold?: number;

  @IsNumber()
  @IsOptional()
  deviation?: number;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  timestamp: Date;
}

export class InsightImpactDto implements IInsightImpact {
  @IsNumber()
  @IsOptional()
  revenue?: number;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsNumber()
  @IsOptional()
  margin?: number;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsObject()
  @IsOptional()
  customMetrics?: Record<string, number>;
}

export class RecommendedActionDto implements IRecommendedAction {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  targetModule: string;

  @IsString()
  @IsNotEmpty()
  actionType: string;

  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>;
}

export class AffectedEntityDto implements IAffectedEntity {
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsOptional()
  entityName?: string;
}

export class GenerateInsightDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(InsightDomain)
  @IsNotEmpty()
  domain: InsightDomain;

  @IsEnum(InsightType)
  @IsNotEmpty()
  type: InsightType;

  @IsEnum(InsightStrategy)
  @IsOptional()
  strategy?: InsightStrategy;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sourceIds?: string[];

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;

  @IsString()
  @IsOptional()
  userId?: string;
}

export class BulkGenerateInsightsDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenerateInsightDto)
  @IsNotEmpty()
  requests: GenerateInsightDto[];

  @IsString()
  @IsOptional()
  userId?: string;
}

export class ReviewInsightDto {
  @IsString()
  @IsNotEmpty()
  insightId: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsString()
  @IsOptional()
  reviewedBy?: string;
}

export class AcceptInsightDto {
  @IsString()
  @IsNotEmpty()
  insightId: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dueDate?: Date;

  @IsString()
  @IsOptional()
  acceptedBy?: string;
}

export class DismissInsightDto {
  @IsString()
  @IsNotEmpty()
  insightId: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  dismissedBy?: string;
}

export class ResolveInsightDto {
  @IsString()
  @IsNotEmpty()
  insightId: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  actionReferences?: string[];

  @IsString()
  @IsOptional()
  resolvedBy?: string;
}

export class RecordOutcomeDto {
  @IsString()
  @IsNotEmpty()
  insightId: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @ValidateNested()
  @Type(() => InsightImpactDto)
  @IsOptional()
  actualImpact?: InsightImpactDto;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  actionsTaken: string[];

  @IsString()
  @IsNotEmpty()
  resultSummary: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  successRate?: number;

  @IsString()
  @IsOptional()
  recordedBy?: string;
}

export class ChangePriorityDto {
  @IsString()
  @IsNotEmpty()
  insightId: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(InsightPriority)
  @IsNotEmpty()
  newPriority: InsightPriority;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  changedBy?: string;
}

export class InsightFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(InsightDomain)
  @IsOptional()
  domain?: InsightDomain;

  @IsEnum(InsightType)
  @IsOptional()
  type?: InsightType;

  @IsEnum(InsightPriority)
  @IsOptional()
  priority?: InsightPriority;

  @IsEnum(InsightStatus)
  @IsOptional()
  status?: InsightStatus;

  @IsEnum(InsightStrategy)
  @IsOptional()
  strategy?: InsightStrategy;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}

export class HistoryFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsOptional()
  insightId?: string;

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
}

export class InsightResponseDto implements IInsight {
  id: string;
  workspaceId: string;
  insightKey: string;
  domain: InsightDomain;
  type: InsightType;
  priority: InsightPriority;
  status: InsightStatus;
  strategy: InsightStrategy;
  title: string;
  summary: string;
  evidence: IInsightEvidence[];
  impact?: IInsightImpact;
  confidence: number;
  recommendedActions: IRecommendedAction[];
  affectedEntities: IAffectedEntity[];
  version: number;
  sourceSnapshot?: Record<string, any>;
  validUntil?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  acceptedBy?: string;
  acceptedAt?: Date;
  dismissedBy?: string;
  dismissedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  feedback?: string;
  ownerId?: string;
  dueDate?: Date;
  actionReferences?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class InsightHistoryResponseDto implements IInsightHistory {
  id: string;
  insightId: string;
  workspaceId: string;
  version: number;
  previousStatus: InsightStatus;
  newStatus: InsightStatus;
  previousPriority?: InsightPriority;
  newPriority?: InsightPriority;
  changeReason?: string;
  changedBy?: string;
  changedAt: Date;
}

export class InsightOutcomeResponseDto implements IInsightOutcome {
  id: string;
  insightId: string;
  workspaceId: string;
  actualImpact?: IInsightImpact;
  actionsTaken: string[];
  resultSummary: string;
  successRate?: number;
  recordedBy?: string;
  recordedAt: Date;
}

export class PaginatedInsightResponseDto {
  data: InsightResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaginatedHistoryResponseDto {
  data: InsightHistoryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
