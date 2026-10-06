import { Injectable } from '@nestjs/common';
import { AiProviderConfigurationRepository } from './ai-provider-configuration.repository';
import { AiProviderConfigCache } from './cache/ai-provider-configuration.cache';
import { AiConfigScope, IAiConfigResolutionCriteria, IAiProviderConfigEntity } from './interfaces';

interface IResolutionTier {
  scope: AiConfigScope;
  workspaceId?: string | null;
  useCase?: string;
  modelId?: string;
}

/**
 * AiProviderConfigurationResolver
 *
 * Deterministic configuration precedence: MODEL > USE_CASE > WORKSPACE >
 * GLOBAL. Each tier is tried in order against published, effective
 * configurations; the first match wins. Cache-first — only misses the
 * cache on the very first resolution for a given
 * provider/workspace/use-case/model combination (or after an invalidating
 * event fires).
 */
@Injectable()
export class AiProviderConfigurationResolver {
  constructor(
    private readonly repository: AiProviderConfigurationRepository,
    private readonly cache: AiProviderConfigCache,
  ) {}

  async resolve(criteria: IAiConfigResolutionCriteria): Promise<IAiProviderConfigEntity | null> {
    const cacheKey = AiProviderConfigCache.buildKey(
      criteria.providerKey,
      criteria.workspaceId,
      criteria.useCase,
      criteria.modelId,
    );
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const tiers: IResolutionTier[] = [];
    if (criteria.modelId) {
      tiers.push({ scope: AiConfigScope.MODEL, workspaceId: criteria.workspaceId, modelId: criteria.modelId });
    }
    if (criteria.useCase) {
      tiers.push({ scope: AiConfigScope.USE_CASE, workspaceId: criteria.workspaceId, useCase: criteria.useCase });
    }
    tiers.push({ scope: AiConfigScope.WORKSPACE, workspaceId: criteria.workspaceId });
    tiers.push({ scope: AiConfigScope.GLOBAL, workspaceId: null });

    for (const tier of tiers) {
      const raw = await this.repository.findPublishedByScope({
        providerKey: criteria.providerKey,
        scope: tier.scope,
        workspaceId: tier.workspaceId ?? null,
        useCase: tier.scope === AiConfigScope.USE_CASE ? tier.useCase : undefined,
        modelId: tier.scope === AiConfigScope.MODEL ? tier.modelId : undefined,
      });

      if (raw) {
        const config = raw as unknown as IAiProviderConfigEntity;
        this.cache.set(cacheKey, config);
        return config;
      }
    }

    return null;
  }
}
