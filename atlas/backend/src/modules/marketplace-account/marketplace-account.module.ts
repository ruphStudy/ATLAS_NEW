import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { MarketplaceProviderModule } from '../marketplace-provider/marketplace-provider.module';
import { MarketplaceConnectionTestModule } from '../marketplace-connection-test/marketplace-connection-test.module';

import { MarketplaceAccountRepository } from './repository/marketplace-account.repository';
import { AccountValidator } from './validator/account.validator';
import { AccountStatusManager } from './status/account-status.manager';
import { AccountConfigurationResolver } from './config/account-configuration.resolver';
import { AccountEventQueue } from './events/account-events.queue';
import { AccountAudit } from './audit/account.audit';
import { MarketplaceAccountService } from './marketplace-account.service';
import { MarketplaceAccountController } from './marketplace-account.controller';

@Module({
  imports: [
    DatabaseModule,
    MarketplaceProviderModule,
    MarketplaceConnectionTestModule,
  ],
  controllers: [MarketplaceAccountController],
  providers: [
    MarketplaceAccountRepository,
    AccountValidator,
    AccountStatusManager,
    AccountConfigurationResolver,
    AccountEventQueue,
    AccountAudit,
    MarketplaceAccountService,
  ],
  exports: [
    MarketplaceAccountService,
    AccountStatusManager,
    MarketplaceAccountRepository,
    AccountAudit,
    AccountEventQueue,
  ],
})
export class MarketplaceAccountModule {}
