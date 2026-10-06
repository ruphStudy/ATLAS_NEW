import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { CountryModule } from '../country/country.module';
import { LocalizationModule } from '../localization/localization.module';
import { CurrencyModule } from '../currency/currency.module';
import { TaxModule } from '../tax/tax.module';

import { RegionalSettingsRepository } from './repository/regional-settings.repository';
import { RegionalSettingsCache } from './cache/regional-settings.cache';
import { RegionalSettingsResolver } from './resolver/regional-settings.resolver';
import { RegionalSettingsValidator } from './validator/regional-settings.validator';
import { RegionalSettingsAudit } from './audit/regional-settings.audit';
import { RegionalSettingsEventQueue } from './events/regional-settings-events.queue';
import { RegionalSettingsService } from './regional-settings.service';
import { RegionalSettingsController } from './regional-settings.controller';

/**
 * RegionalSettingsModule — a composing layer over the Multi-Country
 * Framework, Localization/Language Management, Currency Engine and Tax
 * Engine. Owns one thing only: versioned, effective-dated "regional
 * settings profiles" per scope (global/country/region/organization/
 * workspace) bundling formatting, operational calendars and provider
 * references. Every cross-module value is a plain code/id reference,
 * validated for existence against the owning module's own service
 * (`CountryService`, `LocalizationService`, `CurrencyRegistry`,
 * `TaxService`) and never recomputed here. `resolveEffectiveSettings()`
 * merges the applicable profiles by specificity and falls back to
 * `LocalizationService.resolveEffectiveRegionalSettings()` for any
 * dimension left unset — never a second implementation of that resolution.
 */
@Module({
  imports: [DatabaseModule, AuditLogsModule, CountryModule, LocalizationModule, CurrencyModule, TaxModule],
  controllers: [RegionalSettingsController],
  providers: [
    RegionalSettingsRepository,
    RegionalSettingsCache,
    RegionalSettingsResolver,
    RegionalSettingsValidator,
    RegionalSettingsAudit,
    RegionalSettingsEventQueue,
    RegionalSettingsService,
  ],
  exports: [RegionalSettingsService, RegionalSettingsCache, RegionalSettingsResolver],
})
export class RegionalSettingsModule {}
