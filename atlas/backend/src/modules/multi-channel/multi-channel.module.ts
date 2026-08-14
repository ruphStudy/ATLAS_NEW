import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceAccountModule } from '../marketplace-account/marketplace-account.module';
import { MultiBusinessModule } from '../multi-business/multi-business.module';
import { MultiBrandModule } from '../multi-brand/multi-brand.module';

import { MultiChannelRepository } from './repository/multi-channel.repository';
import { MultiChannelCache } from './cache/multi-channel.cache';
import { ChannelProviderRegistry } from './registry/channel-provider.registry';
import { MultiChannelValidator } from './validator/multi-channel.validator';
import { MultiChannelAudit } from './audit/multi-channel.audit';
import { MultiChannelEventQueue } from './events/multi-channel-events.queue';
import { MultiChannelService } from './multi-channel.service';
import { MultiChannelController } from './multi-channel.controller';

/**
 * MultiChannelModule — a thin registration/routing layer over the
 * existing Multi-Marketplace Framework, generalized to cover
 * non-marketplace sales channels (D2C stores, B2B portals, retail/POS,
 * social commerce). Owns only `Channel` registration, lifecycle
 * (registered/active/disabled/archived, versioned, with history),
 * product/SKU mapping and an idempotency ledger. A MARKETPLACE-type
 * channel references an existing `MarketplaceAccount` and routes health/
 * error-normalization through the existing `MarketplaceProviderRegistry`/
 * `MarketplaceErrorNormalizer` — nothing about Amazon, Shopify, or any
 * other provider is duplicated or hardcoded here. Other channel types
 * plug into this module's own lightweight `ChannelProviderRegistry`,
 * which starts empty until a real adapter registers against it.
 */
@Module({
  imports: [
    DatabaseModule,
    AuditLogsModule,
    MarketplaceProviderModule,
    MarketplaceAccountModule,
    MultiBusinessModule,
    MultiBrandModule,
  ],
  controllers: [MultiChannelController],
  providers: [
    MultiChannelRepository,
    MultiChannelCache,
    ChannelProviderRegistry,
    MultiChannelValidator,
    MultiChannelAudit,
    MultiChannelEventQueue,
    MultiChannelService,
  ],
  exports: [MultiChannelService, MultiChannelCache, ChannelProviderRegistry],
})
export class MultiChannelModule {}
