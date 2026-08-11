import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AiModule } from '../../ai/ai.module';
import { AiProviderRegistryModule } from '../ai-provider-registry/ai-provider-registry.module';
import { AiProviderConfigurationModule } from '../ai-provider-configuration/ai-provider-configuration.module';
import { AiProviderCredentialModule } from '../ai-provider-credentials/ai-provider-credential.module';
import { AiCapabilityController } from './ai-capability.controller';
import { AiCapabilityService } from './ai-capability.service';
import { AiCapabilityResolver } from './ai-capability.resolver';
import { AiCapabilityRepository } from './ai-capability.repository';
import { AiCapabilityValidator } from './validator/ai-capability.validator';
import { AiCapabilityCache } from './cache/ai-capability.cache';
import { AiCapabilityAudit } from './audit/ai-capability.audit';

/**
 * AiCapabilityModule
 *
 * Defines and versions AI capabilities (text, reasoning, vision, image
 * generation, embeddings, validation, classification, structured output),
 * their schemas/limits/dependencies, and a global/provider/model/workspace
 * override matrix declaring full/partial/unsupported support. Resolution
 * validates dependencies, workspace policy/feature flags, provider/model
 * support (falling back to the Registry's plain capability list),
 * required model/configuration/credential availability and required-role
 * permissions — reusing the Registry, Configuration and Credentials
 * resolvers rather than duplicating their logic.
 */
@Module({
  imports: [DatabaseModule, AiModule, AiProviderRegistryModule, AiProviderConfigurationModule, AiProviderCredentialModule],
  controllers: [AiCapabilityController],
  providers: [
    AiCapabilityRepository,
    AiCapabilityValidator,
    AiCapabilityCache,
    AiCapabilityAudit,
    AiCapabilityResolver,
    AiCapabilityService,
  ],
  exports: [AiCapabilityService, AiCapabilityResolver, AiCapabilityCache],
})
export class AiCapabilityModule {}
