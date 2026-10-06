import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import {
  HealthCheckRequest,
  HealthCheckResult,
  HealthCheckTrigger,
  HealthDashboardEntry,
  HealthHistoryFilter,
  HealthMetricsSnapshot,
  IHealthRecord,
  MarketplaceHealthState,
} from './interfaces';
import { MarketplaceHealthMonitorService } from './monitor/marketplace-health-monitor.service';
import { MarketplaceHealthStatusManager } from './status/marketplace-health-status.manager';
import { MarketplaceHealthMetrics } from './metrics/marketplace-health.metrics';
import { MarketplaceHealthRepository } from './repository/marketplace-health.repository';
import { MarketplaceHealthCheckScheduler } from './scheduler/marketplace-health-check.scheduler';
import { MP_HEALTH_ERROR_CODES } from './constants';

/**
 * MarketplaceHealthService
 *
 * Public facade for the health monitoring module.
 * All other ATLAS modules interact through this class only.
 */
@Injectable()
export class MarketplaceHealthService implements OnModuleInit {
  private readonly logger = new Logger(MarketplaceHealthService.name);

  constructor(
    private readonly monitor: MarketplaceHealthMonitorService,
    private readonly statusManager: MarketplaceHealthStatusManager,
    private readonly metrics: MarketplaceHealthMetrics,
    private readonly repository: MarketplaceHealthRepository,
    private readonly scheduler: MarketplaceHealthCheckScheduler,
  ) {}

  async onModuleInit(): Promise<void> {
    // Nothing to do until workspaces register themselves
  }

  // ── Manual Health Checks ──────────────────────────────────

  async checkProvider(request: HealthCheckRequest): Promise<HealthCheckResult> {
    return this.monitor.checkProvider({ ...request, trigger: HealthCheckTrigger.MANUAL });
  }

  async checkAllForWorkspace(workspaceId: string): Promise<HealthCheckResult[]> {
    return this.monitor.checkAll(workspaceId, HealthCheckTrigger.MANUAL);
  }

  // ── Current Status ────────────────────────────────────────

  async getStatus(
    workspaceId: string,
    providerKey: string,
    accountId?: string | null,
  ): Promise<IHealthRecord | null> {
    const cached = this.statusManager.getCurrent(workspaceId, providerKey, accountId);
    if (cached) return cached;
    return this.repository.findRecord(workspaceId, providerKey, accountId) as Promise<IHealthRecord | null>;
  }

  async getAllStatuses(workspaceId: string): Promise<IHealthRecord[]> {
    const records = await this.repository.findAllRecords(workspaceId);
    const healthRecords = records as unknown as IHealthRecord[];
    this.statusManager.warmCache(healthRecords);
    return healthRecords;
  }

  // ── Dashboard ─────────────────────────────────────────────

  async getDashboard(workspaceId: string): Promise<HealthDashboardEntry[]> {
    const records = await this.getAllStatuses(workspaceId);
    return records.map((r) => {
      const snap = this.metrics.getSnapshot(workspaceId, r.providerKey, r.accountId);
      return {
        providerKey: r.providerKey,
        workspaceId: r.workspaceId,
        accountId: r.accountId,
        healthState: r.healthState,
        connectionStatus: r.connectionStatus,
        authStatus: r.authStatus,
        apiReachable: r.apiReachable,
        responseTimeMs: r.responseTimeMs,
        consecutiveFailures: r.consecutiveFailures,
        checkedAt: r.checkedAt ?? null,
        metrics: {
          uptimePercent: snap.uptimePercent,
          avgResponseTimeMs: snap.avgResponseTimeMs,
          successRate: snap.successRate,
          failureRate: snap.failureRate,
        },
      } satisfies HealthDashboardEntry;
    });
  }

  // ── History ───────────────────────────────────────────────

  async getHistory(
    filter: HealthHistoryFilter,
  ): Promise<{ items: IHealthRecord[]; total: number; page: number; limit: number; totalPages: number }> {
    const [items, total] = await this.repository.findHistory(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;
    return {
      items: items as unknown as IHealthRecord[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Metrics ───────────────────────────────────────────────

  getMetrics(workspaceId: string, providerKey: string, accountId?: string | null): HealthMetricsSnapshot {
    return this.metrics.getSnapshot(workspaceId, providerKey, accountId);
  }

  getAllMetrics(workspaceId: string): HealthMetricsSnapshot[] {
    return this.metrics.getAllSnapshots(workspaceId);
  }

  // ── Scheduler Management ──────────────────────────────────

  addWorkspaceToScheduler(workspaceId: string, intervalMs?: number): void {
    this.scheduler.addWorkspace(workspaceId, intervalMs);
  }

  removeWorkspaceFromScheduler(workspaceId: string): void {
    this.scheduler.removeWorkspace(workspaceId);
  }

  triggerScheduledChecks(): Promise<void> {
    return this.scheduler.triggerAll();
  }

  // ── Helpers ───────────────────────────────────────────────

  isHealthy(workspaceId: string, providerKey: string, accountId?: string | null): boolean {
    const state = this.statusManager.getCurrentState(workspaceId, providerKey, accountId);
    return state === MarketplaceHealthState.HEALTHY || state === MarketplaceHealthState.DEGRADED;
  }
}
