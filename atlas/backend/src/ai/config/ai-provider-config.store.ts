import { Injectable } from '@nestjs/common';
import { IAiProviderConfig } from '../interfaces';
import { AiProviderConfigInvalidException } from '../exceptions/ai-provider.exceptions';
import { ConfigurationService } from '../../config/configuration.service';

/**
 * AiProviderConfigStore
 *
 * Configuration-first source of truth for provider configuration and
 * use-case routing. Concrete provider configs are registered at runtime by
 * whichever module wires up a real provider (this foundation module never
 * hardcodes provider-specific values); use-case → provider routing is
 * driven entirely by the `AI_PROVIDER_USE_CASE_MAP` env var so providers
 * can be swapped per use case without code changes.
 */
@Injectable()
export class AiProviderConfigStore {
  private readonly configs = new Map<string, IAiProviderConfig>();

  constructor(private readonly configurationService: ConfigurationService) {}

  registerProviderConfig(config: IAiProviderConfig): void {
    if (!config.providerKey) {
      throw new AiProviderConfigInvalidException('providerKey is required');
    }
    this.configs.set(config.providerKey, config);
  }

  unregisterProviderConfig(providerKey: string): void {
    this.configs.delete(providerKey);
  }

  getProviderConfig(providerKey: string): IAiProviderConfig | undefined {
    return this.configs.get(providerKey);
  }

  listProviderConfigs(): IAiProviderConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Resolves the provider key configured for a given use case, falling
   * back to the global default provider key when no explicit mapping
   * exists. Returns undefined if neither is configured.
   */
  resolveProviderKeyForUseCase(useCase: string): string | undefined {
    const defaults = this.configurationService.getAiProviderConfig();
    return defaults.useCaseProviderMap[useCase] ?? defaults.defaultProviderKey;
  }

  getDefaults() {
    return this.configurationService.getAiProviderConfig();
  }
}
