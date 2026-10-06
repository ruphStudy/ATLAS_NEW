import { Injectable, Logger } from '@nestjs/common';
import { AtlasException } from '../../common/exceptions/atlas.exception';
import {
  AiProviderEventType,
  AiProviderHealthStatus,
  IAiProvider,
  IAiProviderConfig,
} from '../../ai/interfaces';
import { AiProviderRegistry as AiFoundationProviderRegistry } from '../../ai/registry/ai-provider.registry';
import { AiProviderHealthService } from '../../ai/health/ai-provider-health.service';
import { AiProviderEventEmitter } from '../../ai/events/ai-provider-event.emitter';
import { AiProviderRegistryResolver } from '../ai-provider-registry/ai-provider-registry.resolver';
import { IAiProviderRegistryEntity, ProviderRegistrationStatus } from '../ai-provider-registry/interfaces';
import { AiProviderConfigurationResolver } from '../ai-provider-configuration/ai-provider-configuration.resolver';
import { AiProviderCredentialResolver } from '../ai-provider-credentials/ai-provider-credential.resolver';
import { CredentialStatus } from '../ai-provider-credentials/interfaces';
import { AiProviderFactoryInstanceCache } from './cache/ai-provider-factory-instance.cache';
import { AiProviderFactoryAudit } from './audit/ai-provider-factory.audit';
import { AI_PROVIDER_FACTORY_CONSTANTS } from './constants';
import { IAiProviderFactoryResolution, IAiProviderFactoryResolutionCriteria } from './interfaces';
import {
  AiProviderFactoryAllFallbacksExhaustedException,
  AiProviderFactoryCapabilityUnsupportedException,
  AiProviderFactoryCredentialUnavailableException,
  AiProviderFactoryInitializationFailedException,
  AiProviderFactoryNoMatchException,
  AiProviderFactoryProviderNotRegisteredException,
  AiProviderFactoryUnhealthyException,
} from './exceptions/ai-provider-factory.exceptions';

interface IInitializationOutcome {
  provider: IAiProvider;
  configVersion?: number;
  credentialVersion?: number;
}

/**
 * AiProviderFactoryService
 *
 * Orchestrates the full path from "I need capability X for workspace Y"
 * to a live, initialized `IAiProvider` instance:
 *   1. Registry resolver picks WHICH provider (priority/default/fallback,
 *      capability/model/region/status).
 *   2. Configuration resolver loads its effective settings (timeout,
 *      retry, rate-limit, queue, safety, logging, model parameters).
 *   3. Credential resolver loads (and decrypts, transiently) its active
 *      credential.
 *   4. The Foundation's live `AiProviderRegistry` supplies the concrete
 *      `IAiProvider` instance, which is health-checked and initialized.
 * Instances are cached (version-aware, event-invalidated) and concurrent
 * resolutions for the same criteria share one in-flight initialization.
 */
@Injectable()
export class AiProviderFactoryService {
  private readonly logger = new Logger(AiProviderFactoryService.name);
  private readonly inFlight = new Map<string, Promise<IAiProviderFactoryResolution>>();

  constructor(
    private readonly foundationRegistry: AiFoundationProviderRegistry,
    private readonly healthService: AiProviderHealthService,
    private readonly eventEmitter: AiProviderEventEmitter,
    private readonly registryResolver: AiProviderRegistryResolver,
    private readonly configResolver: AiProviderConfigurationResolver,
    private readonly credentialResolver: AiProviderCredentialResolver,
    private readonly cache: AiProviderFactoryInstanceCache,
    private readonly audit: AiProviderFactoryAudit,
  ) {}

  async resolve(criteria: IAiProviderFactoryResolutionCriteria): Promise<IAiProviderFactoryResolution> {
    const cacheKey = AiProviderFactoryInstanceCache.buildKey(
      criteria.workspaceId,
      criteria.capability,
      criteria.useCase,
      criteria.modelId,
      criteria.region,
      criteria.preferredProviderKey,
    );

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { instance: cached.instance, providerKey: cached.providerKey, modelId: criteria.modelId, fromCache: true };
    }

    const existingInFlight = this.inFlight.get(cacheKey);
    if (existingInFlight) {
      return existingInFlight;
    }

