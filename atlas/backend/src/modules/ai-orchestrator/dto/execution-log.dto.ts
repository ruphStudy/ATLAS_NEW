import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ExecutionLogFilterDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  modelKey?: string;

  @IsOptional()
  @IsString()
  capability?: string;

  @IsOptional()
  @IsString()
  useCase?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class ExecutionLogResponseDto {
  id!: string;
  requestId!: string;
  workspaceId!: string;
  provider!: string;
  modelKey!: string;
  capability!: string;
  useCase!: string;
  status!: string;
  startTime!: Date;
  endTime?: Date | null;
  latency?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  cost?: number | null;
  attemptNumber!: number;
  fallbackUsed!: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  routingStrategy?: string | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
}

export class PaginatedExecutionLogResponseDto {
  data!: ExecutionLogResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
