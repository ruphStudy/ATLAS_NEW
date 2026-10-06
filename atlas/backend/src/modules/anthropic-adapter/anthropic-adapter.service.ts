import { Injectable, Logger } from '@nestjs/common';
import {
  AnthropicExecuteDto,
  AnthropicHealthCheckDto,
  AnthropicExecutionResponseDto,
  AnthropicHealthCheckResponseDto,
  AnthropicModelInfoResponseDto,
} from './dto';
import {
  IAnthropicRequest,
  IAnthropicResponse,
  IAnthropicError,
  IAnthropicExecutionResult,
  IAnthropicHealthCheckResult,
  IAnthropicModelInfo,
  AnthropicModel,
  AnthropicCapability,
  IAnthropicContentBlock,
} from './interfaces';
import { BusinessRuleException } from '@common/exceptions';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AnthropicAdapterService {
  private readonly logger = new Logger(AnthropicAdapterService.name);
  private readonly ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';
  private readonly ANTHROPIC_API_VERSION = '2023-06-01';
  private readonly DEFAULT_TIMEOUT_MS = 30000;
  private readonly MAX_RETRIES = 3;

  async execute(
    dto: AnthropicExecuteDto,
    apiKey: string,
  ): Promise<AnthropicExecutionResponseDto> {
    const startTime = Date.now();

    try {
      const request = this.buildRequest(dto);

      const response = await this.makeRequest(
        '/messages',
        request,
        apiKey,
        dto.timeout || this.DEFAULT_TIMEOUT_MS,
        dto.idempotencyKey,
      );

      const result = this.mapResponse(
        response,
        dto.model,
        Date.now() - startTime,
      );

      return result as AnthropicExecutionResponseDto;
    } catch (error) {
      this.logger.error(
        `Anthropic execution failed: ${(error as Error).message}`,
      );
      throw this.handleError(error);
    }
  }

  async healthCheck(dto: AnthropicHealthCheckDto): Promise<AnthropicHealthCheckResponseDto> {
    const startTime = Date.now();

    try {
      const testRequest: IAnthropicRequest = {
        model: AnthropicModel.CLAUDE_3_5_HAIKU,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
      };

      await this.makeRequest(
        '/messages',
        testRequest,
        dto.apiKey,
        5000,
      );

      const models = Object.keys(this.MODEL_REGISTRY);

      return {
        available: true,
        latencyMs: Date.now() - startTime,
        modelsAvailable: models,
      };
    } catch (error) {
      return {
        available: false,
        error: (error as Error).message,
        modelsAvailable: [],
      };
    }
  }

  async getModelInfo(modelId: string): Promise<AnthropicModelInfoResponseDto> {
    const modelInfo = this.MODEL_REGISTRY[modelId];

    if (!modelInfo) {
      throw new BusinessRuleException(
        `Unknown Anthropic model: ${modelId}`,
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    return modelInfo as AnthropicModelInfoResponseDto;
  }

  async listModels(): Promise<AnthropicModelInfoResponseDto[]> {
    return Object.values(this.MODEL_REGISTRY) as AnthropicModelInfoResponseDto[];
  }

  private buildRequest(dto: AnthropicExecuteDto): IAnthropicRequest {
    const request: IAnthropicRequest = {
      model: dto.model,
      messages: dto.messages,
      max_tokens: dto.maxTokens,
    };

    if (dto.system) request.system = dto.system;
    if (dto.temperature !== undefined) request.temperature = dto.temperature;
    if (dto.topP !== undefined) request.top_p = dto.topP;
    if (dto.topK !== undefined) request.top_k = dto.topK;
    if (dto.stopSequences !== undefined) request.stop_sequences = dto.stopSequences;
    if (dto.stream !== undefined) request.stream = dto.stream;
    if (dto.tools !== undefined) request.tools = dto.tools;
    if (dto.toolChoice !== undefined) request.tool_choice = dto.toolChoice;

    if (dto.userId) {
      request.metadata = {
        user_id: dto.userId,
      };
    }

    return request;
  }

  private async makeRequest(
    endpoint: string,
    body: IAnthropicRequest,
    apiKey: string,
    timeout: number,
    idempotencyKey?: string,
  ): Promise<IAnthropicResponse> {
    const url = `${this.ANTHROPIC_API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'x-api-key': apiKey,
      'anthropic-version': this.ANTHROPIC_API_VERSION,
      'content-type': 'application/json',
    };

    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const error = data as IAnthropicError;
        throw new Error(
          error.error?.message || `Anthropic API error: ${response.status}`,
        );
      }

      return data as IAnthropicResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private mapResponse(
    response: IAnthropicResponse,
    model: string,
    latencyMs: number,
  ): IAnthropicExecutionResult {
    const usage = response.usage;
    const totalTokens = usage.input_tokens + usage.output_tokens;

    let content = '';
    const toolUses: Array<{
      id: string;
      name: string;
      input: Record<string, any>;
    }> = [];

    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        content += block.text;
      } else if (block.type === 'tool_use' && block.id && block.name && block.input) {
        toolUses.push({
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }

    const modelInfo = this.MODEL_REGISTRY[model];
    const cost = this.calculateCost(
      usage.input_tokens,
      usage.output_tokens,
      modelInfo?.inputPricePer1k || 0,
      modelInfo?.outputPricePer1k || 0,
    );

    return {
      content,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens,
      cost,
      latencyMs,
      model,
      stopReason: response.stop_reason,
      providerId: response.id,
      toolUses: toolUses.length > 0 ? toolUses : undefined,
      metadata: {
        stopSequence: response.stop_sequence,
      },
    };
  }

  private calculateCost(
    inputTokens: number,
    outputTokens: number,
    inputPricePer1k: number,
    outputPricePer1k: number,
  ): number {
    const inputCost = (inputTokens / 1000) * inputPricePer1k;
    const outputCost = (outputTokens / 1000) * outputPricePer1k;
    return inputCost + outputCost;
  }

  private handleError(error: any): Error {
    const message = error.message || 'Anthropic request failed';

    if (message.includes('rate_limit')) {
      throw new BusinessRuleException(
        'Anthropic rate limit exceeded',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (message.includes('timeout') || message.includes('aborted')) {
      throw new BusinessRuleException(
        'Anthropic request timeout',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (message.includes('authentication') || message.includes('invalid_api_key')) {
      throw new BusinessRuleException(
        'Anthropic authentication failed',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (message.includes('overloaded')) {
      throw new BusinessRuleException(
        'Anthropic service overloaded',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    throw new BusinessRuleException(
      message,
      ErrorCode.BUSINESS_RULE_VIOLATION,
    );
  }

  private readonly MODEL_REGISTRY: Record<string, IAnthropicModelInfo> = {
    'claude-3-5-sonnet-20241022': {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      capabilities: [
        AnthropicCapability.TEXT_GENERATION,
        AnthropicCapability.VISION,
        AnthropicCapability.TOOL_CALLING,
        AnthropicCapability.STRUCTURED_OUTPUT,
        AnthropicCapability.STREAMING,
        AnthropicCapability.LONG_CONTEXT,
      ],
      contextWindow: 200000,
      maxOutputTokens: 8192,
      inputPricePer1k: 0.003,
      outputPricePer1k: 0.015,
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
    },
    'claude-3-5-haiku-20241022': {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      capabilities: [
        AnthropicCapability.TEXT_GENERATION,
        AnthropicCapability.VISION,
        AnthropicCapability.TOOL_CALLING,
        AnthropicCapability.STRUCTURED_OUTPUT,
        AnthropicCapability.STREAMING,
        AnthropicCapability.LONG_CONTEXT,
      ],
      contextWindow: 200000,
      maxOutputTokens: 8192,
      inputPricePer1k: 0.001,
      outputPricePer1k: 0.005,
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
    },
    'claude-3-opus-20240229': {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      capabilities: [
        AnthropicCapability.TEXT_GENERATION,
        AnthropicCapability.VISION,
        AnthropicCapability.TOOL_CALLING,
        AnthropicCapability.STRUCTURED_OUTPUT,
        AnthropicCapability.STREAMING,
        AnthropicCapability.LONG_CONTEXT,
      ],
      contextWindow: 200000,
      maxOutputTokens: 4096,
      inputPricePer1k: 0.015,
      outputPricePer1k: 0.075,
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
    },
    'claude-3-sonnet-20240229': {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      capabilities: [
        AnthropicCapability.TEXT_GENERATION,
        AnthropicCapability.VISION,
        AnthropicCapability.TOOL_CALLING,
        AnthropicCapability.STRUCTURED_OUTPUT,
        AnthropicCapability.STREAMING,
        AnthropicCapability.LONG_CONTEXT,
      ],
      contextWindow: 200000,
      maxOutputTokens: 4096,
      inputPricePer1k: 0.003,
      outputPricePer1k: 0.015,
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
    },
    'claude-3-haiku-20240307': {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      capabilities: [
        AnthropicCapability.TEXT_GENERATION,
        AnthropicCapability.VISION,
        AnthropicCapability.TOOL_CALLING,
        AnthropicCapability.STRUCTURED_OUTPUT,
        AnthropicCapability.STREAMING,
        AnthropicCapability.LONG_CONTEXT,
      ],
      contextWindow: 200000,
      maxOutputTokens: 4096,
      inputPricePer1k: 0.00025,
      outputPricePer1k: 0.00125,
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
    },
  };
}
