/**
 * Request/result shapes for each generic capability. Kept intentionally
 * minimal and provider-agnostic — concrete providers translate to/from
 * their own native request formats outside this module.
 */

export interface ITextGenerationRequest {
  prompt: string;
  systemPrompt?: string;
  maxOutputTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface ITextGenerationResult {
  text: string;
  finishReason?: string;
}

export interface IReasoningRequest {
  prompt: string;
  context?: string;
  maxOutputTokens?: number;
}

export interface IReasoningResult {
  text: string;
  reasoningSteps?: string[];
}

export interface IVisionInputImage {
  url?: string;
  base64?: string;
  mimeType?: string;
}

export interface IVisionRequest {
  prompt?: string;
  images: IVisionInputImage[];
}

export interface IVisionResult {
  text: string;
}

export interface IImageGenerationRequest {
  prompt: string;
  size?: string;
  count?: number;
}

export interface IImageGenerationResultImage {
  url?: string;
  base64?: string;
}

export interface IImageGenerationResult {
  images: IImageGenerationResultImage[];
}

export interface IEmbeddingRequest {
  input: string | string[];
}

export interface IEmbeddingResult {
  embeddings: number[][];
  dimensions: number;
}

export interface IValidationRequest {
  content: string;
  rules?: string[];
}

export interface IValidationResult {
  valid: boolean;
  violations?: string[];
}
