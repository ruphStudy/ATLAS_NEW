import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AiModule } from '../../ai/ai.module';
import { AiProviderConfigurationController } from './ai-provider-configuration.controller';
import { AiProviderConfigurationService } from './ai-provider-configuration.service';
import { AiProviderConfigurationRepository } from './ai-provider-configuration.repository';
import { AiProviderConfigurationResolver } from './ai-provider-configuration.resolver';
import { AiProviderConfigValidator } from './validator/ai-provider-configuration.validator';
import { AiProviderConfigCache } from './cache/ai-provider-configuration.cache';
import { AiProviderConfigAudit } from './audit/ai-provider-configuration.audit';

/**
 * AiProviderConfigurationModule
 *
 * Manages global/workspace/use-case/model-specific AI provider
 * configuration: draft/publish/rollback/version history, deterministic
 * precedence resolution, event-driven cache invalidation, and workspace
 * isolation. Builds on the AI Provider Foundation (`AiModule`) for its
 * capability/policy contracts and event bus — never on a concrete
 * provider SDK.
 */
@Module({
  imports: [DatabaseModule, AiModule],
  controllers: [AiProviderConfigurationController],
  providers: [
    AiProviderConfigurationRepository,
    AiProviderConfigValidator,
    AiProviderConfigCache,
    AiProviderConfigAudit,
    AiProviderConfigurationResolver,
    AiProviderConfigurationService,
  ],
  exports: [AiProviderConfigurationService, AiProviderConfigurationResolver, AiProviderConfigCache],
})
export class AiProviderConfigurationModule {}
