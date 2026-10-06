import { AiCapability } from './ai-provider-enums';
import { IAiProvider, IAiProviderMetadata } from './ai-provider.interface';

/**
 * IAiProviderRegistry
 *
 * Holds registered provider instances, keyed by provider key. Registration
 * is performed by whichever module supplies a concrete `IAiProvider`
 * implementation — this foundation module never registers providers
 * itself.
 */
export interface IAiProviderRegistry {
  register(providerKey: string, provider: IAiProvider): void;
  unregister(providerKey: string): void;
  get(providerKey: string): IAiProvider;
  has(providerKey: string): boolean;
  list(): IAiProviderMetadata[];
  listByCapability(capability: AiCapability): IAiProviderMetadata[];
  clear(): void;
}
