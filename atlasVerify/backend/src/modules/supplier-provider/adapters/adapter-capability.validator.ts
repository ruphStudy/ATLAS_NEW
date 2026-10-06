import { Injectable, Logger } from '@nestjs/common';
import { AdapterCapability, AdapterMetadata, IntegrationStrategy } from './adapter.types';

export class CapabilityValidationError extends Error {
  constructor(
    public readonly providerCode: string,
    public readonly capability: AdapterCapability,
    message: string,
  ) {
    super(message);
    this.name = 'CapabilityValidationError';
  }
}

export class StrategyValidationError extends Error {
  constructor(
    public readonly providerCode: string,
    public readonly strategy: IntegrationStrategy,
    message: string,
  ) {
    super(message);
    this.name = 'StrategyValidationError';
  }
}

/**
 * AdapterCapabilityValidator
 *
 * Validates that a requested capability/strategy is supported by an adapter
 * before executing any provider call.
 */
@Injectable()
export class AdapterCapabilityValidator {
  private readonly logger = new Logger(AdapterCapabilityValidator.name);

  validateCapability(metadata: AdapterMetadata, capability: AdapterCapability): void {
    if (!metadata.capabilities.includes(capability)) {
      const msg = `Provider '${metadata.providerCode}' does not support capability '${capability}'. Supported: [${metadata.capabilities.join(', ')}]`;
      this.logger.warn(msg);
      throw new CapabilityValidationError(metadata.providerCode, capability, msg);
    }
  }

  validateStrategy(metadata: AdapterMetadata, strategy: IntegrationStrategy): void {
    if (!metadata.integrationStrategies.includes(strategy)) {
      const msg = `Provider '${metadata.providerCode}' does not support integration strategy '${strategy}'. Supported: [${metadata.integrationStrategies.join(', ')}]`;
      this.logger.warn(msg);
      throw new StrategyValidationError(metadata.providerCode, strategy, msg);
    }
  }

  validateCountry(metadata: AdapterMetadata, country: string): boolean {
    if (metadata.supportedCountries.length === 0) return true; // global
    return metadata.supportedCountries.includes(country.toUpperCase());
  }

  validateCurrency(metadata: AdapterMetadata, currency: string): boolean {
    if (metadata.supportedCurrencies.length === 0) return true;
    return metadata.supportedCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Returns true if the adapter is capable and optionally strategy is valid.
   * Does not throw — use for conditional branching.
   */
  canHandle(
    metadata: AdapterMetadata,
    capability: AdapterCapability,
    strategy?: IntegrationStrategy,
  ): boolean {
    const hasCapability = metadata.capabilities.includes(capability);
    if (!hasCapability) return false;
    if (strategy) return metadata.integrationStrategies.includes(strategy);
    return true;
  }
}
