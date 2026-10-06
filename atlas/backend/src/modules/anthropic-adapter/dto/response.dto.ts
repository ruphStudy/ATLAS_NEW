import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnthropicCapability } from '../interfaces';

export class AnthropicExecutionResponseDto {
  content!: string;
  inputTokens!: number;
  outputTokens!: number;
  totalTokens!: number;
  cost!: number;
  latencyMs!: number;
  model!: string;
  stopReason!: string | null;
  providerId!: string;
  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        input: { type: 'object' },
      },
    },
  })
  toolUses?: Array<{
    id: string;
    name: string;
    input: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}

export class AnthropicHealthCheckResponseDto {
  available!: boolean;
  latencyMs?: number;
  modelsAvailable?: string[];
  error?: string;
}

export class AnthropicModelInfoResponseDto {
  id!: string;
  name!: string;
  capabilities!: AnthropicCapability[];
  contextWindow!: number;
  maxOutputTokens!: number;
  inputPricePer1k!: number;
  outputPricePer1k!: number;
  supportsVision!: boolean;
  supportsTools!: boolean;
  supportsStreaming!: boolean;
}
