import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AiModule } from '../../ai/ai.module';
import { AiProviderExpansionController } from './ai-provider-expansion.controller';
import { AiProviderExpansionService } from './ai-provider-expansion.service';
import { AiProviderExpansionRepository } from './ai-provider-expansion.repository';
import { AiProviderExpansionValidator } from './validator/ai-provider-expansion.validator';
import { AiProviderExpansionCache } from './cache/ai-provider-expansion.cache';
import { AiProviderExpansionAudit } from './audit/ai-provider-expansion.audit';

/**
 * AiProviderExpansionModule
 *
 * Rollout maturity (draft/beta/active/deprecated/disabled), versioning/
 * backward-compatibility, adapter-compatibility validation and tenant
 * eligibility for AI providers — layered on top of the AI Provider
 * Foundation (`AiModule`) and, indirectly, the persisted
 * `AiProviderRegistryModule` catalog. Never re-implements provider
 * registration, resolution, capability/model discovery, credentials,
 * cost/usage tracking or health monitoring — all of that stays owned by
 * their existing modules and is reused here via dependency injection.
 * No OpenAI/Anthropic/Gemini (or any other provider) logic is hardcoded
 * anywhere in this module.
 */
@Module({
  imports: [DatabaseModule, AiModule],
  controllers: [AiProviderExpansionController],
  providers: [
    AiProviderExpansionRepository,
    AiProviderExpansionValidator,
    AiProviderExpansionCache,
    AiProviderExpansionAudit,
    AiProviderExpansionService,
  ],
  exports: [AiProviderExpansionService, AiProviderExpansionCache],
})
export class AiProviderExpansionModule {}
