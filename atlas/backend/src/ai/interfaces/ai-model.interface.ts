import { AiCapability } from './ai-provider-enums';

/**
 * IAiModelDescriptor
 *
 * Metadata describing a single model exposed by a provider, used for
 * dynamic model resolution and cost calculation.
 */
export interface IAiModelDescriptor {
  modelId: string;
  displayName?: string;
  capabilities: AiCapability[];
  contextWindowTokens?: number;
  maxOutputTokens?: number;
  inputCostPer1kTokens?: number;
  outputCostPer1kTokens?: number;
  deprecated?: boolean;
}
