import { Injectable, Logger } from '@nestjs/common';
import { AiProviderEventType } from '../../../ai/interfaces';

/**
 * AiCapabilityAudit
 *
 * Structured log lines for capability lifecycle, override and
 * resolution/validation events. No history table (capability
 * definitions/overrides are simple mutable catalog rows, versioned via an
 * explicit `version` string field, not a full audit trail).
 */
@Injectable()
export class AiCapabilityAudit {
  private readonly logger = new Logger(AiCapabilityAudit.name);

  logEvent(
    event: AiProviderEventType,
    capabilityKey: string,
    workspaceId?: string | null,
    performedBy?: string | null,
    details?: Record<string, unknown>,
  ): void {
    this.logger.log(`[AUDIT] ${event}`, {
      capabilityKey,
      workspaceId: workspaceId ?? null,
      performedBy: performedBy ?? 'system',
      ...details,
    });
  }
}
