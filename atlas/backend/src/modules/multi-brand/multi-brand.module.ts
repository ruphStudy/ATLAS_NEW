import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { CountryModule } from '../country/country.module';
import { CurrencyModule } from '../currency/currency.module';
import { MarketplaceAccountModule } from '../marketplace-account/marketplace-account.module';

import { MultiBrandRepository } from './repository/multi-brand.repository';
import { MultiBrandCache } from './cache/multi-brand.cache';
import { MultiBrandValidator } from './validator/multi-brand.validator';
import { MultiBrandAudit } from './audit/multi-brand.audit';
import { MultiBrandEventQueue } from './events/multi-brand-events.queue';
import { MultiBrandService } from './multi-brand.service';
import { MultiBrandController } from './multi-brand.controller';

/**
 * MultiBrandModule — lets one workspace/organization own several brands.
 * Owns brand identity, lifecycle (draft/active/inactive/archived,
 * versioned, with ownership-change history) and scope (countries/regions/
 * currencies/marketplace accounts/locale/tax/compliance references).
 * Every cross-module value is a plain reference validated against its
 * owning service (`CountryService`, `CurrencyRegistry`,
 * `MarketplaceAccountService`) — never recomputed here. Products,
 * categories, listings and media are associated via the generic
 * `BrandEntityLink` table (mirroring `DocumentEntityLink`), so Product
 * Catalog/Marketplace/Pricing schemas are never touched.
 */
@Module({
  imports: [DatabaseModule, AuditLogsModule, CountryModule, CurrencyModule, MarketplaceAccountModule],
  controllers: [MultiBrandController],
  providers: [
    MultiBrandRepository,
    MultiBrandCache,
    MultiBrandValidator,
    MultiBrandAudit,
    MultiBrandEventQueue,
    MultiBrandService,
  ],
  exports: [MultiBrandService, MultiBrandCache],
})
export class MultiBrandModule {}
