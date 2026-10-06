import { registerAs } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { CONFIG_DEFAULTS, CONFIG_NAMESPACES, ENV_KEYS } from './constants';
import type { IAiProviderFoundationConfig } from './interfaces';

/**
 * AI provider foundation-level defaults: request timeout, retry/rate-limit
 * defaults, and the use-case → provider routing map. Concrete per-provider
 * configuration (models, capabilities, credentials) is registered at
 * runtime via `AiProviderConfigStore` by whichever module wires up a real
 * provider — never here.
 */
export const aiProviderConfig = registerAs(
  CONFIG_NAMESPACES.AI_PROVIDER,
  (): IAiProviderFoundationConfig => ({
    defaultProviderKey: process.env[ENV_KEYS.AI_PROVIDER_DEFAULT_PROVIDER_KEY] || undefined,
    requestTimeoutMs: parseInt(
      process.env[ENV_KEYS.AI_PROVIDER_REQUEST_TIMEOUT_MS] ??
        String(CONFIG_DEFAULTS.AI_PROVIDER_REQUEST_TIMEOUT_MS),
      10,
    ),
    maxRetryAttempts: parseInt(
      process.env[ENV_KEYS.AI_PROVIDER_MAX_RETRY_ATTEMPTS] ??
        String(CONFIG_DEFAULTS.AI_PROVIDER_MAX_RETRY_ATTEMPTS),
      10,
    ),
    retryBackoffMs: parseInt(
      process.env[ENV_KEYS.AI_PROVIDER_RETRY_BACKOFF_MS] ??
        String(CONFIG_DEFAULTS.AI_PROVIDER_RETRY_BACKOFF_MS),
      10,
    ),
    maxRequestsPerMinute: parseInt(
      process.env[ENV_KEYS.AI_PROVIDER_MAX_REQUESTS_PER_MINUTE] ??
        String(CONFIG_DEFAULTS.AI_PROVIDER_MAX_REQUESTS_PER_MINUTE),
      10,
    ),
    useCaseProviderMap: parseUseCaseProviderMap(
      process.env[ENV_KEYS.AI_PROVIDER_USE_CASE_MAP] ?? CONFIG_DEFAULTS.AI_PROVIDER_USE_CASE_MAP,
    ),
  }),
);

function parseUseCaseProviderMap(raw: string): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    new Logger('AiProviderConfig').warn(
      `AI_PROVIDER_USE_CASE_MAP is not valid JSON, ignoring: ${raw}`,
    );
    return {};
  }
}
