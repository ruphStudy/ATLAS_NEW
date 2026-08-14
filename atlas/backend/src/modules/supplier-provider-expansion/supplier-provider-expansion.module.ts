import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { CountryModule } from '../country/country.module';
import { CurrencyModule } from '../currency/currency.module';
import { SupplierProviderModule } from '../supplier-provider/supplier-provider.module';

import { SupplierProviderExpansionRepository } from './repository/supplier-provider-expansion.repository';
import { SupplierProviderExpansionCache } from './cache/supplier-provider-expansion.cache';
import { SupplierProviderExpansionValidator } from './validator/supplier-provider-expansion.validator';
import { SupplierProviderExpansionAudit } from './audit/supplier-provider-expansion.audit';
import { SupplierProviderExpansionEventQueue } from './events/supplier-provider-expansion-events.queue';
import { SupplierProviderExpansionService } from './supplier-provider-expansion.service';
import { SupplierProviderExpansionController } from './supplier-provider-expansion.controller';

/**
 * SupplierProviderExpansionModule — a thin configuration/registration
 * layer over the existing Supplier Provider Foundation. Owns only the
 * onboarding record, rollout state (draft/beta/active/deprecated/
 * disabled), country/tenant eligibility, and versioned history for each
 * supplier provider expansion. Adapter registration, resolution, health
 * checks, error normalization and credential handling remain owned by
 * `SupplierProviderModule` and are reused here via dependency
 * injection — never rebuilt or hardcoded per-provider.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    CountryModule,
    CurrencyModule,
    SupplierProviderModule,
  ],
  controllers: [SupplierProviderExpansionController],
  providers: [
    SupplierProviderExpansionRepository,
    SupplierProviderExpansionCache,
    SupplierProviderExpansionValidator,
    SupplierProviderExpansionAudit,
    SupplierProviderExpansionEventQueue,
    SupplierProviderExpansionService,
  ],
  exports: [SupplierProviderExpansionService, SupplierProviderExpansionCache],
})
export class SupplierProviderExpansionModule {}
