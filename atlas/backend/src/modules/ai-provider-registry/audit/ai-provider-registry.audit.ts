import { Injectable, Logger } from '@nestjs/common';
import { AiProviderEventType } from '../../../ai/interfaces';

/**
 * AiProviderRegistryAudit
 *
 * Structured log lines for registry lifecycle events. No history table
 * for this module (registry entries are simple mutable catalog rows, not
 * versioned configuration/credentials) — audit here means observability
 * logging, consistent with the `[AUDIT] event` pattern used elsewhere in
 * this codebase.
 */
@Injectable()
export class AiProviderRegistryAudit {
  private readonly logger = new Logger(AiProviderRegistryAudit.name);

  logEvent(
    event: AiProviderEventType,
    entryId: string,
    workspaceId: string | null,
    providerKey: string,
    performedBy?: string | null,
    details?: Record<string, unknown>,
  ): void {
    this.logger.log(`[AUDIT] ${event}`, {
      entryId,
      workspaceId,
      providerKey,
      performedBy: performedBy ?? 'system',
      ...details,
    });
  }
}
