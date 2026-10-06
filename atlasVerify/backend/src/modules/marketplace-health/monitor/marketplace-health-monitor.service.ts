import { Injectable, Logger } from '@nestjs/common';
import {
  HealthCheckRequest,
  HealthCheckResult,
  HealthCheckTrigger,
  HealthAuthStatus,
  HealthConnectionStatus,
  MarketplaceHealthState,
} from '../interfaces';
import { MarketplaceProviderRegistry } from '../../marketplace-provider/registry/marketplace-provider.registry';
import { MarketplaceHealthStatusManager } from '../status/marketplace-health-status.manager';
import { MarketplaceHealthMetrics } from '../metrics/marketplace-health.metrics';
import { MarketplaceHealthRepository } from '../repository/marketplace-health.repository';
import { MP_HEALTH_CONSTANTS } from '../constants';

/**
 * MarketplaceHealthMonitorService
 *
 * Executes health checks against registered provider adapters.
 * Never touches credentials directly — delegates to adapter.healthCheck().
 * Computes health state from check results.
 */
@Injectable()
export class MarketplaceHealthMonitorService {
  private readonly logger = new Logger(MarketplaceHealthMonitorService.name);

  constructor(
    private readonly registry: MarketplaceProviderRegistry,
    private readonly statusManager: MarketplaceHealthStatusManager,
    private readonly metrics: MarketplaceHealthMetrics,
    private readonly repository: MarketplaceHealthRepository,
  ) {}

  // ── Manual / On-Demand Check ──────────────────────────────

