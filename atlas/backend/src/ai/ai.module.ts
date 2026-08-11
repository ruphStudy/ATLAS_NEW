import { Module } from '@nestjs/common';
import { AiProviderEventEmitter } from './events/ai-provider-event.emitter';
import { AiProviderRegistry } from './registry/ai-provider.registry';
import { AiProviderConfigStore } from './config/ai-provider-config.store';
import { AiProviderMetricsService } from './metrics/ai-provider.metrics';
import { AiProviderHealthService } from './health/ai-provider-health.service';
import { AiProviderFactory } from './factory/ai-provider.factory';
import { AiProviderRateLimiter } from './execution/ai-provider-rate-limiter';
import { AiProviderExecutor } from './execution/ai-provider.executor';

/**
 * AiModule
 *
 * AI Provider Foundation — a generic, configuration-first contract layer
 * for AI providers (ARCH-003 – AI Independent). Exposes:
 *   - IAiProvider / capability contracts (text, reasoning, vision, image,
 *     embedding, validation) that concrete providers implement.
 *   - AiProviderRegistry / AiProviderConfigStore for registering concrete
 *     providers and their configuration at runtime.
 *   - AiProviderFactory for configuration-driven provider/model resolution
 *     (use-case routing, static fallback).
 *   - AiProviderExecutor for timeout/retry/runtime-fallback/rate-limit
 *     wrapped invocation with normalized errors.
 *   - AiProviderHealthService / AiProviderMetricsService for lifecycle
 *     health and usage/cost tracking.
 *   - AiProviderEventEmitter for provider lifecycle and request events.
 *
 * Architecture Note:
 *   AI providers must be replaceable without changing business services.
 *   Business modules depend on the IAiProvider contract and this module's
 *   registry/factory/executor — never on a concrete provider or SDK.
 *   No OpenAI/Anthropic/Gemini (or any other provider) API is implemented
 *   here; concrete providers are registered by the modules that need them.
 */
@Module({
  providers: [
    AiProviderEventEmitter,
    AiProviderRegistry,
    AiProviderConfigStore,
    AiProviderMetricsService,
    AiProviderHealthService,
    AiProviderFactory,
    AiProviderRateLimiter,
    AiProviderExecutor,
  ],
  exports: [
    AiProviderEventEmitter,
    AiProviderRegistry,
    AiProviderConfigStore,
    AiProviderMetricsService,
    AiProviderHealthService,
    AiProviderFactory,
    AiProviderRateLimiter,
    AiProviderExecutor,
  ],
})
export class AiModule {}
