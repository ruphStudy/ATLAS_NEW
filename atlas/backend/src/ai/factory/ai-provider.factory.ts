import { Injectable, Logger } from '@nestjs/common';
import {
  AiProviderEventType,
  IAiProviderConfig,
  IAiProviderFactory,
  IAiProviderResolution,
  IAiProviderResolutionCriteria,
} from '../interfaces';
import {
  AiProviderAllFallbacksExhaustedException,
  AiProviderCapabilityUnsupportedException,
  AiProviderConfigInvalidException,
  AiProviderDisabledException,
  AiProviderNotConfiguredException,
  AiProviderNotFoundException,
} from '../exceptions/ai-provider.exceptions';
import { AiProviderRegistry } from '../registry/ai-provider.registry';
import { AiProviderConfigStore } from '../config/ai-provider-config.store';
import { AiProviderEventEmitter } from '../events/ai-provider-event.emitter';
import { AI_PROVIDER_DEFAULTS } from '../constants';

/**
 * AiProviderFactory
 *
 * Resolves resolution criteria (workspace + use case + capability) to a
 * concrete provider/model/config, driven by configuration rather than
 * hardcoded provider branching:
 *   1. `preferredProviderKey` (explicit caller override), else
 *   2. `AI_PROVIDER_USE_CASE_MAP[useCase]` (configured routing), else
 *   3. the configured default provider.
 * Falls through `fallbackPolicy.fallbackProviderKeys` when the resolved
 * provider is disabled, unconfigured, or lacks the requested capability.
 */
@Injectable()
export class AiProviderFactory implements IAiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);

  constructor(
    private readonly registry: AiProviderRegistry,
    private readonly configStore: AiProviderConfigStore,
    private readonly eventEmitter: AiProviderEventEmitter,
  ) {}

  async resolve(criteria: IAiProviderResolutionCriteria): Promise<IAiProviderResolution> {
    const startingProviderKey =
      criteria.preferredProviderKey ?? this.configStore.resolveProviderKeyForUseCase(criteria.useCase);

    if (!startingProviderKey) {
      throw new AiProviderConfigInvalidException(
        `No AI provider is configured for use case '${criteria.useCase}'`,
      );
    }

    const attempted: string[] = [];
    let candidateKey: string | undefined = startingProviderKey;
    let lastOutcome: IResolutionOutcome | undefined;

    while (candidateKey && attempted.length <= AI_PROVIDER_DEFAULTS.MAX_FALLBACK_HOPS) {
      if (attempted.includes(candidateKey)) {
        break;
      }
      attempted.push(candidateKey);

      const outcome = this.tryResolveCandidate(candidateKey, criteria);
      if (outcome.resolution) {
        return outcome.resolution;
      }
      lastOutcome = outcome;

      const nextCandidate = outcome.config?.fallbackPolicy?.fallbackProviderKeys.find(
        (key) => !attempted.includes(key),
      );

      if (nextCandidate) {
        this.eventEmitter.emit({
          type: AiProviderEventType.PROVIDER_FALLBACK_TRIGGERED,
          providerKey: candidateKey,
          workspaceId: criteria.workspaceId,
          occurredAt: new Date(),
          payload: { reason: outcome.reason, nextCandidate },
        });
        this.logger.warn(
          `AI provider '${candidateKey}' unsuitable (${outcome.reason}) — falling back to '${nextCandidate}'`,
        );
      }

      candidateKey = nextCandidate;
    }

    if (attempted.length > 1) {
      throw new AiProviderAllFallbacksExhaustedException(attempted);
    }

    const failedKey = attempted[attempted.length - 1] ?? startingProviderKey;
    switch (lastOutcome?.reasonCode) {
      case 'DISABLED':
        throw new AiProviderDisabledException(failedKey);
      case 'CAPABILITY_UNSUPPORTED':
        throw new AiProviderCapabilityUnsupportedException(failedKey, criteria.capability);
      case 'NOT_REGISTERED':
        throw new AiProviderNotFoundException(failedKey);
      case 'NOT_CONFIGURED':
      default:
        throw new AiProviderNotConfiguredException(failedKey);
    }
  }

  getConfig(providerKey: string): IAiProviderConfig | undefined {
    return this.configStore.getProviderConfig(providerKey);
  }

  private tryResolveCandidate(
    providerKey: string,
    criteria: IAiProviderResolutionCriteria,
  ): IResolutionOutcome {
    const config = this.configStore.getProviderConfig(providerKey);
    if (!config) {
      return { reasonCode: 'NOT_CONFIGURED', reason: 'not configured' };
    }
    if (!config.enabled) {
      return { config, reasonCode: 'DISABLED', reason: 'disabled' };
    }
    if (!config.capabilities.includes(criteria.capability)) {
      return {
        config,
        reasonCode: 'CAPABILITY_UNSUPPORTED',
        reason: `capability '${criteria.capability}' unsupported`,
      };
    }
    if (!this.registry.has(providerKey)) {
      return { config, reasonCode: 'NOT_REGISTERED', reason: 'not registered' };
    }

    const provider = this.registry.get(providerKey);
    if (!provider.supportsCapability(criteria.capability)) {
      return {
        config,
        reasonCode: 'CAPABILITY_UNSUPPORTED',
        reason: `capability '${criteria.capability}' unsupported`,
      };
    }

    const model = provider.resolveModel(criteria.preferredModelId ?? config.defaultModelId);

    return { resolution: { provider, model, config } };
  }
}

type ResolutionFailureReasonCode =
  | 'NOT_CONFIGURED'
  | 'DISABLED'
  | 'CAPABILITY_UNSUPPORTED'
  | 'NOT_REGISTERED';

interface IResolutionOutcome {
  resolution?: IAiProviderResolution;
  config?: IAiProviderConfig;
  reasonCode?: ResolutionFailureReasonCode;
  reason?: string;
}
