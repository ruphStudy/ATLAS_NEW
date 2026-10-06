import { Injectable, Logger } from '@nestjs/common';
import {
  CapabilityResolutionRequest,
  CapabilityResolutionResult,
  CapabilityResolutionStatus,
  CapabilitySupportLevel,
  CapabilityStatus,
  IMarketplaceCapabilityDefinition,
  IMarketplaceProviderCapabilityDeclaration,
  CapabilityOverrideType,
  IMarketplaceCapabilityOverride,
} from '../interfaces';
import { MarketplaceCapabilityRegistry } from '../registry/marketplace-capability.registry';
import { MarketplaceCapabilityCache } from '../cache/marketplace-capability.cache';
import { MarketplaceCapabilityRepository } from '../repository/marketplace-capability.repository';
import { MarketplaceCapabilityMetrics } from '../metrics/marketplace-capability.metrics';

/**
 * MarketplaceCapabilityResolver
 *
 * Resolves capability support for a given workspace + provider + capability combination.
 * Applies precedence-ordered overrides (global < provider < workspace < account < country < region < feature_flag).
 * Returns a structured CapabilityResolutionResult.
 */
@Injectable()
export class MarketplaceCapabilityResolver {
  private readonly logger = new Logger(MarketplaceCapabilityResolver.name);

  constructor(
    private readonly registry: MarketplaceCapabilityRegistry,
    private readonly cache: MarketplaceCapabilityCache,
    private readonly repository: MarketplaceCapabilityRepository,
    private readonly metrics: MarketplaceCapabilityMetrics,
  ) {}

  async resolve(request: CapabilityResolutionRequest): Promise<CapabilityResolutionResult> {
    const start = Date.now();
    this.metrics.recordResolutionRequest(request.capabilityKey);

    // Cache look-up
    const cached = this.cache.getResolution(
      request.workspaceId,
      request.providerKey,
      request.capabilityKey,
      request.accountId,
      request.country,
      request.region,
    );
    if (cached) {
      this.metrics.recordCacheHit(request.capabilityKey);
      return cached;
    }
    this.metrics.recordCacheMiss(request.capabilityKey);

    const result = await this.doResolve(request, start);

    this.cache.setResolution(
      request.workspaceId,
      request.providerKey,
      request.capabilityKey,
      result,
      request.accountId,
      request.country,
      request.region,
    );

    return result;
  }

