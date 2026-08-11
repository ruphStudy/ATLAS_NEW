import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AiModule } from '../../ai/ai.module';
import { AiProviderCredentialController } from './ai-provider-credential.controller';
import { AiProviderCredentialService } from './ai-provider-credential.service';
import { AiProviderCredentialRepository } from './ai-provider-credential.repository';
import { AiProviderCredentialResolver } from './ai-provider-credential.resolver';
import { AiProviderCredentialValidator } from './validator/ai-provider-credential.validator';
import { AiProviderCredentialEncryptor } from './encryptor/ai-provider-credential.encryptor';
import { AiProviderCredentialDecryptor } from './decryptor/ai-provider-credential.decryptor';
import { AiProviderCredentialCache } from './cache/ai-provider-credential.cache';
import { AiProviderCredentialAudit } from './audit/ai-provider-credential.audit';
import { AiProviderCredentialConnectionValidator } from './connection/ai-provider-credential-connection.validator';

/**
 * AiProviderCredentialModule
 *
 * Securely manages AI provider credentials: encryption at rest,
 * versioning/history, rotation/refresh/revocation, expiry detection,
 * workspace-isolated active-credential resolution with event-driven
 * cache invalidation, and connection validation through the AI Provider
 * Foundation (`AiModule`) rather than any provider-specific API call.
 */
@Module({
  imports: [DatabaseModule, AiModule],
  controllers: [AiProviderCredentialController],
  providers: [
    AiProviderCredentialRepository,
    AiProviderCredentialValidator,
    AiProviderCredentialEncryptor,
    AiProviderCredentialDecryptor,
    AiProviderCredentialCache,
    AiProviderCredentialAudit,
    AiProviderCredentialConnectionValidator,
    AiProviderCredentialResolver,
    AiProviderCredentialService,
  ],
  exports: [AiProviderCredentialService, AiProviderCredentialResolver, AiProviderCredentialCache],
})
export class AiProviderCredentialModule {}
