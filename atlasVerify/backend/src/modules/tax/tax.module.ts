import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { CurrencyModule } from '../currency/currency.module';

import { TaxRepository } from './repository/tax.repository';
import { TaxJurisdictionRegistry } from './registry/tax-jurisdiction.registry';
import { TaxCache } from './cache/tax.cache';
import { TaxRuleResolver } from './resolver/tax-rule.resolver';
import { TaxCalculator } from './calculator/tax-calculator.service';
import { TaxValidator } from './validator/tax.validator';
import { TaxAudit } from './audit/tax.audit';
import { TaxEventQueue } from './events/tax-events.queue';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';

/**
 * TaxModule — the central, configurable Tax Engine.
 *
 * Owns tax jurisdictions, versioned/approved tax rules, authorized
 * overrides, and calculation. All tax RULES are data (jurisdiction, type,
 * rate, applicability, effective dates) — no country-specific behavior is
 * hardcoded in this module's services. Rounds using the Currency Engine's
 * own `roundMoney` utility and currency precision (imports `CurrencyModule`
 * for `CurrencyRegistry`) rather than re-implementing money math; never
 * touches Pricing/Billing/Invoice calculations directly — those modules
 * call `TaxService.calculateTax()` and apply the result themselves.
 */
@Module({
  imports: [DatabaseModule, AuditLogsModule, CurrencyModule],
  controllers: [TaxController],
  providers: [
    TaxRepository,
    TaxJurisdictionRegistry,
    TaxCache,
    TaxRuleResolver,
    TaxCalculator,
    TaxValidator,
    TaxAudit,
    TaxEventQueue,
    TaxService,
  ],
  exports: [TaxService, TaxJurisdictionRegistry, TaxCache, TaxRuleResolver, TaxCalculator],
})
export class TaxModule {}
