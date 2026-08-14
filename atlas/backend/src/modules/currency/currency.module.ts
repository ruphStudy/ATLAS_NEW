import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';

import { CurrencyRepository } from './repository/currency.repository';
import { CurrencyRegistry } from './registry/currency.registry';
import { ExchangeRateProviderRegistry } from './registry/exchange-rate-provider.registry';
import { ExchangeRateProviderFactory } from './registry/exchange-rate-provider.factory';
import { CurrencyCache } from './cache/currency.cache';
import { ExchangeRateResolver } from './resolver/exchange-rate.resolver';
import { CurrencyConverter } from './converter/currency-converter.service';
import { CurrencyValidator } from './validator/currency.validator';
import { CurrencyAudit } from './audit/currency.audit';
import { CurrencyEventQueue } from './events/currency-events.queue';
import { ExchangeRateSyncScheduler } from './scheduler/exchange-rate-sync.scheduler';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';

/**
 * CurrencyModule — the central Currency Engine.
 *
 * Owns the currency registry, workspace base/reporting currency
 * configuration, exchange-rate storage/resolution, and conversion. Keeps
 * itself fully decoupled from Country/Marketplace/Pricing/Billing — those
 * modules pass in whatever currency codes/amounts they have and read back
 * a conversion result; none of their calculations are duplicated here, and
 * this module never reaches into them. Exchange-rate providers register
 * against `ExchangeRateProviderRegistry` from their own module — no
 * concrete provider (and no hardcoded rate) lives here.
 */
@Module({
  imports: [DatabaseModule, AuditLogsModule],
  controllers: [CurrencyController],
  providers: [
    CurrencyRepository,
    CurrencyRegistry,
    ExchangeRateProviderRegistry,
    ExchangeRateProviderFactory,
    CurrencyCache,
    ExchangeRateResolver,
    CurrencyConverter,
    CurrencyValidator,
    CurrencyAudit,
    CurrencyEventQueue,
    ExchangeRateSyncScheduler,
    CurrencyService,
  ],
  exports: [
    CurrencyService,
    CurrencyRegistry,
    ExchangeRateProviderRegistry,
    ExchangeRateProviderFactory,
    CurrencyCache,
    ExchangeRateResolver,
    CurrencyConverter,
  ],
})
export class CurrencyModule {}
