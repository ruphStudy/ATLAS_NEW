import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceHealthModule } from '../marketplace-health/marketplace-health.module';

import { ConnectionTestValidator } from './validator/connection-test.validator';
import { ConnectionTestRepository } from './repository/connection-test.repository';
import { ConnectionTestResultManager } from './result/connection-test-result.manager';
import { ConnectionTestEventQueue } from './events/connection-test-events.queue';
import { ConnectionTestRunner } from './runner/connection-test.runner';
import { MarketplaceConnectionTestService } from './marketplace-connection-test.service';
import { MarketplaceConnectionTestController } from './marketplace-connection-test.controller';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
    MarketplaceHealthModule,
  ],
  controllers: [MarketplaceConnectionTestController],
  providers: [
    ConnectionTestValidator,
    ConnectionTestRepository,
    ConnectionTestResultManager,
    ConnectionTestEventQueue,
    ConnectionTestRunner,
    MarketplaceConnectionTestService,
  ],
  exports: [
    MarketplaceConnectionTestService,
    ConnectionTestResultManager,
  ],
})
export class MarketplaceConnectionTestModule {}
