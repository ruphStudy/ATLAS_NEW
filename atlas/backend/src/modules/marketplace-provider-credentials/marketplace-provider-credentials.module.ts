import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { MarketplaceProviderCredentialsRepository } from './marketplace-provider-credentials.repository';
import { MarketplaceCredentialEncryptor } from './encryptor/marketplace-credential.encryptor';
import { MarketplaceCredentialDecryptor } from './decryptor/marketplace-credential.decryptor';
import { MarketplaceCredentialValidator } from './validator/marketplace-credential.validator';
import { MarketplaceCredentialCache } from './cache/marketplace-credential.cache';
import { MarketplaceCredentialAudit } from './audit/marketplace-credential.audit';
import { MarketplaceCredentialRotation } from './rotation/marketplace-credential.rotation';
import { MarketplaceCredentialEventQueue } from './events/marketplace-credential-events.queue';
import { MarketplaceProviderCredentialsService } from './marketplace-provider-credentials.service';
import { MarketplaceProviderCredentialsManager } from './marketplace-provider-credentials.manager';
import { MarketplaceProviderCredentialsController } from './marketplace-provider-credentials.controller';

@Module({
  imports: [DatabaseModule, AuditLogsModule],
  controllers: [MarketplaceProviderCredentialsController],
  providers: [
    MarketplaceProviderCredentialsRepository,
    MarketplaceCredentialEncryptor,
    MarketplaceCredentialDecryptor,
    MarketplaceCredentialValidator,
    MarketplaceCredentialCache,
    MarketplaceCredentialAudit,
    MarketplaceCredentialRotation,
    MarketplaceCredentialEventQueue,
    MarketplaceProviderCredentialsService,
    MarketplaceProviderCredentialsManager,
  ],
  exports: [
    MarketplaceProviderCredentialsService,
    MarketplaceProviderCredentialsManager,
    MarketplaceCredentialEncryptor,
    MarketplaceCredentialDecryptor,
    MarketplaceCredentialValidator,
    MarketplaceCredentialCache,
  ],
})
export class MarketplaceProviderCredentialsModule {}
