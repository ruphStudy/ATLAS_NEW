import { Injectable } from '@nestjs/common';
import { CountryService } from '@modules/country/country.service';
import { CurrencyRegistry } from '@modules/currency/registry/currency.registry';
import { MarketplaceAccountService } from '@modules/marketplace-account/marketplace-account.service';
import { IBrandValidationResult, BrandValidationIssueType } from '../interfaces';

export interface BrandCandidate {
  workspaceId: string;
  countryCodes: string[];
  currencyCodes: string[];
  marketplaceAccountIds: string[];
}

/**
 * MultiBrandValidator
 *
 * Validates a brand's cross-module references before create/update:
 * every country/currency/marketplace-account code must already exist in
 * its owning module — resolved by calling that module's own service,
 * never re-implemented here. Duplicate-code and cross-brand entity-link
 * conflicts are checked directly by `MultiBrandService` (they're purely
 * local to this module's own tables), not here.
 */
@Injectable()
export class MultiBrandValidator {
  constructor(
    private readonly countryService: CountryService,
    private readonly currencyRegistry: CurrencyRegistry,
    private readonly marketplaceAccountService: MarketplaceAccountService,
  ) {}

  async validateBrand(candidate: BrandCandidate): Promise<IBrandValidationResult> {
    const issues: IBrandValidationResult['issues'] = [];
    const warnings: string[] = [];

    for (const countryCode of candidate.countryCodes) {
      try {
        await this.countryService.findByCode(countryCode);
      } catch {
        issues.push({
          type: BrandValidationIssueType.INVALID_BRAND,
          message: `Country '${countryCode}' is not registered`,
        });
      }
    }

    for (const currencyCode of candidate.currencyCodes) {
      if (!this.currencyRegistry.get(currencyCode)) {
        issues.push({
          type: BrandValidationIssueType.UNKNOWN_CURRENCY,
          message: `Currency '${currencyCode}' is not registered`,
        });
      }
    }

    for (const marketplaceAccountId of candidate.marketplaceAccountIds) {
      try {
        await this.marketplaceAccountService.findById(marketplaceAccountId, candidate.workspaceId);
      } catch {
        issues.push({
          type: BrandValidationIssueType.UNKNOWN_MARKETPLACE_ACCOUNT,
          message: `Marketplace account '${marketplaceAccountId}' was not found in this workspace`,
        });
      }
    }

    return { valid: issues.length === 0, issues, warnings };
  }
}
