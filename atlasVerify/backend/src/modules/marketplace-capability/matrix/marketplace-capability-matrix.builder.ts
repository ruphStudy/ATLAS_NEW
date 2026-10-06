import { Injectable } from '@nestjs/common';
import { MarketplaceCapabilityRegistry } from '../registry/marketplace-capability.registry';
import { MarketplaceCapabilityResolver } from '../resolver/marketplace-capability.resolver';
import { MarketplaceCapabilityVersionManager } from '../version/marketplace-capability-version.manager';
import { MarketplaceProviderRegistry } from '../../marketplace-provider/registry/marketplace-provider.registry';
import {
  CapabilityMatrixGapType,
  CapabilityResolutionResult,
  CapabilityResolutionStatus,
  IMarketplaceCapabilityDefinition,
  MarketplaceCapabilityMatrix,
  MarketplaceCapabilityMatrixEntry,
  MarketplaceCapabilityMatrixGap,
  MarketplaceCapabilityMatrixRequest,
  MarketplaceCapabilityMatrixSummary,
} from '../interfaces';

/**
 * MarketplaceCapabilityMatrixBuilder
 *
 * Assembles the full capability grid (every active capability definition x
 * every requested/registered provider) for a workspace scope by driving the
 * existing single-capability resolution pipeline
 * (`MarketplaceCapabilityResolver`) once per cell. No marketplace-specific
 * logic lives here — provider identity comes entirely from the foundation
 * `MarketplaceProviderRegistry` and capability declarations already stored
 * per provider/marketplace/account/country/region.
 */
@Injectable()
export class MarketplaceCapabilityMatrixBuilder {
  constructor(
    private readonly registry: MarketplaceCapabilityRegistry,
    private readonly providerRegistry: MarketplaceProviderRegistry,
    private readonly resolver: MarketplaceCapabilityResolver,
    private readonly versionManager: MarketplaceCapabilityVersionManager,
  ) {}

  async build(request: MarketplaceCapabilityMatrixRequest): Promise<MarketplaceCapabilityMatrix> {
    const definitions = this.registry
      .getActiveDefinitions()
      .filter((d) => !request.category || d.category === request.category);

    const providerKeys = request.providerKey
      ? [request.providerKey.toUpperCase()]
      : this.providerRegistry.getActive().map((a) => a.metadata.providerKey.toUpperCase());

    const entries: MarketplaceCapabilityMatrixEntry[] = [];
    const gaps: MarketplaceCapabilityMatrixGap[] = [];

    for (const providerKey of providerKeys) {
      const providerEntries: MarketplaceCapabilityMatrixEntry[] = [];

      for (const definition of definitions) {
        const result = await this.resolver.resolve({
          workspaceId: request.workspaceId,
          providerKey,
          capabilityKey: definition.capabilityKey,
          marketplaceKey: request.marketplaceKey,
          accountId: request.accountId,
          country: request.country,
          region: request.region,
          apiVersion: request.apiVersion,
          providerVersion: request.providerVersion,
          featureFlags: request.featureFlags,
        });

        providerEntries.push(this.toEntry(definition, providerKey, result));
      }

      const supportedKeys = new Set(
        providerEntries
          .filter(
            (e) =>
              e.status === CapabilityResolutionStatus.SUPPORTED ||
              e.status === CapabilityResolutionStatus.PARTIALLY_SUPPORTED,
          )
          .map((e) => e.capabilityKey),
      );

      for (const entry of providerEntries) {
        const definition = definitions.find(
          (d) => d.capabilityKey.toUpperCase() === entry.capabilityKey,
        );
        if (definition) {
          this.collectGaps(entry, definition, supportedKeys, gaps);
        }
      }

      entries.push(...providerEntries);
    }

    return {
      workspaceId: request.workspaceId,
      providerKey: request.providerKey ?? null,
      marketplaceKey: request.marketplaceKey ?? null,
      accountId: request.accountId ?? null,
      country: request.country ?? null,
      region: request.region ?? null,
      generatedAt: new Date(),
      entries,
      gaps,
      summary: this.summarize(entries, gaps),
    };
  }

