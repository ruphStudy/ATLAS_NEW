import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export const USAGE_SUMMARY_GROUP_BY_FIELDS = [
  'providerKey',
  'modelKey',
  'capability',
  'feature',
  'projectId',
  'userId',
  'agentId',
  'workflowId',
  'jobId',
] as const;

export type UsageSummaryGroupByField = (typeof USAGE_SUMMARY_GROUP_BY_FIELDS)[number];

export class UsageSummaryFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsIn(USAGE_SUMMARY_GROUP_BY_FIELDS)
  @IsOptional()
  groupBy?: UsageSummaryGroupByField;
}

export const USAGE_BUCKET_GRANULARITIES = ['HOUR', 'DAY', 'MONTH'] as const;

export class UsageBreakdownFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsIn(USAGE_BUCKET_GRANULARITIES)
  bucket!: 'HOUR' | 'DAY' | 'MONTH';

  @IsString()
  @IsNotEmpty()
  startDate!: string;

  @IsString()
  @IsNotEmpty()
  endDate!: string;
}
