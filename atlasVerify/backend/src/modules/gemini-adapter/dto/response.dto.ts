import { GeminiCapability } from '../interfaces';

export class GeminiExecutionResponseDto {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  model: string;
  finishReason: string;
  functionCalls?: Array<{
    name: string;
    args: Record<string, any>;
  }>;
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
  metadata?: Record<string, any>;
}

export class GeminiHealthCheckResponseDto {
  available: boolean;
  latencyMs?: number;
  modelsAvailable?: string[];
  error?: string;
}

export class GeminiModelInfoResponseDto {
  id: string;
  name: string;
  capabilities: GeminiCapability[];
  contextWindow: number;
  maxOutputTokens: number;
  inputPricePer1k: number;
  outputPricePer1k: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsCodeExecution: boolean;
}
