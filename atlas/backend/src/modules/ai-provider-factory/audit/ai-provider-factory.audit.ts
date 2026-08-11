import { Injectable, Logger } from '@nestjs/common';
import { AiProviderEventType } from '../../../ai/interfaces';

/**
 * AiProviderFactoryAudit
 *
 * Structured log lines for factory resolution/initialization events.
 * Never logs `resolvedCredentialFields` or any decrypted credential
 * value — only identifiers and outcome metadata.
 */
@Injectable()
export class AiProviderFactoryAudit {
  private readonly logger = new Logger(AiProviderFactoryAudit.name);

  logEvent(
    event: AiProviderEventType,
    workspaceId: string,
    providerKey: string,
    details?: Record<string, unknown>,
  ): void {
    this.logger.log(`[AUDIT] ${event}`, { workspaceId, providerKey, ...details });
  }
}
