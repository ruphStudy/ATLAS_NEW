import { Injectable, Logger } from '@nestjs/common';
import { AdapterAuditEvent } from './adapter.types';

/**
 * AdapterAuditLogger
 *
 * Records structured audit events for all provider interactions.
 * In production, persist to an audit store or forward to a SIEM.
 */
@Injectable()
export class AdapterAuditLogger {
  private readonly logger = new Logger(AdapterAuditLogger.name);

  // In-memory buffer (replace with DB or queue in production)
  private readonly events: AdapterAuditEvent[] = [];
  private readonly MAX_BUFFER = 1_000;

  record(event: AdapterAuditEvent): void {
    // Never log idempotency keys or any sensitive fields — only structured metadata
    const safe: AdapterAuditEvent = {
      correlationId: event.correlationId,
      requestId: event.requestId,
      workspaceId: event.workspaceId,
      providerCode: event.providerCode,
      capability: event.capability,
      strategy: event.strategy,
      userId: event.userId ?? null,
      success: event.success,
      durationMs: event.durationMs,
      attempt: event.attempt,
      errorCode: event.errorCode ?? null,
      idempotencyKey: event.idempotencyKey ? '[PRESENT]' : null, // never log the actual key
      timestamp: event.timestamp,
    };

    this.logger.log(
      `[AUDIT] ${safe.providerCode} ${safe.capability} ws=${safe.workspaceId} ` +
        `success=${safe.success} ${safe.durationMs}ms attempt=${safe.attempt}` +
        (safe.errorCode ? ` error=${safe.errorCode}` : ''),
    );

    if (this.events.length < this.MAX_BUFFER) {
      this.events.push(safe);
    }
  }

  /**
   * Returns recent audit events for diagnostics (not for business logic).
   */
  recent(limit = 100): AdapterAuditEvent[] {
    return this.events.slice(-limit);
  }

  flush(): AdapterAuditEvent[] {
    const batch = [...this.events];
    this.events.length = 0;
    return batch;
  }
}
