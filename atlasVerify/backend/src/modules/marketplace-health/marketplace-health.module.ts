import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';

import { MarketplaceHealthRepository } from './repository/marketplace-health.repository';
import { MarketplaceHealthMetrics } from './metrics/marketplace-health.metrics';
import { MarketplaceHealthEventQueue } from './events/marketplace-health-events.queue';
import { MarketplaceHealthStatusManager } from './status/marketplace-health-status.manager';
import { MarketplaceHealthMonitorService } from './monitor/marketplace-health-monitor.service';
import { MarketplaceHealthCheckScheduler } from './scheduler/marketplace-health-check.scheduler';
import { MarketplaceHealthService } from './marketplace-health.service';
import { MarketplaceHealthController } from './marketplace-health.controller';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
  ],
  controllers: [MarketplaceHealthController],
  providers: [
    MarketplaceHealthRepository,
    MarketplaceHealthMetrics,
    MarketplaceHealthEventQueue,
    MarketplaceHealthStatusManager,
    MarketplaceHealthMonitorService,
    MarketplaceHealthCheckScheduler,
    MarketplaceHealthService,
  ],
  exports: [
    MarketplaceHealthService,
    MarketplaceHealthStatusManager,
    MarketplaceHealthMetrics,
    MarketplaceHealthEventQueue,
  ],
})
export class MarketplaceHealthModule {}
