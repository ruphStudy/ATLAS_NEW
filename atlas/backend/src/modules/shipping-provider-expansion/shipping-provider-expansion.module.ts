import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { CountryModule } from '../country/country.module';
import { ShippingProviderModule } from '../shipping-provider/shipping-provider.module';

import { ShippingProviderExpansionRepository } from './repository/shipping-provider-expansion.repository';
import { ShippingProviderExpansionCache } from './cache/shipping-provider-expansion.cache';
import { ShippingProviderExpansionValidator } from './validator/shipping-provider-expansion.validator';
import { ShippingProviderExpansionAudit } from './audit/shipping-provider-expansion.audit';
import { ShippingProviderExpansionEventQueue } from './events/shipping-provider-expansion-events.queue';
import { ShippingProviderExpansionService } from './shipping-provider-expansion.service';
import { ShippingProviderExpansionController } from './shipping-provider-expansion.controller';

/**
 * ShippingProviderExpansionModule — a thin configuration/registration
 * layer over the `ShippingProviderModule` foundation. Owns only the
 * onboarding record, rollout state (draft/beta/active/deprecated/
 * disabled), country/tenant eligibility, and versioned history for each
 * shipping provider expansion. Adapter registration, resolution, health
 * checks and error normalization remain owned by `ShippingProviderModule`
 * and are reused here via dependency injection — never rebuilt or
 * hardcoded per-courier.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    CountryModule,
    ShippingProviderModule,
  ],
  controllers: [ShippingProviderExpansionController],
  providers: [
    ShippingProviderExpansionRepository,
    ShippingProviderExpansionCache,
    ShippingProviderExpansionValidator,
    ShippingProviderExpansionAudit,
    ShippingProviderExpansionEventQueue,
    ShippingProviderExpansionService,
  ],
  exports: [ShippingProviderExpansionService, ShippingProviderExpansionCache],
})
export class ShippingProviderExpansionModule {}
