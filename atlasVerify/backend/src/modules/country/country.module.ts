import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceCapabilityModule } from '../marketplace-capability/marketplace-capability.module';

import { CountryRepository } from './repository/country.repository';
import { CountryRegistry } from './registry/country.registry';
import { CountryCache } from './cache/country.cache';
import { CountryContextResolver } from './resolver/country-context.resolver';
import { CountryValidator } from './validator/country.validator';
import { CountryAudit } from './audit/country.audit';
import { CountryEventQueue } from './events/country-events.queue';
import { CountryService } from './country.service';
import { CountryController } from './country.controller';

/**
 * CountryModule — the central Multi-Country Framework.
 *
 * Owns the country registry, per-workspace enablement/overrides, and
 * effective-context resolution/caching. Delegates everything else to
 * existing infrastructure: provider/country support checks go through
 * `MarketplaceProviderModule`'s registry, marketplace capability checks go
 * through `MarketplaceCapabilityModule`, and cross-cutting lifecycle audit
 * entries go through `AuditLogsModule` — no localization, currency, tax or
 * compliance logic is reimplemented here, only referenced.
 */
@Module({
  imports: [DatabaseModule, MarketplaceProviderModule, MarketplaceCapabilityModule, AuditLogsModule],
  controllers: [CountryController],
  providers: [
    CountryRepository,
    CountryRegistry,
    CountryCache,
    CountryContextResolver,
    CountryValidator,
    CountryAudit,
    CountryEventQueue,
    CountryService,
  ],
  exports: [CountryService, CountryRegistry, CountryCache, CountryContextResolver, CountryValidator],
})
export class CountryModule {}
