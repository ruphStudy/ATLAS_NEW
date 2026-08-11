import { Injectable } from '@nestjs/common';
import { AiProviderRegistryRepository } from './ai-provider-registry.repository';
import { AiProviderRegistryCache } from './cache/ai-provider-registry.cache';
import { AI_PROVIDER_REGISTRY_CONSTANTS } from './constants';
import {
  IAiProviderRegistryEntity,
  IAiProviderRegistryResolutionCriteria,
  ProviderRegistrationStatus,
} from './interfaces';

/**
 * AiProviderRegistryResolver
 *
 * Discovery + resolution: finds the best-matching ACTIVE registry entry
 * for a workspace/capability/model/region, preferring workspace-specific
 * entries over global ones, then `isDefault`/`priority` ordering, then
 * falling through `fallbackOrder` when nothing matches directly.
 */
@Injectable()
export class AiProviderRegistryResolver {
  constructor(
    private readonly repository: AiProviderRegistryRepository,
    private readonly cache: AiProviderRegistryCache,
  ) {}

  async resolve(criteria: IAiProviderRegistryResolutionCriteria): Promise<IAiProviderRegistryEntity | null> {
    const cacheKey = AiProviderRegistryCache.buildKey(
      criteria.workspaceId,
      criteria.capability,
      criteria.modelId,
      criteria.region,
      criteria.preferredProviderKey,
    );
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    let resolved: IAiProviderRegistryEntity | null = null;

    if (criteria.preferredProviderKey) {
      const raw = await this.repository.findByProviderKey(criteria.preferredProviderKey, criteria.workspaceId);
      if (raw && this.matches(raw, criteria, true)) {
        resolved = raw as unknown as IAiProviderRegistryEntity;
      }
    }

    if (!resolved) {
      const candidates = await this.repository.findActiveCandidates(criteria.workspaceId);
      const match = candidates.find((row) => this.matches(row, criteria, false));
      if (match) {
        resolved = match as unknown as IAiProviderRegistryEntity;
      }
    }

    if (!resolved) {
      resolved = await this.resolveViaFallbackChain(criteria);
    }

    if (resolved) {
      this.cache.set(cacheKey, resolved);
    }
    return resolved;
  }

  private async resolveViaFallbackChain(
    criteria: IAiProviderRegistryResolutionCriteria,
  ): Promise<IAiProviderRegistryEntity | null> {
    const candidates = await this.repository.findActiveCandidates(criteria.workspaceId);
    const anchor = candidates.find((row) => this.matchesCapabilityOnly(row, criteria));
    if (!anchor) return null;

    const fallbackOrder = ((anchor['fallbackOrder'] as string[] | undefined) ?? []).slice(
      0,
      AI_PROVIDER_REGISTRY_CONSTANTS.MAX_FALLBACK_CHAIN_LENGTH,
    );

    for (const fallbackKey of fallbackOrder) {
      const raw = await this.repository.findByProviderKey(fallbackKey, criteria.workspaceId);
      if (raw && this.matches(raw, criteria, false)) {
        return raw as unknown as IAiProviderRegistryEntity;
      }
    }

    return null;
  }

  private matches(
    row: Record<string, unknown>,
    criteria: IAiProviderRegistryResolutionCriteria,
    requireExactProviderKey: boolean,
  ): boolean {
    if (requireExactProviderKey && row['providerKey'] !== criteria.preferredProviderKey) return false;
    if ((row['status'] as ProviderRegistrationStatus) !== ProviderRegistrationStatus.ACTIVE) return false;
    return this.matchesCapabilityModelRegion(row, criteria);
  }

  private matchesCapabilityOnly(row: Record<string, unknown>, criteria: IAiProviderRegistryResolutionCriteria): boolean {
    if ((row['status'] as ProviderRegistrationStatus) !== ProviderRegistrationStatus.ACTIVE) return false;
    if (!criteria.capability) return true;
    const capabilities = (row['capabilities'] as string[] | undefined) ?? [];
    return capabilities.includes(criteria.capability);
  }

  private matchesCapabilityModelRegion(
    row: Record<string, unknown>,
    criteria: IAiProviderRegistryResolutionCriteria,
  ): boolean {
    if (criteria.capability) {
      const capabilities = (row['capabilities'] as string[] | undefined) ?? [];
      if (!capabilities.includes(criteria.capability)) return false;
    }
    if (criteria.modelId) {
      const models = (row['supportedModels'] as Array<{ modelId?: string }> | undefined) ?? [];
      if (!models.some((m) => m.modelId === criteria.modelId)) return false;
    }
    if (criteria.region) {
      const regions = (row['regions'] as string[] | undefined) ?? [];
      if (!regions.includes(criteria.region)) return false;
    }
    return true;
  }
}