  private toEntry(
    definition: IMarketplaceCapabilityDefinition,
    providerKey: string,
    result: CapabilityResolutionResult,
  ): MarketplaceCapabilityMatrixEntry {
    return {
      capabilityKey: definition.capabilityKey.toUpperCase(),
      category: definition.category,
      providerKey,
      status: result.status,
      supportLevel: result.supportLevel ?? null,
      capabilityVersion: definition.version,
      declaredCapabilityVersion: result.declaration?.capabilityVersion ?? null,
      requiredApiVersion: definition.requiredApiVersion ?? null,
      declaredApiVersion: result.declaration?.apiVersion ?? null,
      countries: result.declaration?.countryAvailability ?? [],
      regions: result.declaration?.regionAvailability ?? [],
      limits: {
        rateLimits: result.declaration?.rateLimits ?? {},
        batchLimits: result.declaration?.batchLimits ?? {},
      },
      requiredConfiguration: definition.requiredConfiguration ?? {},
      requiredCredentials: definition.requiredCredentials ?? [],
      dependencies: definition.dependencies ?? [],
      missingDependencies: [],
      restrictions: {
        countries: definition.countryRestrictions ?? [],
        regions: definition.regionRestrictions ?? [],
        marketplaces: definition.marketplaceRestrictions ?? [],
      },
      reasons: result.reasons,
    };
  }

  private collectGaps(
    entry: MarketplaceCapabilityMatrixEntry,
    definition: IMarketplaceCapabilityDefinition,
    supportedKeys: Set<string>,
    gaps: MarketplaceCapabilityMatrixGap[],
  ): void {
    if (entry.status === CapabilityResolutionStatus.VERSION_MISMATCH) {
      gaps.push({
        capabilityKey: entry.capabilityKey,
        providerKey: entry.providerKey,
        type: CapabilityMatrixGapType.VERSION_MISMATCH,
        message: entry.reasons.join('; ') || 'Version mismatch',
      });
    }

    if (entry.status === CapabilityResolutionStatus.RESTRICTED) {
      gaps.push({
        capabilityKey: entry.capabilityKey,
        providerKey: entry.providerKey,
        type: CapabilityMatrixGapType.RESTRICTED,
        message: entry.reasons.join('; ') || 'Capability restricted for this scope',
      });
    }

    if (
      entry.status === CapabilityResolutionStatus.UNSUPPORTED &&
      entry.reasons.some((r) => r.toLowerCase().includes('explicitly declares'))
    ) {
      gaps.push({
        capabilityKey: entry.capabilityKey,
        providerKey: entry.providerKey,
        type: CapabilityMatrixGapType.UNAVAILABLE,
        message: entry.reasons.join('; '),
      });
    }

    const isActive =
      entry.status === CapabilityResolutionStatus.SUPPORTED ||
      entry.status === CapabilityResolutionStatus.PARTIALLY_SUPPORTED;

    if (!isActive) return;

    const depCheck = this.versionManager.validateDependencies(definition, supportedKeys);
    if (!depCheck.valid) {
      entry.missingDependencies = depCheck.missingRequired;
      gaps.push({
        capabilityKey: entry.capabilityKey,
        providerKey: entry.providerKey,
        type: CapabilityMatrixGapType.MISSING_DEPENDENCY,
        message: `Missing required dependencies: ${depCheck.missingRequired.join(', ')}`,
      });
    }

    if (entry.requiredCredentials.length > 0 || Object.keys(entry.requiredConfiguration).length > 0) {
      gaps.push({
        capabilityKey: entry.capabilityKey,
        providerKey: entry.providerKey,
        type: CapabilityMatrixGapType.CONFIGURATION_REQUIRED,
        message: `Requires configuration/credentials to be verified: ${[
          ...entry.requiredCredentials,
          ...Object.keys(entry.requiredConfiguration),
        ].join(', ')}`,
      });
    }
  }

  private summarize(
    entries: MarketplaceCapabilityMatrixEntry[],
    gaps: MarketplaceCapabilityMatrixGap[],
  ): MarketplaceCapabilityMatrixSummary {
    return {
      totalCapabilities: new Set(entries.map((e) => e.capabilityKey)).size,
      totalEntries: entries.length,
      supportedCount: entries.filter((e) => e.status === CapabilityResolutionStatus.SUPPORTED).length,
      partiallySupportedCount: entries.filter(
        (e) => e.status === CapabilityResolutionStatus.PARTIALLY_SUPPORTED,
      ).length,
      unsupportedCount: entries.filter((e) => e.status === CapabilityResolutionStatus.UNSUPPORTED).length,
      gapCount: gaps.length,
    };
  }
}
