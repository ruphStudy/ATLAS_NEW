import { Injectable } from '@nestjs/common';
import { AiProviderEventType } from '../../ai/interfaces';
import { AiProviderEventEmitter } from '../../ai/events/ai-provider-event.emitter';
import { AiProviderRegistryResolver } from '../ai-provider-registry/ai-provider-registry.resolver';
import { AiProviderConfigurationResolver } from '../ai-provider-configuration/ai-provider-configuration.resolver';
import { AiProviderCredentialResolver } from '../ai-provider-credentials/ai-provider-credential.resolver';
import { CredentialStatus } from '../ai-provider-credentials/interfaces';
import { AiCapabilityRepository } from './ai-capability.repository';
import { AiCapabilityCache } from './cache/ai-capability.cache';
import { AI_CAPABILITY_CONSTANTS } from './constants';
import {
  CapabilityDefinitionStatus,
  CapabilityOverrideScope,
  CapabilitySupportLevel,
  IAiCapabilityDefinitionEntity,
  IAiCapabilityLimits,
  IAiCapabilityResolutionCriteria,
  IAiCapabilityResolutionResult,
} from './interfaces';

const UNAVAILABLE_CREDENTIAL_STATUSES = new Set<CredentialStatus>([
  CredentialStatus.REVOKED,
  CredentialStatus.EXPIRED,
  CredentialStatus.INVALID,
]);

/**
 * AiCapabilityResolver
 *
 * Determines whether a capability is available for a given workspace
 * (optionally scoped to a provider/model/use case/region), applying:
 *   1. Capability definition status + required-role permission check.
 *   2. Recursive dependency resolution (bounded depth).
 *   3. Workspace-level policy override (enable/disable, feature flags).
 *   4. Provider/model support-level overrides, falling back to the
 *      Registry's plain capability list when no override is registered.
 *   5. Model existence, configuration and credential availability
 *      validation via the Registry/Configuration/Credentials resolvers.
 * Never decrypts credentials — only checks presence/status.
 */
@Injectable()
export class AiCapabilityResolver {
  constructor(
    private readonly repository: AiCapabilityRepository,
    private readonly cache: AiCapabilityCache,
    private readonly registryResolver: AiProviderRegistryResolver,
    private readonly configResolver: AiProviderConfigurationResolver,
    private readonly credentialResolver: AiProviderCredentialResolver,
    private readonly eventEmitter: AiProviderEventEmitter,
  ) {}

  async resolve(criteria: IAiCapabilityResolutionCriteria): Promise<IAiCapabilityResolutionResult> {
    const cacheKey = AiCapabilityCache.buildResolutionKey(
      criteria.workspaceId,
      criteria.capabilityKey,
      criteria.providerKey,
      criteria.modelId,
      criteria.useCase,
      criteria.region,
    );
    const cached = this.cache.getResolution(cacheKey);
    if (cached) return cached;

    const result = await this.doResolve(criteria, 0);
    this.cache.setResolution(cacheKey, result);

    const isDependencyFailure = !result.available && result.reasons.some((r) => r.includes('dependency'));
    this.eventEmitter.emit({
      type: result.available
        ? AiProviderEventType.CAPABILITY_VALIDATION_SUCCEEDED
        : isDependencyFailure
          ? AiProviderEventType.CAPABILITY_COMPATIBILITY_CHECK_FAILED
          : AiProviderEventType.CAPABILITY_VALIDATION_FAILED,
      providerKey: criteria.capabilityKey,
      workspaceId: criteria.workspaceId,
      occurredAt: new Date(),
      payload: {
        capabilityKey: criteria.capabilityKey,
        providerKey: result.providerKey,
        modelId: result.modelId,
        reasons: result.reasons,
      },
    });

    return result;
  }

