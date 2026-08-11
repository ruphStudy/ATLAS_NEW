import { Injectable } from '@nestjs/common';
import {
  CapabilityResolutionRequest,
  CapabilityResolutionResult,
  CapabilityValidationRequest,
  CapabilityValidationResult,
  CompatibilityCheckRequest,
  CompatibilityCheckResult,
  DependencyResolutionResult,
  IMarketplaceCapabilityDefinition,
} from '../interfaces';
import { MarketplaceCapabilityService } from '../marketplace-capability.service';
import { MarketplaceCapabilityRegistry } from '../registry/marketplace-capability.registry';
import { MarketplaceCapabilityCompatibilityManager } from '../compatibility/marketplace-capability-compatibility.manager';
import { MarketplaceCapabilityVersionManager } from '../version/marketplace-capability-version.manager';
import { MarketplaceCapabilityRepository } from '../repository/marketplace-capability.repository';

/**
 * MarketplaceCapabilityManager
 *
 * Facade used by other ATLAS modules to interact with capability management.
 * Provides high-level, coarse-grained operations without exposing internals.
 */
@Injectable()
export class MarketplaceCapabilityManager {
  constructor(
    private readonly service: MarketplaceCapabilityService,
    private readonly registry: MarketplaceCapabilityRegistry,
    private readonly compatibilityManager: MarketplaceCapabilityCompatibilityManager,
    private readonly versionManager: MarketplaceCapabilityVersionManager,
    private readonly repository: MarketplaceCapabilityRepository,
  ) {}

  /**
   * Resolves capability support for a given provider + workspace.
   */
  resolve(request: CapabilityResolutionRequest): Promise<CapabilityResolutionResult> {
    return this.service.resolveCapability(request);
  }

  /**
   * Validates capability availability for an operation.
   */
  validate(request: CapabilityValidationRequest): Promise<CapabilityValidationResult> {
    return this.service.validateCapability(request);
  }

  /**
   * Returns true when a provider supports a capability in a workspace.
   */
  async isSupported(
    workspaceId: string,
    providerKey: string,
    capabilityKey: string,
    accountId?: string | null,
    country?: string | null,
    region?: string | null,
  ): Promise<boolean> {
    const result = await this.service.resolveCapability({
      workspaceId,
      providerKey,
      capabilityKey,
      accountId,
      country,
      region,
    });
    return result.status === 'SUPPORTED' || result.status === 'PARTIALLY_SUPPORTED';
  }

  /**
   * Checks compatibility between versions.
   */
  async checkCompatibility(
    request: CompatibilityCheckRequest,
  ): Promise<CompatibilityCheckResult> {
    const definition = this.registry.getDefinition(request.capabilityKey);
    if (!definition) {
      return {
        compatible: false,
        issues: [{
          type: 'VERSION_CONFLICT' as any,
          message: `Capability '${request.capabilityKey}' not found`,
          detail: null,
          retryable: false,
        }],
        warnings: [],
      };
    }
    const declaration = this.registry.getDeclaration(request.providerKey, request.capabilityKey);
    return this.compatibilityManager.check(request, definition, declaration);
  }

  /**
   * Resolves capability dependencies for a given capability.
   */
  async resolveDependencies(capabilityKey: string): Promise<DependencyResolutionResult> {
    const [definitions] = await this.repository.findDefinitions({});
    const definitionMap = new Map<string, IMarketplaceCapabilityDefinition>(
      (definitions as unknown as IMarketplaceCapabilityDefinition[]).map((d) => [d.capabilityKey.toUpperCase(), d]),
    );
    return this.versionManager.resolveDependencies(capabilityKey, definitionMap);
  }

  /**
   * Discovers all capabilities supported by a provider in a workspace.
   */
  discoverForProvider(
    providerKey: string,
    workspaceId?: string | null,
  ): string[] {
    return this.registry.getSupportedCapabilitiesForProvider(providerKey, workspaceId);
  }

  /**
   * Invalidates cached capability data.
   */
  invalidate(capabilityKey?: string, workspaceId?: string): Promise<void> {
    return this.service.invalidateCache(capabilityKey, workspaceId);
  }
}
