import { Injectable } from '@nestjs/common';
import { IPricingConfig, PricingInput, PricingStrategy } from '../interfaces';
import { PRICING_CONSTANTS } from '../constants';

@Injectable()
export class PricingStrategyEngine {

  /**
   * Resolve which strategy to use for a given input + config.
   * Priority: input.strategy > config.strategy > DEFAULT_STRATEGY
   */
  resolveStrategy(input: PricingInput, config: IPricingConfig | null): PricingStrategy {
    return input.strategy ?? config?.strategy ?? PRICING_CONSTANTS.DEFAULT_STRATEGY;
  }

  /**
   * Returns true if the strategy can be applied with the given input.
   */
  isStrategyApplicable(strategy: PricingStrategy, input: PricingInput): boolean {
    switch (strategy) {
      case PricingStrategy.FIXED:
        return true;

      case PricingStrategy.MARGIN_BASED:
        return (input.landedCost ?? input.procurementCost ?? input.baseCost ?? 0) > 0;

      case PricingStrategy.ROI_BASED:
        return (input.landedCost ?? input.procurementCost ?? input.baseCost ?? 0) > 0;

      case PricingStrategy.COMPETITIVE:
        // Competitive works even without competitor price (falls back to margin)
        return true;

      case PricingStrategy.COST_PLUS:
        return (input.landedCost ?? input.procurementCost ?? input.baseCost ?? 0) > 0;

      case PricingStrategy.RULE_BASED:
        return true;

      case PricingStrategy.MARKETPLACE_SPECIFIC:
        return (input.marketplaceKey?.length ?? 0) > 0;

      case PricingStrategy.REGIONAL:
        return (input.country?.length ?? 0) > 0;

      default:
        return true;
    }
  }

  /**
   * Select the best strategy based on available input data.
   */
  selectBestStrategy(input: PricingInput, config: IPricingConfig | null): PricingStrategy {
    const preferred = this.resolveStrategy(input, config);
    if (this.isStrategyApplicable(preferred, input)) return preferred;

    // Fallback chain
    const fallbacks: PricingStrategy[] = [
      PricingStrategy.MARGIN_BASED,
      PricingStrategy.COST_PLUS,
      PricingStrategy.FIXED,
    ];

    for (const fallback of fallbacks) {
      if (this.isStrategyApplicable(fallback, input)) return fallback;
    }

    return PricingStrategy.FIXED;
  }

  /**
   * Returns all applicable strategies for the given input.
   */
  listApplicableStrategies(input: PricingInput): PricingStrategy[] {
    return Object.values(PricingStrategy).filter((s) =>
      this.isStrategyApplicable(s as PricingStrategy, input),
    );
  }
}
