import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MarketplaceHealthMonitorService } from '../monitor/marketplace-health-monitor.service';
import { HealthCheckTrigger } from '../interfaces';

/**
 * MarketplaceHealthCheckScheduler
 *
 * Drives periodic health checks for all workspaces.
 * Uses setInterval — no external scheduler dependency.
 * Deliberately NOT workspace-scoped — health checks run for all active workspaces.
 *
 * In production, the interval and workspace list would be loaded from DB/config.
 * This implementation supports workspace injection via `addWorkspace/removeWorkspace`.
 */
@Injectable()
export class MarketplaceHealthCheckScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceHealthCheckScheduler.name);
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly workspaces = new Set<string>();

  constructor(private readonly monitor: MarketplaceHealthMonitorService) {}

  onModuleInit(): void {
    // Workspaces are registered via addWorkspace(); no checks until then.
    this.logger.log('Health check scheduler initialized');
  }

  onModuleDestroy(): void {
    for (const [key, timer] of this.timers.entries()) {
      clearInterval(timer);
      this.timers.delete(key);
    }
    this.logger.log('Health check scheduler stopped');
  }

  /**
   * Starts periodic health checks for a workspace.
   * @param workspaceId Workspace to monitor
   * @param intervalMs  Check interval in ms (default 60s)
   */
  addWorkspace(workspaceId: string, intervalMs = 60_000): void {
    if (this.workspaces.has(workspaceId)) return;
    this.workspaces.add(workspaceId);

    const timer = setInterval(async () => {
      try {
        await this.monitor.checkAll(workspaceId, HealthCheckTrigger.SCHEDULED);
      } catch (err) {
        this.logger.warn(
          `Scheduled health check failed for workspace '${workspaceId}': ${(err as Error).message}`,
        );
      }
    }, intervalMs);

    this.timers.set(workspaceId, timer);
    this.logger.log(`Scheduled health checks for workspace '${workspaceId}' every ${intervalMs}ms`);
  }

  /**
   * Stops and removes periodic checks for a workspace.
   */
  removeWorkspace(workspaceId: string): void {
    const timer = this.timers.get(workspaceId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(workspaceId);
    }
    this.workspaces.delete(workspaceId);
  }

  /**
   * Triggers an immediate check for all registered workspaces (manual trigger).
   */
  async triggerAll(): Promise<void> {
    await Promise.allSettled(
      [...this.workspaces].map((ws) => this.monitor.checkAll(ws, HealthCheckTrigger.SYSTEM)),
    );
  }

  get activeWorkspaces(): string[] {
    return [...this.workspaces];
  }
}