  async checkProvider(request: HealthCheckRequest): Promise<HealthCheckResult> {
    const { workspaceId, providerKey, accountId, trigger = HealthCheckTrigger.MANUAL } = request;

    if (!this.registry.isRegistered(providerKey)) {
      const result = this.buildOfflineResult(workspaceId, providerKey, accountId, 'Provider not registered');
      await this.statusManager.apply(result, trigger);
      this.metrics.record(result);
      return result;
    }

    const adapter = this.registry.get(providerKey);
    const timeoutMs = request.timeout ?? MP_HEALTH_CONSTANTS.DEFAULT_TIMEOUT_MS;

    let result: HealthCheckResult;
    let retries = 0;

    while (retries <= MP_HEALTH_CONSTANTS.MAX_RETRIES) {
      try {
        result = await this.withTimeout(
          this.runCheck(workspaceId, providerKey, accountId, adapter),
          timeoutMs,
          workspaceId,
          providerKey,
          accountId,
        );
        break;
      } catch (err) {
        retries++;
        if (retries > MP_HEALTH_CONSTANTS.MAX_RETRIES) {
          result = this.buildOfflineResult(
            workspaceId,
            providerKey,
            accountId,
            (err as Error).message,
          );
          break;
        }
        this.logger.warn(`Health check retry ${retries}/${MP_HEALTH_CONSTANTS.MAX_RETRIES} for ${providerKey}`);
        await this.delay(MP_HEALTH_CONSTANTS.RETRY_DELAY_MS);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await this.statusManager.apply(result!, trigger);
    this.metrics.record(result!);
    return result!;
  }

  /**
   * Checks all active providers for a workspace.
   */
  async checkAll(workspaceId: string, trigger = HealthCheckTrigger.SCHEDULED): Promise<HealthCheckResult[]> {
    const adapters = this.registry.getActive();
    const results = await Promise.allSettled(
      adapters.map((adapter) =>
        this.checkProvider({
          workspaceId,
          providerKey: adapter.metadata.providerKey,
          trigger,
        }),
      ),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<HealthCheckResult> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  // ── Core Check Logic ──────────────────────────────────────

  private async runCheck(
    workspaceId: string,
    providerKey: string,
    accountId: string | null | undefined,
    adapter: { healthCheck: (accountId?: string) => Promise<{ status: string; latencyMs?: number; message?: string; connectionStatus?: string }> },
  ): Promise<HealthCheckResult> {
    const start = Date.now();
    const raw = await adapter.healthCheck(accountId ?? undefined);
    const responseTimeMs = Date.now() - start;

    const healthState = this.computeState(raw.status, responseTimeMs);
    const connectionStatus = this.mapConnectionStatus(raw.connectionStatus ?? raw.status);
    const authStatus = this.mapAuthStatus(raw.status, raw.message);

    return {
      workspaceId,
      providerKey: providerKey.toUpperCase(),
      accountId: accountId ?? null,
      healthState,
      connectionStatus,
      authStatus,
      apiReachable: healthState !== MarketplaceHealthState.OFFLINE && healthState !== MarketplaceHealthState.UNHEALTHY,
      responseTimeMs,
      errorRate: null,
      rateLimitRemaining: null,
      rateLimitReset: null,
      consecutiveFailures: 0,
      consecutiveSuccess: 0,
      lastError: healthState !== MarketplaceHealthState.HEALTHY ? (raw.message ?? null) : null,
      checkedAt: new Date(),
    };
  }

  // ── State Computation ─────────────────────────────────────

  private computeState(status: string, responseTimeMs: number): MarketplaceHealthState {
    const s = status.toUpperCase();
    if (s === 'OFFLINE' || s === 'UNREACHABLE') return MarketplaceHealthState.OFFLINE;
    if (s === 'MAINTENANCE') return MarketplaceHealthState.MAINTENANCE;
    if (s === 'UNHEALTHY' || s === 'ERROR' || s === 'FAILED') return MarketplaceHealthState.UNHEALTHY;
    if (
      s === 'DEGRADED' ||
      responseTimeMs > MP_HEALTH_CONSTANTS.DEGRADED_RESPONSE_TIME_MS
    ) return MarketplaceHealthState.DEGRADED;
    if (responseTimeMs > MP_HEALTH_CONSTANTS.UNHEALTHY_RESPONSE_TIME_MS) return MarketplaceHealthState.UNHEALTHY;
    return MarketplaceHealthState.HEALTHY;
  }

  private mapConnectionStatus(raw?: string): HealthConnectionStatus {
    if (!raw) return HealthConnectionStatus.UNKNOWN;
    const s = raw.toUpperCase();
    if (s === 'CONNECTED' || s === 'HEALTHY') return HealthConnectionStatus.CONNECTED;
    if (s === 'TIMEOUT') return HealthConnectionStatus.TIMEOUT;
    if (s === 'FAILED' || s === 'ERROR' || s === 'UNHEALTHY') return HealthConnectionStatus.FAILED;
    return HealthConnectionStatus.UNKNOWN;
  }

  private mapAuthStatus(status: string, message?: string): HealthAuthStatus {
    const s = status.toUpperCase();
    const m = (message ?? '').toLowerCase();
    if (m.includes('expired') || m.includes('token expired')) return HealthAuthStatus.EXPIRED;
    if (m.includes('unauthorized') || m.includes('auth') || s === 'UNAUTHENTICATED') return HealthAuthStatus.UNAUTHENTICATED;
    if (s === 'UNHEALTHY' || s === 'FAILED') return HealthAuthStatus.INVALID;
    if (s === 'HEALTHY' || s === 'DEGRADED') return HealthAuthStatus.AUTHENTICATED;
    return HealthAuthStatus.UNKNOWN;
  }

  // ── Offline / Timeout Results ─────────────────────────────

  private buildOfflineResult(
    workspaceId: string,
    providerKey: string,
    accountId: string | null | undefined,
    reason: string,
  ): HealthCheckResult {
    return {
      workspaceId,
      providerKey: providerKey.toUpperCase(),
      accountId: accountId ?? null,
      healthState: MarketplaceHealthState.OFFLINE,
      connectionStatus: HealthConnectionStatus.FAILED,
      authStatus: HealthAuthStatus.UNKNOWN,
      apiReachable: false,
      responseTimeMs: null,
      errorRate: null,
      rateLimitRemaining: null,
      rateLimitReset: null,
      consecutiveFailures: 0,
      consecutiveSuccess: 0,
      lastError: this.sanitize(reason),
      checkedAt: new Date(),
    };
  }

  private buildTimeoutResult(
    workspaceId: string,
    providerKey: string,
    accountId: string | null | undefined,
    timeoutMs: number,
  ): HealthCheckResult {
    return {
      workspaceId,
      providerKey: providerKey.toUpperCase(),
      accountId: accountId ?? null,
      healthState: MarketplaceHealthState.UNHEALTHY,
      connectionStatus: HealthConnectionStatus.TIMEOUT,
      authStatus: HealthAuthStatus.UNKNOWN,
      apiReachable: false,
      responseTimeMs: timeoutMs,
      errorRate: null,
      rateLimitRemaining: null,
      rateLimitReset: null,
      consecutiveFailures: 0,
      consecutiveSuccess: 0,
      lastError: `Health check timed out after ${timeoutMs}ms`,
      checkedAt: new Date(),
    };
  }

  // ── Helpers ───────────────────────────────────────────────

  private withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    workspaceId: string,
    providerKey: string,
    accountId?: string | null,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout after ${ms}ms`));
      }, ms);
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private sanitize(message: string): string {
    return message
      .replace(/secret[=:\s]+\S+/gi, 'secret=***')
      .replace(/token[=:\s]+\S+/gi, 'token=***')
      .replace(/password[=:\s]+\S+/gi, 'password=***')
      .substring(0, 500);
  }
}