  private async doResolve(
    criteria: IAiCapabilityResolutionCriteria,
    depth: number,
  ): Promise<IAiCapabilityResolutionResult> {
    const reasons: string[] = [];

    const definition = await this.getActiveDefinition(criteria.capabilityKey);
    if (!definition) {
      reasons.push(`capability '${criteria.capabilityKey}' is not defined or not active`);
      return this.unavailable(criteria, reasons);
    }

    if (
      definition.requiredRoles.length > 0 &&
      (!criteria.userRole || !definition.requiredRoles.includes(criteria.userRole))
    ) {
      reasons.push(`insufficient permissions to use capability '${criteria.capabilityKey}'`);
      return this.unavailable(criteria, reasons);
    }

    if (depth < AI_CAPABILITY_CONSTANTS.MAX_DEPENDENCY_DEPTH) {
      for (const dependency of definition.dependencies) {
        const depResult = await this.doResolve({ ...criteria, capabilityKey: dependency }, depth + 1);
        if (!depResult.available) {
          reasons.push(`dependency '${dependency}' is unavailable (${depResult.reasons.join('; ')})`);
          return this.unavailable(criteria, reasons);
        }
      }
    }

    const workspaceOverrideRaw = await this.repository.findActiveOverride({
      scope: CapabilityOverrideScope.WORKSPACE,
      capabilityKey: criteria.capabilityKey,
      workspaceId: criteria.workspaceId,
    });
    if (workspaceOverrideRaw) {
      const featureFlag = workspaceOverrideRaw['featureFlag'] as string | null;
      if (featureFlag && !(criteria.featureFlags ?? []).includes(featureFlag)) {
        reasons.push(`feature flag '${featureFlag}' is not enabled for this workspace`);
        return this.unavailable(criteria, reasons);
      }
      if ((workspaceOverrideRaw['supportLevel'] as CapabilitySupportLevel) === CapabilitySupportLevel.UNSUPPORTED) {
        reasons.push(`capability '${criteria.capabilityKey}' is disabled for this workspace`);
        return this.unavailable(criteria, reasons);
      }
    }

    let supportLevel = CapabilitySupportLevel.UNSUPPORTED;
    let effectiveSchema = {
      input: definition.inputSchema ?? null,
      output: definition.outputSchema ?? null,
    };
    let effectiveLimits: IAiCapabilityLimits = { ...definition.limits };

    if (criteria.modelId && criteria.providerKey) {
      const modelOverride = await this.repository.findActiveOverride({
        scope: CapabilityOverrideScope.MODEL,
        capabilityKey: criteria.capabilityKey,
        providerKey: criteria.providerKey,
        modelId: criteria.modelId,
      });
      if (modelOverride) {
        supportLevel = modelOverride['supportLevel'] as CapabilitySupportLevel;
        const schemaOverride = modelOverride['schemaOverride'] as Record<string, unknown> | null;
        if (schemaOverride) effectiveSchema = { ...effectiveSchema, ...schemaOverride };
        effectiveLimits = { ...effectiveLimits, ...((modelOverride['limitsOverride'] as IAiCapabilityLimits | null) ?? {}) };
      }
    }

    if (supportLevel === CapabilitySupportLevel.UNSUPPORTED && criteria.providerKey) {
      const providerOverride = await this.repository.findActiveOverride({
        scope: CapabilityOverrideScope.PROVIDER,
        capabilityKey: criteria.capabilityKey,
        providerKey: criteria.providerKey,
      });
      if (providerOverride) {
        supportLevel = providerOverride['supportLevel'] as CapabilitySupportLevel;
        effectiveLimits = {
          ...effectiveLimits,
          ...((providerOverride['limitsOverride'] as IAiCapabilityLimits | null) ?? {}),
        };
      }
    }

    const registryEntry = await this.registryResolver.resolve({
      workspaceId: criteria.workspaceId,
      capability: criteria.capabilityKey,
      modelId: criteria.modelId,
      region: criteria.region,
      preferredProviderKey: criteria.providerKey,
    });

    if (!registryEntry) {
      reasons.push('no active registered provider supports this capability');
      return this.unavailable(criteria, reasons);
    }

    const resolvedProviderKey = registryEntry.providerKey;
    const resolvedModelId = criteria.modelId;

    if (resolvedModelId && !registryEntry.supportedModels.some((m) => m.modelId === resolvedModelId)) {
      reasons.push(`model '${resolvedModelId}' is not supported by provider '${resolvedProviderKey}'`);
      return this.unavailable({ ...criteria, providerKey: resolvedProviderKey }, reasons);
    }

    if (supportLevel === CapabilitySupportLevel.UNSUPPORTED) {
      supportLevel = registryEntry.capabilities.includes(criteria.capabilityKey)
        ? CapabilitySupportLevel.FULL
        : CapabilitySupportLevel.UNSUPPORTED;
    }

    if (supportLevel === CapabilitySupportLevel.UNSUPPORTED) {
      reasons.push(`provider '${resolvedProviderKey}' does not support capability '${criteria.capabilityKey}'`);
      return this.unavailable({ ...criteria, providerKey: resolvedProviderKey }, reasons);
    }

    const config = await this.configResolver.resolve({
      workspaceId: criteria.workspaceId,
      providerKey: resolvedProviderKey,
      useCase: criteria.useCase,
      modelId: resolvedModelId,
    });
    if (!config) {
      reasons.push(`no configuration resolved for provider '${resolvedProviderKey}' (defaults will apply)`);
    }

    const credential = await this.credentialResolver.resolve({
      workspaceId: criteria.workspaceId,
      providerKey: resolvedProviderKey,
      modelId: resolvedModelId,
    });
    if (!credential) {
      reasons.push(`no credential configured for provider '${resolvedProviderKey}'`);
      return this.unavailable({ ...criteria, providerKey: resolvedProviderKey, modelId: resolvedModelId }, reasons, supportLevel);
    }
    if (UNAVAILABLE_CREDENTIAL_STATUSES.has(credential.status)) {
      reasons.push(`credential for provider '${resolvedProviderKey}' is '${credential.status}'`);
      return this.unavailable({ ...criteria, providerKey: resolvedProviderKey, modelId: resolvedModelId }, reasons, supportLevel);
    }

    return {
      available: true,
      supportLevel,
      capabilityKey: criteria.capabilityKey,
      providerKey: resolvedProviderKey,
      modelId: resolvedModelId,
      effectiveSchema,
      effectiveLimits,
      reasons,
    };
  }

  private async getActiveDefinition(capabilityKey: string): Promise<IAiCapabilityDefinitionEntity | null> {
    const cached = this.cache.getDefinition(capabilityKey);
    if (cached) return cached.status === CapabilityDefinitionStatus.ACTIVE ? cached : null;

    const raw = await this.repository.findActiveByCapabilityKey(capabilityKey);
    if (!raw) return null;

    const definition = raw as unknown as IAiCapabilityDefinitionEntity;
    this.cache.setDefinition(capabilityKey, definition);
    return definition;
  }

  private unavailable(
    criteria: IAiCapabilityResolutionCriteria,
    reasons: string[],
    supportLevel: CapabilitySupportLevel = CapabilitySupportLevel.UNSUPPORTED,
  ): IAiCapabilityResolutionResult {
    return {
      available: false,
      supportLevel,
      capabilityKey: criteria.capabilityKey,
      providerKey: criteria.providerKey,
      modelId: criteria.modelId,
      reasons,
    };
  }
}
