import { IAiRequestContext } from './ai-request-context.interface';
import { IAiResponse } from './ai-response.interface';
import {
  IEmbeddingRequest,
  IEmbeddingResult,
  IImageGenerationRequest,
  IImageGenerationResult,
  IReasoningRequest,
  IReasoningResult,
  ITextGenerationRequest,
  ITextGenerationResult,
  IValidationRequest,
  IValidationResult,
  IVisionRequest,
  IVisionResult,
} from './ai-capability-io.interface';

/**
 * Per-capability contracts. A provider implements only the capability
 * interfaces matching the `AiCapability` values it declares in its
 * `IAiProviderConfig.capabilities` / `IAiProviderMetadata.capabilities`.
 */

export interface ITextGenerationCapability {
  generateText(
    context: IAiRequestContext,
    request: ITextGenerationRequest,
  ): Promise<IAiResponse<ITextGenerationResult>>;
}

export interface IReasoningCapability {
  reason(
    context: IAiRequestContext,
    request: IReasoningRequest,
  ): Promise<IAiResponse<IReasoningResult>>;
}

export interface IVisionCapability {
  analyzeImage(
    context: IAiRequestContext,
    request: IVisionRequest,
  ): Promise<IAiResponse<IVisionResult>>;
}

export interface IImageGenerationCapability {
  generateImage(
    context: IAiRequestContext,
    request: IImageGenerationRequest,
  ): Promise<IAiResponse<IImageGenerationResult>>;
}

export interface IEmbeddingCapability {
  embed(
    context: IAiRequestContext,
    request: IEmbeddingRequest,
  ): Promise<IAiResponse<IEmbeddingResult>>;
}

export interface IValidationCapability {
  validate(
    context: IAiRequestContext,
    request: IValidationRequest,
  ): Promise<IAiResponse<IValidationResult>>;
}
