import { Injectable, Logger } from '@nestjs/common';
import {
  GeminiExecuteDto,
  GeminiHealthCheckDto,
  GeminiExecutionResponseDto,
  GeminiHealthCheckResponseDto,
  GeminiModelInfoResponseDto,
} from './dto';
import {
  IGeminiRequest,
  IGeminiResponse,
  IGeminiError,
  IGeminiExecutionResult,
  IGeminiHealthCheckResult,
  IGeminiModelInfo,
  GeminiModel,
  GeminiCapability,
  IGeminiPart,
} from './interfaces';
import { BusinessRuleException } from '@common/exceptions';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class GeminiAdapterService {
  private readonly logger = new Logger(GeminiAdapterService.name);
  private readonly GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly DEFAULT_TIMEOUT_MS = 30000;
  private readonly MAX_RETRIES = 3;

  async execute(
    dto: GeminiExecuteDto,
    apiKey: string,
  ): Promise<GeminiExecutionResponseDto> {
    const startTime = Date.now();

    try {
      const request = this.buildRequest(dto);
      const endpoint = this.getEndpoint(dto.model, dto.capability);

      const response = await this.makeRequest(
        endpoint,
        request,
        apiKey,
        dto.timeout || this.DEFAULT_TIMEOUT_MS,
      );

      const result = this.mapResponse(
        response,
        dto.model,
        Date.now() - startTime,
      );

      return result as GeminiExecutionResponseDto;
    } catch (error) {
      this.logger.error(
        `Gemini execution failed: ${(error as Error).message}`,
      );
      throw this.handleError(error);
    }
  }

  async healthCheck(dto: GeminiHealthCheckDto): Promise<GeminiHealthCheckResponseDto> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest(
        '/models',
        null,
        dto.apiKey,
        5000,
      );

      const models = response.models?.map((m: any) => m.name.replace('models/', '')) || [];

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

  async getModelInfo(modelId: string): Promise<GeminiModelInfoResponseDto> {
    const modelInfo = this.MODEL_REGISTRY[modelId];

    if (!modelInfo) {
      throw new BusinessRuleException(
        `Unknown Gemini model: ${modelId}`,
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    return modelInfo as GeminiModelInfoResponseDto;
  }

  async listModels(): Promise<GeminiModelInfoResponseDto[]> {
    return Object.values(this.MODEL_REGISTRY) as GeminiModelInfoResponseDto[];
  }

  private buildRequest(dto: GeminiExecuteDto): IGeminiRequest {
    const request: IGeminiRequest = {
      contents: dto.contents,
    };

    if (dto.systemInstruction) {
      request.systemInstruction = {
        parts: [{ text: dto.systemInstruction }],
      };
    }

    const generationConfig: any = {};
    if (dto.temperature !== undefined) generationConfig.temperature = dto.temperature;
    if (dto.topP !== undefined) generationConfig.topP = dto.topP;
    if (dto.topK !== undefined) generationConfig.topK = dto.topK;
    if (dto.maxOutputTokens !== undefined) generationConfig.maxOutputTokens = dto.maxOutputTokens;
    if (dto.stopSequences !== undefined) generationConfig.stopSequences = dto.stopSequences;
    if (dto.responseMimeType !== undefined) generationConfig.responseMimeType = dto.responseMimeType;
    if (dto.responseSchema !== undefined) generationConfig.responseSchema = dto.responseSchema;

    if (Object.keys(generationConfig).length > 0) {
      request.generationConfig = generationConfig;
    }

    if (dto.tools !== undefined) request.tools = dto.tools;
    if (dto.safetySettings !== undefined) request.safetySettings = dto.safetySettings;

    return request;
  }

  private getEndpoint(model: string, capability: string): string {
    if (capability === 'embeddings') {
      return `/models/${model}:embedContent`;
    }
    return `/models/${model}:generateContent`;
  }

  private async makeRequest(
    endpoint: string,
    body: IGeminiRequest | null,
    apiKey: string,
    timeout: number,
  ): Promise<any> {
    const url = `${this.GEMINI_API_BASE}${endpoint}?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const error = data as IGeminiError;
        throw new Error(
          error.error?.message || `Gemini API error: ${response.status}`,
        );
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private mapResponse(
    response: IGeminiResponse,
    model: string,
    latencyMs: number,
  ): IGeminiExecutionResult {
    const usage = response.usageMetadata;
    const totalTokens = usage.totalTokenCount;

    let content = '';
    const functionCalls: Array<{
      name: string;
      args: Record<string, any>;
    }> = [];

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];

      for (const part of candidate.content.parts) {
        if (part.text) {
          content += part.text;
        } else if (part.functionCall) {
          functionCalls.push({
            name: part.functionCall.name,
            args: part.functionCall.args,
          });
        }
      }
    }

    const modelInfo = this.MODEL_REGISTRY[model];
    const cost = this.calculateCost(
      usage.promptTokenCount,
      usage.candidatesTokenCount,
      modelInfo?.inputPricePer1k || 0,
      modelInfo?.outputPricePer1k || 0,
    );

    const finishReason = response.candidates?.[0]?.finishReason || 'STOP';
    const safetyRatings = response.candidates?.[0]?.safetyRatings;

    return {
      content,
      inputTokens: usage.promptTokenCount,
      outputTokens: usage.candidatesTokenCount,
      totalTokens,
      cost,
      latencyMs,
      model,
      finishReason,
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      safetyRatings,
      metadata: {
        promptFeedback: response.promptFeedback,
        citationMetadata: response.candidates?.[0]?.citationMetadata,
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
    const message = error.message || 'Gemini request failed';

    if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
      throw new BusinessRuleException(
        'Gemini quota exceeded',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (message.includes('timeout') || message.includes('aborted')) {
      throw new BusinessRuleException(
        'Gemini request timeout',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (message.includes('INVALID_ARGUMENT') || message.includes('API key')) {
      throw new BusinessRuleException(
        'Gemini authentication failed',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (message.includes('UNAVAILABLE')) {
      throw new BusinessRuleException(
        'Gemini service unavailable',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (message.includes('SAFETY')) {
      throw new BusinessRuleException(
        'Content blocked by Gemini safety filters',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    throw new BusinessRuleException(
      message,
      ErrorCode.BUSINESS_RULE_VIOLATION,
    );
  }

  private readonly MODEL_REGISTRY: Record<string, IGeminiModelInfo> = {
    'gemini-2.0-flash-exp': {
      id: 'gemini-2.0-flash-exp',
      name: 'Gemini 2.0 Flash Experimental',
      capabilities: [
        GeminiCapability.TEXT_GENERATION,
        GeminiCapability.VISION,
        GeminiCapability.TOOL_CALLING,
        GeminiCapability.STRUCTURED_OUTPUT,
        GeminiCapability.STREAMING,
        GeminiCapability.LONG_CONTEXT,
        GeminiCapability.CODE_EXECUTION,
      ],
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      inputPricePer1k: 0.0,
      outputPricePer1k: 0.0,
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsCodeExecution: true,
    },
    'gemini-1.5-pro': {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      capabilities: [
        GeminiCapability.TEXT_GENERATION,
        GeminiCapability.VISION,
        GeminiCapability.TOOL_CALLING,
        GeminiCapability.STRUCTURED_OUTPUT,
        GeminiCapability.STREAMING,
        GeminiCapability.LONG_CONTEXT,
        GeminiCapability.CODE_EXECUTION,
      ],
      contextWindow: 2000000,
      maxOutputTokens: 8192,
      inputPricePer1k: 0.00125,
      outputPricePer1k: 0.005,
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsCodeExecution: true,
    },
    'gemini-1.5-flash': {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      capabilities: [
        GeminiCapability.TEXT_GENERATION,
        GeminiCapability.VISION,
        GeminiCapability.TOOL_CALLING,
        GeminiCapability.STRUCTURED_OUTPUT,
        GeminiCapability.STREAMING,
        GeminiCapability.LONG_CONTEXT,
        GeminiCapability.CODE_EXECUTION,
      ],
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      inputPricePer1k: 0.000075,
      outputPricePer1k: 0.0003,
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsCodeExecution: true,
    },
    'gemini-1.5-flash-8b': {
      id: 'gemini-1.5-flash-8b',
      name: 'Gemini 1.5 Flash 8B',
      capabilities: [
        GeminiCapability.TEXT_GENERATION,
        GeminiCapability.VISION,
        GeminiCapability.TOOL_CALLING,
        GeminiCapability.STRUCTURED_OUTPUT,
        GeminiCapability.STREAMING,
        GeminiCapability.LONG_CONTEXT,
      ],
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      inputPricePer1k: 0.0000375,
      outputPricePer1k: 0.00015,
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      supportsCodeExecution: false,
    },
    'text-embedding-004': {
      id: 'text-embedding-004',
      name: 'Text Embedding 004',
      capabilities: [GeminiCapability.EMBEDDINGS],
      contextWindow: 2048,
      maxOutputTokens: 0,
      inputPricePer1k: 0.00001,
      outputPricePer1k: 0.0,
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: false,
      supportsCodeExecution: false,
    },
    'embedding-001': {
      id: 'embedding-001',
      name: 'Embedding 001',
      capabilities: [GeminiCapability.EMBEDDINGS],
      contextWindow: 2048,
      maxOutputTokens: 0,
      inputPricePer1k: 0.00001,
      outputPricePer1k: 0.0,
      supportsVision: false,
      supportsTools: false,
      supportsStreaming: false,
      supportsCodeExecution: false,
    },
  };
}
