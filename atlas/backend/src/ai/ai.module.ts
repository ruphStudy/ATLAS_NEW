import { Module } from '@nestjs/common';

/**
 * AiModule
 *
 * Responsibilities:
 *   - AI provider client abstraction (ARCH-003 – AI Independent)
 *   - Prompt template registry
 *   - AI response storage
 *   - Token usage tracking
 *
 * Architecture Note:
 *   AI providers must be replaceable without changing business services.
 *   Business modules depend on an IAiProvider interface, not concrete implementations.
 *
 * Note: Implementation deferred. Skeleton only.
 */
@Module({
  providers: [],
  exports: [],
})
export class AiModule {}
