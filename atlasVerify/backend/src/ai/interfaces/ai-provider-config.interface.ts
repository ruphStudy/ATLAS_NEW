import { AiCapability } from './ai-provider-enums';
import { IAiModelDescriptor } from './ai-model.interface';
import {
  IAiFallbackPolicy,
  IAiRateLimitPolicy,
  IAiRetryPolicy,
  IAiTimeoutPolicy,
} from './ai-policy.interface';

/**
 * IAiProviderCredentials
 *
 * A reference to where credentials live, not the credentials themselves.
 * Resolution is delegated to whichever credential store the deploying
 * business module already uses — this module never reads secrets directly.
 */
export interface IAiProviderCredentials {
  credentialRef: string;
  type?: string;
}

/**
 * IAiProviderConfig
 *
 * Configuration-first description of a provider: what it can do, which
 * models it exposes, and the cross-cutting policies that govern calls to
 * it. Populated by whichever module registers a concrete provider —
 * this foundation module never hardcodes provider-specific values.
 */
export interface IAiProviderConfig {
  providerKey: string;
  displayName: string;
  enabled: boolean;
  capabilities: AiCapability[];
  models: IAiModelDescriptor[];
  defaultModelId?: string;
  credentials?: IAiProviderCredentials;
  /**
   * Decrypted credential field values, populated transiently by the AI
   * Provider Factory ONLY at the moment of `provider.initialize()` so the
   * concrete adapter can authenticate. Never cached, logged, persisted or
   * returned from any API response — a factory clears its local reference
   * immediately after initialization completes.
   */
  resolvedCredentialFields?: Record<string, string>;
  timeoutPolicy?: IAiTimeoutPolicy;
  retryPolicy?: IAiRetryPolicy;
  rateLimitPolicy?: IAiRateLimitPolicy;
  fallbackPolicy?: IAiFallbackPolicy;
  metadata?: Record<string, unknown>;
}
