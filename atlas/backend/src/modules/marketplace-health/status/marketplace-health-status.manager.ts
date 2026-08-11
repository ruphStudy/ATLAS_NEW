import { Injectable, Logger } from '@nestjs/common';
import {
  HealthCheckResult,
  HealthConnectionStatus,
  HealthAuthStatus,
  MarketplaceHealthState,
  IHealthRecord,
  HealthEventPayload,
  MarketplaceHealthEvent,
  HealthCheckTrigger,
} from '../interfaces';
import { MarketplaceHealthRepository } from '../repository/marketplace-health.repository';
import { MarketplaceHealthEventQueue } from '../events/marketplace-health-events.queue';
import { MP_HEALTH_CONSTANTS } from '../constants';

/**
 * MarketplaceHealthStatusManager
 *
 * Owns the canonical per-provider health state.
 * Computes state transitions, tracks consecutive failures/successes,
 * persists to DB, and emits events when state changes.
 */
@Injectable()
export class MarketplaceHealthStatusManager {
  private readonly logger = new Logger(MarketplaceHealthStatusManager.name);

  // In-memory cache of current health records (key = ws:provider:account)
  private readonly stateCache = new Map<string, IHealthRecord>();

  constructor(
    private readonly repository: MarketplaceHealthRepository,
    private readonly eventQueue: MarketplaceHealthEventQueue,
  ) {}

  private cacheKey(workspaceId: string, providerKey: string, accountId?: string | null): string {
    return `${workspaceId}:${providerKey.toUpperCase()}:${accountId ?? 'any'}`;
  }

  // ── Apply check result ────────────────────────────────────

  async apply(
    result: HealthCheckResult,
    trigger: HealthCheckTrigger = HealthCheckTrigger.SCHEDULED,
  ): Promise<IHealthRecord> {
    const key = this.cacheKey(result.workspaceId, result.providerKey, result.accountId);
    const previous = this.stateCache.get(key) ??
      (await this.repository.findRecord(result.workspaceId, result.providerKey, result.accountId) as unknown as IHealthRecord | null);

    const prevState = (previous?.healthState as MarketplaceHealthState | null) ?? null;
    const newState = result.healthState;

    const consecutiveFailures = newState === MarketplaceHealthState.HEALTHY || newState === MarketplaceHealthState.DEGRADED
      ? 0
      : (previous?.consecutiveFailures ?? 0) + 1;

    const consecutiveSuccess = newState === MarketplaceHealthState.HEALTHY
      ? (previous?.consecutiveSuccess ?? 0) + 1
      : 0;

    const sanitizedError = result.lastError ? this.sanitize(result.lastError) : null;

    const record: Omit<IHealthRecord, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
      workspaceId: result.workspaceId,
      providerKey: result.providerKey.toUpperCase(),
      accountId: result.accountId ?? null,
      healthState: newState,
      previousState: prevState,
      connectionStatus: result.connectionStatus,
      authStatus: result.authStatus,
      apiReachable: result.apiReachable,
      responseTimeMs: result.responseTimeMs ?? null,
      errorRate: result.errorRate ?? null,
      rateLimitRemaining: result.rateLimitRemaining ?? null,
      rateLimitReset: result.rateLimitReset ?? null,
      consecutiveFailures,
      consecutiveSuccess,
      lastError: sanitizedError,
      checkedAt: result.checkedAt,
    };

    const persisted = await this.repository.upsertRecord(record as Record<string, unknown>);
    const healthRecord = persisted as unknown as IHealthRecord;
    this.stateCache.set(key, healthRecord);

    // Write history
    await this.repository.createHistory({
      workspaceId: result.workspaceId,
      providerKey: result.providerKey.toUpperCase(),
      accountId: result.accountId ?? null,
      healthState: newState,
      previousState: prevState,
      responseTimeMs: result.responseTimeMs ?? null,
      errorRate: result.errorRate ?? null,
      apiReachable: result.apiReachable,
      authStatus: result.authStatus,
      connectionStatus: result.connectionStatus,
      lastError: sanitizedError,
      triggeredBy: trigger,
      checkedAt: result.checkedAt,
    });