  private async doResolve(
    request: CapabilityResolutionRequest,
    startMs: number,
  ): Promise<CapabilityResolutionResult> {
    const reasons: string[] = [];
    const base: Omit<CapabilityResolutionResult, 'status' | 'supportLevel' | 'declaration' | 'definition' | 'reasons' | 'resolutionTimeMs'> = {
      capabilityKey: request.capabilityKey.toUpperCase(),
      providerKey: request.providerKey.toUpperCase(),
      workspaceId: request.workspaceId,
      resolvedAt: new Date(),
    };

    // 1. Capability definition
    let definition: IMarketplaceCapabilityDefinition | undefined =
      this.registry.getDefinition(request.capabilityKey);

    if (!definition) {
      const raw = await this.repository.findDefinitionByKey(request.capabilityKey);
      if (raw) {
        definition = raw as unknown as IMarketplaceCapabilityDefinition;
        this.registry.register(definition);
      }
    }

    if (!definition) {
      return { ...base, status: CapabilityResolutionStatus.UNSUPPORTED, supportLevel: null, declaration: null, definition: null, reasons: [`Capability '${request.capabilityKey}' is not defined`], resolutionTimeMs: Date.now() - startMs };
    }

    if (definition.status === CapabilityStatus.ARCHIVED || definition.status === CapabilityStatus.DISABLED) {
      return { ...base, status: CapabilityResolutionStatus.DISABLED, supportLevel: null, declaration: null, definition, reasons: [`Capability '${request.capabilityKey}' is ${definition.status}`], resolutionTimeMs: Date.now() - startMs };
    }

    // 2. Country restriction (definition level)
    if (request.country && definition.countryRestrictions.includes(request.country.toUpperCase())) {
      return { ...base, status: CapabilityResolutionStatus.RESTRICTED, supportLevel: null, declaration: null, definition, reasons: [`Capability restricted in country '${request.country}'`], resolutionTimeMs: Date.now() - startMs };
    }

    // 3. Region restriction
    if (request.region && definition.regionRestrictions.includes(request.region)) {
      return { ...base, status: CapabilityResolutionStatus.RESTRICTED, supportLevel: null, declaration: null, definition, reasons: [`Capability restricted in region '${request.region}'`], resolutionTimeMs: Date.now() - startMs };
    }

    // 4. Required API version
    if (definition.requiredApiVersion && request.apiVersion) {
      const [rMaj] = definition.requiredApiVersion.split('.').map(Number);
      const [cMaj] = request.apiVersion.split('.').map(Number);
      if (cMaj < rMaj) {
        this.metrics.recordVersionMismatch(request.capabilityKey);
        return { ...base, status: CapabilityResolutionStatus.VERSION_MISMATCH, supportLevel: null, declaration: null, definition, reasons: [`API version ${request.apiVersion} < required ${definition.requiredApiVersion}`], resolutionTimeMs: Date.now() - startMs };
      }
    }

    // 5. Provider declaration (workspace-specific then global)
    let declaration: IMarketplaceProviderCapabilityDeclaration | undefined =
      this.registry.getDeclaration(
        request.providerKey,
        request.capabilityKey,
        request.workspaceId,
        request.accountId,
      );

    if (!declaration) {
      const raw = await this.repository.findDeclaration(
        request.providerKey,
        request.capabilityKey,
        request.workspaceId,
        request.accountId,
        request.marketplaceKey as string | null,
      ) ?? await this.repository.findDeclaration(
        request.providerKey,
        request.capabilityKey,
        null,
        null,
        null,
      );
      if (raw) {
        declaration = raw as unknown as IMarketplaceProviderCapabilityDeclaration;
      }
    }

    if (!declaration) {
      this.metrics.recordUnsupportedRequest(request.capabilityKey);
      return { ...base, status: CapabilityResolutionStatus.UNSUPPORTED, supportLevel: CapabilitySupportLevel.UNSUPPORTED, declaration: null, definition, reasons: [`Provider '${request.providerKey}' has not declared support for '${request.capabilityKey}'`], resolutionTimeMs: Date.now() - startMs };
    }

    if (declaration.supportLevel === CapabilitySupportLevel.UNSUPPORTED) {
      this.metrics.recordUnsupportedRequest(request.capabilityKey);
      return { ...base, status: CapabilityResolutionStatus.UNSUPPORTED, supportLevel: CapabilitySupportLevel.UNSUPPORTED, declaration, definition, reasons: [`Provider '${request.providerKey}' explicitly declares UNSUPPORTED for '${request.capabilityKey}'`], resolutionTimeMs: Date.now() - startMs };
    }

    // 6. Country availability (declaration level)
    if (request.country && declaration.countryAvailability.length > 0) {
      if (!declaration.countryAvailability.includes(request.country.toUpperCase())) {
        return { ...base, status: CapabilityResolutionStatus.RESTRICTED, supportLevel: declaration.supportLevel as CapabilitySupportLevel, declaration, definition, reasons: [`Capability not available in country '${request.country}' for provider '${request.providerKey}'`], resolutionTimeMs: Date.now() - startMs };
      }
    }

    // 7. Region availability
    if (request.region && declaration.regionAvailability.length > 0) {
      if (!declaration.regionAvailability.includes(request.region)) {
        return { ...base, status: CapabilityResolutionStatus.RESTRICTED, supportLevel: declaration.supportLevel as CapabilitySupportLevel, declaration, definition, reasons: [`Capability not available in region '${request.region}' for provider '${request.providerKey}'`], resolutionTimeMs: Date.now() - startMs };
      }
    }

    // 8. Overrides — apply deterministic precedence
    const overrides = await this.repository.findOverrides(
      request.capabilityKey,
      request.workspaceId,
      request.providerKey,
    );

    const effectiveStatus = this.applyOverrides(
      declaration.supportLevel as CapabilitySupportLevel,
      overrides as unknown as IMarketplaceCapabilityOverride[],
      request,
    );

    if (effectiveStatus === CapabilityResolutionStatus.DISABLED) {
      return { ...base, status: CapabilityResolutionStatus.DISABLED, supportLevel: declaration.supportLevel as CapabilitySupportLevel, declaration, definition, reasons: ['Capability disabled by override'], resolutionTimeMs: Date.now() - startMs };
    }

    // 9. Provider/account status
    if (request.providerStatus === 'INACTIVE' || request.providerStatus === 'MAINTENANCE') {
      return { ...base, status: CapabilityResolutionStatus.DISABLED, supportLevel: declaration.supportLevel as CapabilitySupportLevel, declaration, definition, reasons: [`Provider is not available (status: ${request.providerStatus})`], resolutionTimeMs: Date.now() - startMs };
    }
    if (request.accountStatus === 'INACTIVE' || request.accountStatus === 'SUSPENDED') {
      return { ...base, status: CapabilityResolutionStatus.DISABLED, supportLevel: declaration.supportLevel as CapabilitySupportLevel, declaration, definition, reasons: [`Account is not active (status: ${request.accountStatus})`], resolutionTimeMs: Date.now() - startMs };
    }

    // 10. Determine final status from support level
    const finalStatus =
      declaration.supportLevel === CapabilitySupportLevel.PARTIAL ||
      declaration.supportLevel === CapabilitySupportLevel.READ_ONLY ||
      declaration.supportLevel === CapabilitySupportLevel.WRITE_ONLY ||
      declaration.supportLevel === CapabilitySupportLevel.MANUAL
        ? CapabilityResolutionStatus.PARTIALLY_SUPPORTED
        : CapabilityResolutionStatus.SUPPORTED;

    return {
      ...base,
      status: finalStatus,
      supportLevel: declaration.supportLevel as CapabilitySupportLevel,
      declaration,
      definition,
      reasons,
      resolutionTimeMs: Date.now() - startMs,
    };
  }

  /**
   * Applies overrides in precedence order (ascending priority value = lower precedence).
   * Returns adjusted resolution status.
   */
  private applyOverrides(
    baseSupportLevel: CapabilitySupportLevel,
    overrides: IMarketplaceCapabilityOverride[],
    request: CapabilityResolutionRequest,
  ): CapabilityResolutionStatus | null {
    // Filter applicable overrides
    const applicable = overrides
      .filter((o) => {
        if (o.country && o.country !== request.country) return false;
        if (o.region && o.region !== request.region) return false;
        if (o.accountId && o.accountId !== request.accountId) return false;
        if (o.providerKey && o.providerKey.toUpperCase() !== request.providerKey.toUpperCase()) return false;
        if (o.featureFlag && request.featureFlags?.[o.featureFlag] === false) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority); // lower priority first, higher wins

    for (const override of applicable) {
      const val = override.overrideValue as { disabled?: boolean; status?: string };
      if (val.disabled === true) return CapabilityResolutionStatus.DISABLED;
      if (val.status === CapabilityResolutionStatus.DISABLED) return CapabilityResolutionStatus.DISABLED;
    }

    return null; // no override applied
  }
}
