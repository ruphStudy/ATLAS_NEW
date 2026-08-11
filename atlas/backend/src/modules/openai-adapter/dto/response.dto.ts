import {
  OpenAiModel,
  OpenAiCapability,
  IOpenAiExecutionResult,
  IOpenAiHealthCheckResult,
  IOpenAiModelInfo,
} from '../interfaces';

export class OpenAiExecutionResponseDto implements IOpenAiExecutionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  model: string;
  finishReason?: string;
  providerId: string;
  metadata: Record<string, unknown>;
}

export class OpenAiHealthCheckResponseDto implements IOpenAiHealthCheckResult {
  available: boolean;
  latencyMs?: number;
  error?: string;
  modelsAvailable: string[];
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
}

export class OpenAiModelInfoResponseDto implements IOpenAiModelInfo {
  id: string;
  name: string;
  capabilities: OpenAiCapability[];
  contextWindow: number;
  maxOutputTokens: number;
  inputPricePer1k: number;
  outputPricePer1k: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsJson: boolean;
}
