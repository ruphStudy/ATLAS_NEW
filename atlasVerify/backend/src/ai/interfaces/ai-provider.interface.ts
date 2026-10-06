import { AiCapability } from './ai-provider-enums';
import { IAiModelDescriptor } from './ai-model.interface';
import { IAiProviderConfig } from './ai-provider-config.interface';
import { IAiProviderHealth } from './ai-provider-health.interface';
import {
  IEmbeddingCapability,
  IImageGenerationCapability,
  IReasoningCapability,
  ITextGenerationCapability,
  IValidationCapability,
  IVisionCapability,
} from './ai-capability.interface';

/**
 * IAiProviderMetadata
 *
 * Static description of what a provider is and what it can do, independent
 * of any single workspace's configuration of it.
 */
export interface IAiProviderMetadata {
  providerKey: string;
  displayName: string;
  version: string;
  capabilities: AiCapability[];
  supportedModels: IAiModelDescriptor[];
}

/**
 * IAiProvider
 *
 * The generic contract every AI provider implementation depends on.
 * Business modules and this foundation module interact only through this
 * interface — never through a concrete provider class. Capability members
 * are optional: a provider only implements the ones matching the
 * capabilities it declares in `getMetadata().capabilities`.
 */
export interface IAiProvider {
  getMetadata(): IAiProviderMetadata;
  initialize(config: IAiProviderConfig): Promise<void>;
  getHealth(): Promise<IAiProviderHealth>;
  supportsCapability(capability: AiCapability): boolean;
  resolveModel(modelId?: string): IAiModelDescriptor;

  textGeneration?: ITextGenerationCapability;
  reasoning?: IReasoningCapability;
  vision?: IVisionCapability;
  imageGeneration?: IImageGenerationCapability;
  embedding?: IEmbeddingCapability;
  validation?: IValidationCapability;
}
