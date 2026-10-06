import { Module } from '@nestjs/common';
import { AiModule } from '../../ai/ai.module';
import { AiProviderRegistryModule } from '../ai-provider-registry/ai-provider-registry.module';
import { AiProviderConfigurationModule } from '../ai-provider-configuration/ai-provider-configuration.module';
import { AiProviderCredentialModule } from '../ai-provider-credentials/ai-provider-credential.module';
import { AiProviderFactoryController } from './ai-provider-factory.controller';
import { AiProviderFactoryService } from './ai-provider-factory.service';
import { AiProviderFactoryInstanceCache } from './cache/ai-provider-factory-instance.cache';
import { AiProviderFactoryAudit } from './audit/ai-provider-factory.audit';

/**
 * AiProviderFactoryModule
 *
 * Orchestration layer that ties together the AI Provider Foundation
 * (live provider instances + health), Registry (which provider),
 * Configuration (how to run it) and Credentials (how to authenticate it)
 * into a single `resolve()` call yielding an initialized, cached
 * `IAiProvider` instance. No concrete provider/adapter logic lives here.
 */
@Module({
  imports: [AiModule, AiProviderRegistryModule, AiProviderConfigurationModule, AiProviderCredentialModule],
  controllers: [AiProviderFactoryController],
  providers: [AiProviderFactoryInstanceCache, AiProviderFactoryAudit, AiProviderFactoryService],
  exports: [AiProviderFactoryService, AiProviderFactoryInstanceCache],
})
export class AiProviderFactoryModule {}
