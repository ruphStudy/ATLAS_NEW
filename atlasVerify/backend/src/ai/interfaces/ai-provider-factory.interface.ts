import { AiCapability } from './ai-provider-enums';
import { IAiModelDescriptor } from './ai-model.interface';
import { IAiProviderConfig } from './ai-provider-config.interface';
import { IAiProvider } from './ai-provider.interface';

/**
 * IAiProviderResolutionCriteria
 *
 * Input to dynamic provider/model resolution. `preferredProviderKey` /
 * `preferredModelId` allow callers to pin a choice; otherwise resolution
 * is driven entirely by configuration (use-case routing, defaults,
 * fallback chain).
 */
export interface IAiProviderResolutionCriteria {
  workspaceId: string;
  useCase: string;
  capability: AiCapability;
  preferredProviderKey?: string;
  preferredModelId?: string;
}

/**
 * IAiProviderResolution
 */
export interface IAiProviderResolution {
  provider: IAiProvider;
  model: IAiModelDescriptor;
  config: IAiProviderConfig;
}

/**
 * IAiProviderFactory
 *
 * Resolves a request-shaped criteria object to a concrete, initialized
 * provider + model + config, following configuration-first routing
 * (use-case map, defaults, fallback policy) rather than hardcoded
 * provider-specific branching.
 */
export interface IAiProviderFactory {
  resolve(criteria: IAiProviderResolutionCriteria): Promise<IAiProviderResolution>;
  getConfig(providerKey: string): IAiProviderConfig | undefined;
}
