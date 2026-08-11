import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { AiModule } from '../../ai/ai.module';
import { AiProviderRegistryController } from './ai-provider-registry.controller';
import { AiProviderRegistryService } from './ai-provider-registry.service';
import { AiProviderRegistryRepository } from './ai-provider-registry.repository';
import { AiProviderRegistryResolver } from './ai-provider-registry.resolver';
import { AiProviderRegistryValidator } from './validator/ai-provider-registry.validator';
import { AiProviderRegistryCache } from './cache/ai-provider-registry.cache';
import { AiProviderRegistryAudit } from './audit/ai-provider-registry.audit';

/**
 * AiProviderRegistryModule
 *
 * Persisted catalog of AI providers (register/update/enable/disable/
 * archive/resolve), global or workspace-specific, with discovery by
 * capability/model/workspace/region/status, priority/default/fallback
 * ordering, event-driven cache invalidation, and synchronization against
 * the AI Provider Foundation's live in-memory registry (`AiModule`).
 * Concrete provider/adapter implementations stay entirely outside this
 * module.
 */
@Module({
  imports: [DatabaseModule, AiModule],
  controllers: [AiProviderRegistryController],
  providers: [
    AiProviderRegistryRepository,
    AiProviderRegistryValidator,
    AiProviderRegistryCache,
    AiProviderRegistryAudit,
    AiProviderRegistryResolver,
    AiProviderRegistryService,
  ],
  exports: [AiProviderRegistryService, AiProviderRegistryResolver, AiProviderRegistryCache],
})
export class AiProviderRegistryModule {}
