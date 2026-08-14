import { Injectable } from '@nestjs/common';
import { CountryService } from '@modules/country/country.service';
import { LocalizationService } from '@modules/localization/localization.service';
import { CurrencyRegistry } from '@modules/currency/registry/currency.registry';
import { TaxService } from '@modules/tax/tax.service';
import { IRegionalSettingsValidationResult, RegionalSettingsValidationIssueType } from '../interfaces';

export interface RegionalSettingsProfileCandidate {
  countryCode?: string | null;
  regionCode?: string | null;
  localeCode?: string | null;
  currencyCode?: string | null;
  taxJurisdictionCode?: string | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

/**
 * RegionalSettingsValidator
 *
 * Validates a profile before it is created/published: every cross-module
 * reference (country/locale/currency/tax-jurisdiction) must already exist
 * in its owning module — resolved by calling that module's own service,
 * never re-implemented here — plus a basic effective-window sanity check
 * and a soft incompatible-combination warning (e.g. a locale registered
 * for a different country than the profile's own).
 */
@Injectable()
export class RegionalSettingsValidator {
  constructor(
    private readonly countryService: CountryService,
    private readonly localizationService: LocalizationService,
    private readonly currencyRegistry: CurrencyRegistry,
    private readonly taxService: TaxService,
  ) {}

  async validateProfile(candidate: RegionalSettingsProfileCandidate): Promise<IRegionalSettingsValidationResult> {
    const issues: IRegionalSettingsValidationResult['issues'] = [];
    const warnings: string[] = [];

    if (candidate.effectiveTo && candidate.effectiveTo <= candidate.effectiveFrom) {
      issues.push({ type: RegionalSettingsValidationIssueType.INVALID_PROFILE, message: 'effectiveTo must be after effectiveFrom' });
    }

    let localeCountry: string | null | undefined;

    if (candidate.countryCode) {
      try {
        await this.countryService.findByCode(candidate.countryCode);
      } catch {
        issues.push({
          type: RegionalSettingsValidationIssueType.UNKNOWN_COUNTRY,
          message: `Country '${candidate.countryCode}' is not registered`,
        });
      }
    }

    if (candidate.localeCode) {
      try {
        const locale = await this.localizationService.getLocale(candidate.localeCode);
        localeCountry = locale.country;
      } catch {
        issues.push({
          type: RegionalSettingsValidationIssueType.UNKNOWN_LOCALE,
          message: `Locale '${candidate.localeCode}' is not registered`,
        });
      }
    }

    if (candidate.currencyCode && !this.currencyRegistry.get(candidate.currencyCode)) {
      issues.push({
        type: RegionalSettingsValidationIssueType.UNKNOWN_CURRENCY,
        message: `Currency '${candidate.currencyCode}' is not registered`,
      });
    }

    if (candidate.taxJurisdictionCode) {
      try {
        await this.taxService.findJurisdictionByCode(candidate.taxJurisdictionCode);
      } catch {
        issues.push({
          type: RegionalSettingsValidationIssueType.UNKNOWN_TAX_JURISDICTION,
          message: `Tax jurisdiction '${candidate.taxJurisdictionCode}' is not registered`,
        });
      }
    }

    if (localeCountry && candidate.countryCode && localeCountry.toUpperCase() !== candidate.countryCode.toUpperCase()) {
      warnings.push(
        `Locale '${candidate.localeCode}' is registered for country '${localeCountry}', which differs from this profile's country '${candidate.countryCode}'`,
      );
    }

    return { valid: issues.length === 0, issues, warnings };
  }
}
