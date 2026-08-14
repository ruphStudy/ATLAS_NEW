import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { CountryModule } from '../country/country.module';
import { CurrencyModule } from '../currency/currency.module';
import { LocalizationModule } from '../localization/localization.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';

import { MarketplaceExpansionRepository } from './repository/marketplace-expansion.repository';
import { MarketplaceExpansionCache } from './cache/marketplace-expansion.cache';
import { MarketplaceExpansionValidator } from './validator/marketplace-expansion.validator';
import { MarketplaceExpansionAudit } from './audit/marketplace-expansion.audit';
import { MarketplaceExpansionEventQueue } from './events/marketplace-expansion-events.queue';
import { MarketplaceExpansionService } from './marketplace-expansion.service';
import { MarketplaceExpansionController } from './marketplace-expansion.controller';

/**
 * MarketplaceExpansionModule — a thin configuration/registration layer
 * over the existing Multi-Marketplace Framework. Owns only the
 * onboarding record, rollout state (draft/beta/active/deprecated/
 * disabled), country/tenant eligibility, and versioned history for each
 * marketplace expansion. Adapter registration, resolution, health
 * checks, error normalization and versioning remain owned by
 * `MarketplaceProviderModule` and are reused here via dependency
 * injection — never rebuilt or hardcoded per-marketplace.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    CountryModule,
    CurrencyModule,
    LocalizationModule,
    MarketplaceProviderModule,
  ],
  controllers: [MarketplaceExpansionController],
  providers: [
    MarketplaceExpansionRepository,
    MarketplaceExpansionCache,
    MarketplaceExpansionValidator,
    MarketplaceExpansionAudit,
    MarketplaceExpansionEventQueue,
    MarketplaceExpansionService,
  ],
  exports: [MarketplaceExpansionService, MarketplaceExpansionCache],
})
export class MarketplaceExpansionModule {}
