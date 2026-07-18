import {
  CapabilityValidationResult,
  IMarketplaceProviderAdapter,
  MarketplaceCapability,
  MarketplaceErrorCode,
  UnsupportedCapabilityError,
} from '../interfaces';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Validates marketplace capabilities against registered provider adapters.
 * Used before dispatching operations to ensure the provider can handle them.
 */
@Injectable()
export class MarketplaceCapabilityValidator {
  private readonly logger = new Logger(MarketplaceCapabilityValidator.name);

  /**
   * Validates that a provider supports the requested capability.
   */
  validate(
    adapter: IMarketplaceProviderAdapter,
    capability: MarketplaceCapability,
  ): CapabilityValidationResult {
    const supported = adapter.supportsCapability(capability);

    if (!supported) {
      this.logger.warn(
        `Provider '${adapter.metadata.providerKey}' does not support capability '${capability}'`,
      );
    }

    return {
      supported,
      capability,
      providerKey: adapter.metadata.providerKey,
      version: `${adapter.metadata.version.major}.${adapter.metadata.version.minor}.${adapter.metadata.version.patch}`,
      reason: supported ? undefined : `Provider '${adapter.metadata.providerKey}' does not support '${capability}'`,
      errors: supported ? [] : [`Unsupported capability: ${capability}`],
    };
  }

  /**
   * Throws an UnsupportedCapabilityError if the provider does not support the capability.
   */
  assertSupported(
    adapter: IMarketplaceProviderAdapter,
    capability: MarketplaceCapability,
  ): void {
    const result = this.validate(adapter, capability);
    if (!result.supported) {
      const err: UnsupportedCapabilityError = {
        code: MarketplaceErrorCode.UNSUPPORTED_CAPABILITY,
        capability,
        providerKey: adapter.metadata.providerKey,
        message: result.reason ?? `Unsupported capability: ${capability}`,
      };
      throw Object.assign(new Error(err.message), err);
    }
  }

  /**
   * Validates a list of capabilities at once, returning all results.
   */
  validateAll(
    adapter: IMarketplaceProviderAdapter,
    capabilities: MarketplaceCapability[],
  ): CapabilityValidationResult[] {
    return capabilities.map((cap) => this.validate(adapter, cap));
  }

  /**
   * Returns all capabilities declared by a provider.
   */
  getDeclaredCapabilities(adapter: IMarketplaceProviderAdapter): MarketplaceCapability[] {
    return adapter.metadata.supportedCapabilities;
  }

  /**
   * Discovers which capabilities are supported by any registered adapter
   * from a provided list.
   */
  discoverCapabilities(
    adapters: IMarketplaceProviderAdapter[],
    capabilities: MarketplaceCapability[],
  ): Map<MarketplaceCapability, string[]> {
    const result = new Map<MarketplaceCapability, string[]>();
    for (const cap of capabilities) {
      const providers = adapters
        .filter((a) => a.supportsCapability(cap))
        .map((a) => a.metadata.providerKey);
      result.set(cap, providers);
    }
    return result;
  }
}
