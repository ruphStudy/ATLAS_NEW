import { Injectable, Logger } from '@nestjs/common';
import { AiProviderEventType } from '../../../ai/interfaces';
import { AiProviderConfigurationRepository } from '../ai-provider-configuration.repository';
import { IAiProviderConfigEntity } from '../interfaces';

/**
 * AiProviderConfigAudit
 *
 * Writes versioned history rows for every mutating operation and emits a
 * lightweight structured log line for lifecycle events. Mirrors
 * `MarketplaceCredentialAudit`'s design: history writes are wrapped in a
 * try/catch so an audit-write failure never breaks the primary mutation.
 */
@Injectable()
export class AiProviderConfigAudit {
  private readonly logger = new Logger(AiProviderConfigAudit.name);

  constructor(private readonly repository: AiProviderConfigurationRepository) {}

  async logChange(
    config: IAiProviderConfigEntity,
    changeReason: string,
    changedBy?: string | null,
  ): Promise<void> {
    try {
      await this.repository.createHistory({
        configId: config.id,
        workspaceId: config.workspaceId,
        providerKey: config.providerKey,
        version: config.version,
        status: config.status,
        payload: config.payload,
        changeReason,
        changedBy: changedBy ?? null,
      });
    } catch (err) {
      this.logger.error(
        `Failed to write audit history for AI provider configuration '${config.id}'`,
        { error: (err as Error).message },
      );
    }
  }

  logEvent(
    event: AiProviderEventType,
    configId: string,
    workspaceId: string | null,
    providerKey: string,
    performedBy?: string | null,
    details?: Record<string, unknown>,
  ): void {
    this.logger.log(`[AUDIT] ${event}`, {
      configId,
      workspaceId,
      providerKey,
      performedBy: performedBy ?? 'system',
      ...details,
    });
  }
}