    // Emit event if state changed
    if (prevState !== newState) {
      await this.emitStateChange(result, prevState, newState, trigger, consecutiveFailures);
      await this.repository.createAuditLog({
        workspaceId: result.workspaceId,
        providerKey: result.providerKey.toUpperCase(),
        accountId: result.accountId ?? null,
        event: MarketplaceHealthEvent.STATE_CHANGED,
        fromState: prevState,
        toState: newState,
        triggeredBy: trigger,
        metadata: { consecutiveFailures, responseTimeMs: result.responseTimeMs },
      });
    }

    return healthRecord;
  }

  private async emitStateChange(
    result: HealthCheckResult,
    from: MarketplaceHealthState | null,
    to: MarketplaceHealthState,
    trigger: HealthCheckTrigger,
    consecutiveFailures: number,
  ): Promise<void> {
    const eventKey = `${from}_${to}`;
    const eventName = from
      ? (MP_HEALTH_CONSTANTS.STATE_EVENTS[eventKey] ?? MarketplaceHealthEvent.STATE_CHANGED)
      : MarketplaceHealthEvent.UP;

    let event: MarketplaceHealthEvent;
    switch (eventName) {
      case 'marketplace-health-up':        event = MarketplaceHealthEvent.UP; break;
      case 'marketplace-health-degraded':  event = MarketplaceHealthEvent.DEGRADED; break;
      case 'marketplace-health-down':      event = MarketplaceHealthEvent.DOWN; break;
      case 'marketplace-health-restored':  event = MarketplaceHealthEvent.RESTORED; break;
      default:                             event = MarketplaceHealthEvent.STATE_CHANGED; break;
    }

    const payload: HealthEventPayload = {
      event,
      workspaceId: result.workspaceId,
      providerKey: result.providerKey,
      accountId: result.accountId ?? null,
      fromState: from,
      toState: to,
      responseTimeMs: result.responseTimeMs ?? null,
      consecutiveFailures,
      triggeredBy: trigger,
      timestamp: new Date(),
    };

    await this.eventQueue.enqueue(payload);
    this.logger.log(
      `Health state change: ${result.providerKey} [${from ?? 'NEW'} → ${to}] ws=${result.workspaceId}`,
    );
  }

  // ── Getters ───────────────────────────────────────────────

  getCurrent(workspaceId: string, providerKey: string, accountId?: string | null): IHealthRecord | null {
    return this.stateCache.get(this.cacheKey(workspaceId, providerKey, accountId)) ?? null;
  }

  getCurrentState(workspaceId: string, providerKey: string, accountId?: string | null): MarketplaceHealthState {
    return this.getCurrent(workspaceId, providerKey, accountId)?.healthState ?? MarketplaceHealthState.HEALTHY;
  }

  warmCache(records: IHealthRecord[]): void {
    for (const r of records) {
      const key = this.cacheKey(r.workspaceId, r.providerKey, r.accountId);
      this.stateCache.set(key, r);
    }
  }

  invalidate(workspaceId: string, providerKey?: string | null): void {
    if (providerKey) {
      for (const k of [...this.stateCache.keys()]) {
        if (k.startsWith(`${workspaceId}:${providerKey.toUpperCase()}:`)) {
          this.stateCache.delete(k);
        }
      }
    } else {
      for (const k of [...this.stateCache.keys()]) {
        if (k.startsWith(`${workspaceId}:`)) this.stateCache.delete(k);
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  /**
   * Strips potential secrets/credentials from error messages before persisting.
   */
  private sanitize(message: string): string {
    return message
      .replace(/access[_-]?key[=:\s]+\S+/gi, 'access_key=***')
      .replace(/secret[=:\s]+\S+/gi, 'secret=***')
      .replace(/password[=:\s]+\S+/gi, 'password=***')
      .replace(/token[=:\s]+\S+/gi, 'token=***')
      .replace(/authorization[=:\s]+\S+/gi, 'authorization=***')
      .substring(0, 500); // cap length
  }
}
