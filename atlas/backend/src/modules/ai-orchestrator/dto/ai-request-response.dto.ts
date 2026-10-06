import { IAiRequest, IAiResponse, AiRequestStatus, AiExecutionMode, AiRoutingStrategy } from '../interfaces';

export class AiRequestResponseDto implements IAiRequest {
  id!: string;
  workspaceId!: string;
  useCase!: string;
  capability!: string;
  provider?: string | null;
  modelId?: string | null;
  prompt!: string;
  context?: Record<string, unknown> | null;
  parameters!: Record<string, unknown>;
  status!: AiRequestStatus;
  executionMode!: AiExecutionMode;
  priority!: number;
  routingStrategy!: AiRoutingStrategy;
  routingCriteria?: Record<string, unknown> | null;
  maxRetries!: number;
  timeout?: number | null;
  userId?: string | null;
  requestMetadata?: Record<string, unknown> | null;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date | null;
}

export class AiResponseDto implements IAiResponse {
  id!: string;
  requestId!: string;
  provider!: string;
  modelKey!: string;
  content!: string;
  status!: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  cost?: number | null;
  latency?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
}

export class PaginatedAiRequestResponseDto {
  data!: AiRequestResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class ExecutionResultDto {
  requestId!: string;
  content!: string;
  provider!: string;
  modelKey!: string;
  inputTokens!: number;
  outputTokens!: number;
  totalTokens!: number;
  cost!: number;
  latency!: number;
  metadata!: Record<string, unknown>;
}

export class NormalizedResponseDto {
  success!: boolean;
  content?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  usage!: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost!: number;
  latency!: number;
  provider!: string;
  model!: string;
  metadata!: Record<string, unknown>;
}
