import { Injectable } from '@nestjs/common';
import { AiProviderRegistry } from '../../../ai/registry/ai-provider.registry';
import { AiProviderHealthService } from '../../../ai/health/ai-provider-health.service';
import { AiProviderHealthStatus } from '../../../ai/interfaces';
import { IAiCredentialConnectionValidationResult } from '../interfaces';

/**
 * AiProviderCredentialConnectionValidator
 *
 * "Connection validation through AI Provider Foundation" — delegates
 * entirely to the Foundation's own provider registry + health service
 * rather than reimplementing a connectivity probe or calling any
 * provider's API directly (which would be provider-specific business
 * logic, out of scope for this module).
 */
@Injectable()
export class AiProviderCredentialConnectionValidator {
  constructor(
    private readonly registry: AiProviderRegistry,
    private readonly healthService: AiProviderHealthService,
  ) {}

  async validate(providerKey: string): Promise<IAiCredentialConnectionValidationResult> {
    const startedAt = Date.now();

    if (!this.registry.has(providerKey)) {
      return {
        valid: false,
        checkedAt: new Date(),
        message: `AI provider '${providerKey}' is not registered with the AI Provider Foundation`,
      };
    }

    const provider = this.registry.get(providerKey);
    const health = await this.healthService.checkHealth(provider);

    return {
      valid: health.status === AiProviderHealthStatus.HEALTHY,
      checkedAt: new Date(),
      message: health.message,
      latencyMs: Date.now() - startedAt,
    };
  }
}