    const promise = this.doResolve(criteria, cacheKey).finally(() => this.inFlight.delete(cacheKey));
    this.inFlight.set(cacheKey, promise);
    return promise;
  }

  invalidateCache(providerKey?: string, workspaceId?: string): void {
    if (providerKey) {
      this.cache.invalidateByProvider(providerKey);
    } else if (workspaceId) {
      this.cache.invalidateByWorkspace(workspaceId);
    } else {
      this.cache.flush();
    }
  }

  private async doResolve(
    criteria: IAiProviderFactoryResolutionCriteria,
    cacheKey: string,
  ): Promise<IAiProviderFactoryResolution> {
    const attempted: string[] = [];
    let currentCriteria = criteria;

    for (let hop = 0; hop <= AI_PROVIDER_FACTORY_CONSTANTS.MAX_FALLBACK_HOPS; hop++) {
      const registryEntry = await this.registryResolver.resolve({
        workspaceId: currentCriteria.workspaceId,
        capability: currentCriteria.capability,
        modelId: currentCriteria.modelId,
        region: currentCriteria.region,
        preferredProviderKey: currentCriteria.preferredProviderKey,
      });

      if (!registryEntry) {
        throw new AiProviderFactoryNoMatchException(this.describeCriteria(currentCriteria));
      }
      if (attempted.includes(registryEntry.providerKey)) {
        break;
      }
      attempted.push(registryEntry.providerKey);

      try {
        const outcome = await this.initializeAndValidate(registryEntry, criteria);

        this.cache.set(cacheKey, {
          instance: outcome.provider,
          providerKey: registryEntry.providerKey,
          workspaceId: criteria.workspaceId,
          registryUpdatedAtMs: registryEntry.updatedAt.getTime(),
          configVersion: outcome.configVersion,
          credentialVersion: outcome.credentialVersion,
        });

        this.audit.logEvent(AiProviderEventType.FACTORY_INSTANCE_CREATED, criteria.workspaceId, registryEntry.providerKey);
        this.eventEmitter.emit({
          type: AiProviderEventType.FACTORY_INSTANCE_CREATED,
          providerKey: registryEntry.providerKey,
          workspaceId: criteria.workspaceId,
          occurredAt: new Date(),
          payload: { modelId: criteria.modelId },
        });

        return { instance: outcome.provider, providerKey: registryEntry.providerKey, modelId: criteria.modelId, fromCache: false };
      } catch (error) {
        const normalized = this.normalizeError(registryEntry.providerKey, error);
        this.audit.logEvent(
          AiProviderEventType.FACTORY_INSTANCE_INITIALIZATION_FAILED,
          criteria.workspaceId,
          registryEntry.providerKey,
          { message: normalized.message },
        );

        const nextKey = registryEntry.fallbackOrder.find((key) => !attempted.includes(key));
        if (nextKey) {
          this.logger.warn(
            `AI provider '${registryEntry.providerKey}' unavailable (${normalized.message}) — falling back to '${nextKey}'`,
          );
          this.eventEmitter.emit({
            type: AiProviderEventType.PROVIDER_FALLBACK_TRIGGERED,
            providerKey: registryEntry.providerKey,
            workspaceId: criteria.workspaceId,
            occurredAt: new Date(),
            payload: { reason: normalized.message, nextCandidate: nextKey },
          });
          currentCriteria = { ...criteria, preferredProviderKey: nextKey };
          continue;
        }

        if (attempted.length > 1) {
          throw new AiProviderFactoryAllFallbacksExhaustedException(attempted);
        }
        throw normalized;
      }
    }

    throw new AiProviderFactoryAllFallbacksExhaustedException(attempted);
  }

  private async initializeAndValidate(
    registryEntry: IAiProviderRegistryEntity,
    criteria: IAiProviderFactoryResolutionCriteria,
  ): Promise<IInitializationOutcome> {
    if (registryEntry.status !== ProviderRegistrationStatus.ACTIVE) {
      throw new AiProviderFactoryNoMatchException(`provider '${registryEntry.providerKey}' is not active`);
    }
    if (!registryEntry.capabilities.includes(criteria.capability)) {
      throw new AiProviderFactoryCapabilityUnsupportedException(registryEntry.providerKey, criteria.capability);
    }
    if (criteria.modelId && !registryEntry.supportedModels.some((m) => m.modelId === criteria.modelId)) {
      throw new AiProviderFactoryNoMatchException(
        `provider '${registryEntry.providerKey}' does not support model '${criteria.modelId}'`,
      );
    }

    if (!this.foundationRegistry.has(registryEntry.providerKey)) {
      throw new AiProviderFactoryProviderNotRegisteredException(registryEntry.providerKey);
    }
    const provider = this.foundationRegistry.get(registryEntry.providerKey);

    const health = await this.healthService.checkHealth(provider);
    if (health.status === AiProviderHealthStatus.UNHEALTHY) {
      throw new AiProviderFactoryUnhealthyException(registryEntry.providerKey, health.message);
    }

    const config = await this.configResolver.resolve({
      workspaceId: criteria.workspaceId,
      providerKey: registryEntry.providerKey,
      useCase: criteria.useCase,
      modelId: criteria.modelId,
    });
    const payload = config?.payload;

    const credentialEntity = await this.credentialResolver.resolve({
      workspaceId: criteria.workspaceId,
      providerKey: registryEntry.providerKey,
      modelId: criteria.modelId,
      accountId: criteria.accountId,
    });

    let resolvedCredentialFields: Record<string, string> | undefined;
    let credentialRef: string | undefined;
    let credentialType: string | undefined;

    if (credentialEntity) {
      this.assertCredentialUsable(registryEntry.providerKey, credentialEntity.status);
      resolvedCredentialFields =
        (await this.credentialResolver.resolveDecrypted({
          workspaceId: criteria.workspaceId,
          providerKey: registryEntry.providerKey,
          modelId: criteria.modelId,
          accountId: criteria.accountId,
        })) ?? undefined;
      credentialRef = credentialEntity.id;
      credentialType = credentialEntity.type;
    }

    const foundationConfig: IAiProviderConfig = {
      providerKey: registryEntry.providerKey,
      displayName: registryEntry.displayName,
      enabled: true,
      capabilities: registryEntry.capabilities,
      models: registryEntry.supportedModels,
      defaultModelId: payload?.defaultModelId ?? criteria.modelId,
      credentials: credentialRef ? { credentialRef, type: credentialType } : undefined,
      resolvedCredentialFields,
      timeoutPolicy: payload?.timeoutPolicy,
      retryPolicy: payload?.retryPolicy,
      rateLimitPolicy: payload?.rateLimitPolicy,
      fallbackPolicy: payload?.fallbackPolicy ?? { fallbackProviderKeys: registryEntry.fallbackOrder },
      metadata: {
        queue: payload?.queue,
        safety: payload?.safety,
        logging: payload?.logging,
        modelParameters: payload?.modelParameters,
        limits: payload?.limits,
        validation: payload?.validation,
        caching: payload?.caching,
        featureFlags: payload?.featureFlags,
        ...(registryEntry.metadata ?? {}),
      },
    };

    try {
      await provider.initialize(foundationConfig);
    } catch (error) {
      throw new AiProviderFactoryInitializationFailedException(
        registryEntry.providerKey,
        error instanceof Error ? error.message : 'Unknown error',
      );
    } finally {
      // Decrypted credential material must never outlive this call.
      foundationConfig.resolvedCredentialFields = undefined;
      resolvedCredentialFields = undefined;
    }

    return { provider, configVersion: config?.version, credentialVersion: credentialEntity?.version };
  }

  private assertCredentialUsable(providerKey: string, status: CredentialStatus): void {
    if (status === CredentialStatus.REVOKED) {
      throw new AiProviderFactoryCredentialUnavailableException(providerKey, 'credential has been revoked');
    }
    if (status === CredentialStatus.EXPIRED) {
      throw new AiProviderFactoryCredentialUnavailableException(providerKey, 'credential has expired');
    }
    if (status === CredentialStatus.INVALID || status === CredentialStatus.VALIDATION_FAILED) {
      throw new AiProviderFactoryCredentialUnavailableException(providerKey, `credential status is '${status}'`);
    }
  }

  private describeCriteria(criteria: IAiProviderFactoryResolutionCriteria): string {
    const parts = [`capability '${criteria.capability}'`, `workspace '${criteria.workspaceId}'`];
    if (criteria.useCase) parts.push(`use case '${criteria.useCase}'`);
    if (criteria.modelId) parts.push(`model '${criteria.modelId}'`);
    if (criteria.region) parts.push(`region '${criteria.region}'`);
    return parts.join(', ');
  }

  private normalizeError(providerKey: string, error: unknown): AtlasException {
    if (error instanceof AtlasException) {
      return error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new AiProviderFactoryInitializationFailedException(providerKey, message);
  }
}
