import { Injectable, Logger } from '@nestjs/common';
import {
  OpenAiExecuteDto,
  OpenAiHealthCheckDto,
  OpenAiExecutionResponseDto,
  OpenAiHealthCheckResponseDto,
  OpenAiModelInfoResponseDto,
} from './dto';
import {
  IOpenAiRequest,
  IOpenAiResponse,
  IOpenAiError,
  IOpenAiExecutionResult,
  IOpenAiHealthCheckResult,
  IOpenAiModelInfo,
  OpenAiModel,
  OpenAiCapability,
  OpenAiExecutionMode,
} from './interfaces';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class OpenaiAdapterService {
  private readonly logger = new Logger(OpenaiAdapterService.name);
  private readonly OPENAI_API_BASE = 'https://api.openai.com/v1';
  private readonly DEFAULT_TIMEOUT_MS = 30000;
  private readonly MAX_RETRIES = 3;

  async execute(
    dto: OpenAiExecuteDto,
    apiKey: string,
  ): Promise<OpenAiExecutionResponseDto> {
    const startTime = Date.now();

    try {
      const request = this.buildRequest(dto);
      const endpoint = this.getEndpoint(dto.capability);

      const response = await this.makeRequest(
        endpoint,
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

      return result as OpenAiExecutionResponseDto;
    } catch (error) {
      this.logger.error(
        `OpenAI execution failed: ${(error as Error).message}`,
      );
      throw this.handleError(error);
    }
  }

  async healthCheck(dto: OpenAiHealthCheckDto): Promise<OpenAiHealthCheckResponseDto> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest(
        '/models',
        null,
        dto.apiKey,
        5000,
      );

      const models = response.data?.map((m: any) => m.id) || [];

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

  async getModelInfo(modelId: string): Promise<OpenAiModelInfoResponseDto> {
    const modelInfo = this.MODEL_REGISTRY[modelId];

    if (!modelInfo) {
      throw new BusinessRuleException(
        `Unknown OpenAI model: ${modelId}`,
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    return modelInfo as OpenAiModelInfoResponseDto;
  }

  async listModels(): Promise<OpenAiModelInfoResponseDto[]> {
    return Object.values(this.MODEL_REGISTRY) as OpenAiModelInfoResponseDto[];
  }

  private buildRequest(dto: OpenAiExecuteDto): IOpenAiRequest {
    const request: IOpenAiRequest = {
      model: dto.model,
    };

    if (dto.messages) {
      request.messages = dto.messages;
    }

    if (dto.prompt) {
      request.prompt = dto.prompt;
    }

    if (dto.input) {
      request.input = dto.input;
    }

    if (dto.temperature !== undefined) request.temperature = dto.temperature;
    if (dto.maxTokens !== undefined) request.max_tokens = dto.maxTokens;
    if (dto.topP !== undefined) request.top_p = dto.topP;
    if (dto.frequencyPenalty !== undefined) request.frequency_penalty = dto.frequencyPenalty;
    if (dto.presencePenalty !== undefined) request.presence_penalty = dto.presencePenalty;
    if (dto.n !== undefined) request.n = dto.n;
    if (dto.stream !== undefined) request.stream = dto.stream;
    if (dto.stop !== undefined) request.stop = dto.stop;
    if (dto.responseFormat !== undefined) request.response_format = dto.responseFormat;
    if (dto.tools !== undefined) request.tools = dto.tools;
    if (dto.toolChoice !== undefined) request.tool_choice = dto.toolChoice;
    if (dto.size !== undefined) request.size = dto.size;
    if (dto.quality !== undefined) request.quality = dto.quality;
    if (dto.style !== undefined) request.style = dto.style;

    return request;
  }

  private getEndpoint(capability: string): string {
    switch (capability) {
      case 'text_generation':
      case 'reasoning':
      case 'vision':
      case 'tool_calling':
        return '/chat/completions';
      case 'image_generation':
        return '/images/generations';
      case 'embeddings':
        return '/embeddings';
      default:
        return '/chat/completions';
    }
  }

  private async makeRequest(
    endpoint: string,
    body: any,
    apiKey: string,
    timeout: number,
    idempotencyKey?: string,
  ): Promise<any> {
    const url = `${this.OPENAI_API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchBody = body ? JSON.stringify(body) : undefined;
      const response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers,
        body: fetchBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const error = data as IOpenAiError;
        throw new Error(
          error.error?.message || `OpenAI API error: ${response.status}`,
        );
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private mapResponse(
    response: IOpenAiResponse,
    model: string,
    latencyMs: number,
  ): IOpenAiExecutionResult {
    const usage = response.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    let content = '';

    if (response.choices && response.choices.length > 0) {
      content = response.choices[0].message?.content || '';
    } else if (response.data && response.data.length > 0) {
      content = JSON.stringify(response.data[0].embedding);
    } else if (response.url) {
      content = response.url;
    }

    const modelInfo = this.MODEL_REGISTRY[model];
    const cost = this.calculateCost(
      usage.prompt_tokens,
      usage.completion_tokens,
      modelInfo?.inputPricePer1k || 0,
      modelInfo?.outputPricePer1k || 0,
    );

    return {
      content,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      cost,
      latencyMs,
      model,
      finishReason: response.choices?.[0]?.finish_reason,
      providerId: response.id,
      metadata: {
        created: response.created,
        object: response.object,
        revisedPrompt: response.revised_prompt,
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
    const message = error.message || 'OpenAI request failed';

    if (message.includes('rate limit')) {
      throw new BusinessRuleException(
        'OpenAI rate limit exceeded',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (message.includes('timeout') || message.includes('aborted')) {
      throw new BusinessRuleException(
        'OpenAI request timeout',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (message.includes('unauthorized') || message.includes('authentication')) {
      throw new BusinessRuleException(
        'OpenAI authentication failed',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    throw new BusinessRuleException(
      message,
      ErrorCode.BUSINESS_RULE_VIOLATION,
    );
  }

  private readonly MODEL_REGISTRY: Record<string, IOpenAiModelInfo> = {
    'gpt-4o': {
      id: 'gpt-4o',
      name: 'GPT-4o',
      capabilities: [
        OpenAiCapability.TEXT_GENERATION,
        OpenAiCapability.VISION,
        OpenAiCapability.TOOL_CALLING,
        OpenAiCapability.STRUCTURED_OUTPUT,
        OpenAiCapability.STREAMING,
      ],
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputPricePer1k: 0.005,
      outputPricePer1k: 0.015,
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsJson: true,
    },
    'gpt-4o-mini': {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      capabilities: [
        OpenAiCapability.TEXT_GENERATION,
        OpenAiCapability.VISION,
        OpenAiCapability.TOOL_CALLING,
        OpenAiCapability.STRUCTURED_OUTPUT,
        OpenAiCapability.STREAMING,
      ],
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputPricePer1k: 0.00015,
      outputPricePer1k: 0.0006,
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsJson: true,
    },
    'gpt-4-turbo': {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      capabilities: [
        OpenAiCapability.TEXT_GENERATION,
        OpenAiCapability.VISION,
        OpenAiCapability.TOOL_CALLING,
        OpenAiCapability.STRUCTURED_OUTPUT,
        OpenAiCapability.STREAMING,
      ],
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputPricePer1k: 0.01,
      outputPricePer1k: 0.03,
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsJson: true,
    },
    'gpt-4': {
      id: 'gpt-4',
      name: 'GPT-4',
      capabilities: [
        OpenAiCapability.TEXT_GENERATION,
        OpenAiCapability.TOOL_CALLING,
        OpenAiCapability.STREAMING,
      ],
      contextWindow: 8192,
      maxOutputTokens: 4096,
      inputPricePer1k: 0.03,
      outputPricePer1k: 0.06,
      supportsVision: false,
      supportsTools: true,
      supportsStreaming: true,
      supportsJson: false,
    },
    'gpt-3.5-turbo': {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      capabilities: [
        OpenAiCapability.TEXT_GENERATION,
        OpenAiCapability.TOOL_CALLING,
        OpenAiCapability.STREAMING,
      ],
      contextWindow: 16385,
      maxOutputTokens: 4096,
      inputPricePer1k: 0.0005,
      outputPricePer1k: 0.0015,
      supportsVision: false,
      supportsTools: true,
      supportsStreaming: true,
      supportsJson: false,
    },
    'o1-preview': {
      id: 'o1-preview',
      name: 'O1 Preview',
      capabilities: [
        OpenAiCapability.TEXT_GENERATION,
        OpenAiCapability.REASONING,
      ],
      contextWindow: 128000,
      maxOutputTokens: 32768,
      inputPricePer1k: 0.015,
      outputPricePer1k: 0.06,
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: false,
      supportsJson: false,
    },
    'o1-mini': {
      id: 'o1-mini',
      name: 'O1 Mini',
      capabilities: [
        OpenAiCapability.TEXT_GENERATION,
        OpenAiCapability.REASONING,
      ],
      contextWindow: 128000,
      maxOutputTokens: 65536,
      inputPricePer1k: 0.003,
      outputPricePer1k: 0.012,
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: false,
      supportsJson: false,
    },
    'dall-e-3': {
      id: 'dall-e-3',
      name: 'DALL-E 3',
      capabilities: [OpenAiCapability.IMAGE_GENERATION],
      contextWindow: 0,
      maxOutputTokens: 0,
      inputPricePer1k: 0,
      outputPricePer1k: 0,
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: false,
      supportsJson: false,
    },
    'dall-e-2': {
      id: 'dall-e-2',
      name: 'DALL-E 2',
      capabilities: [OpenAiCapability.IMAGE_GENERATION],
      contextWindow: 0,
      maxOutputTokens: 0,
      inputPricePer1k: 0,
      outputPricePer1k: 0,
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: false,
      supportsJson: false,
    },
    'text-embedding-3-large': {
      id: 'text-embedding-3-large',
      name: 'Text Embedding 3 Large',
      capabilities: [OpenAiCapability.EMBEDDINGS],
      contextWindow: 8191,
      maxOutputTokens: 0,
      inputPricePer1k: 0.00013,
      outputPricePer1k: 0,
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: false,
      supportsJson: false,
    },
    'text-embedding-3-small': {
      id: 'text-embedding-3-small',
      name: 'Text Embedding 3 Small',
      capabilities: [OpenAiCapability.EMBEDDINGS],
      contextWindow: 8191,
      maxOutputTokens: 0,
      inputPricePer1k: 0.00002,
      outputPricePer1k: 0,
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: false,
      supportsJson: false,
    },
    'text-embedding-ada-002': {
      id: 'text-embedding-ada-002',
      name: 'Text Embedding Ada 002',
      capabilities: [OpenAiCapability.EMBEDDINGS],
      contextWindow: 8191,
      maxOutputTokens: 0,
      inputPricePer1k: 0.0001,
      outputPricePer1k: 0,
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: false,
      supportsJson: false,
    },
  };
}
