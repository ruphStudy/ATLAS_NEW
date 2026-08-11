import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export const COST_SUMMARY_GROUP_BY_FIELDS = [
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

export type CostSummaryGroupByField = (typeof COST_SUMMARY_GROUP_BY_FIELDS)[number];

export class CostSummaryFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsIn(COST_SUMMARY_GROUP_BY_FIELDS)
  @IsOptional()
  groupBy?: CostSummaryGroupByField;
}
