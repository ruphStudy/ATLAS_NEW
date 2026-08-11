import { AiCapability, IAiProvider } from '../../../ai/interfaces';

/**
 * IAiProviderFactoryResolutionCriteria
 *
 * Input to full instance resolution: which workspace, what capability
 * (and optionally use case/model/region) is needed, and an optional
 * caller override (`preferredProviderKey`) or credential scoping
 * (`accountId`).
 */
export interface IAiProviderFactoryResolutionCriteria {
  workspaceId: string;
  capability: AiCapability;
  useCase?: string;
  modelId?: string;
  region?: string;
  accountId?: string;
  preferredProviderKey?: string;
}

/**
 * ICachedAiProviderInstance
 *
 * A cached, already-initialized `IAiProvider` instance plus the version
 * fingerprint of everything it was built from (registry entry, resolved
 * configuration, resolved credential). Any change to one of those bumps
 * its fingerprint and the corresponding mutation event evicts this entry.
 */
export interface ICachedAiProviderInstance {
  instance: IAiProvider;
  providerKey: string;
  workspaceId: string;
  registryUpdatedAtMs: number;
  configVersion?: number;
  credentialVersion?: number;
  cachedAt: Date;
  ttlMs: number;
}

export interface IAiProviderFactoryResolution {
  instance: IAiProvider;
  providerKey: string;
  modelId?: string;
  fromCache: boolean;
}
