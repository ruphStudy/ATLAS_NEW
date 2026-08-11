import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CatalogSyncRepository } from '../repository/catalog-sync.repository';
import { MarketplaceCatalogSyncService } from '../marketplace-catalog-sync.service';
import {
  ICatalogSyncSchedule,
  SyncDirection,
  SyncScope,
  SyncTrigger,
} from '../interfaces';
import { MP_CATALOG_SYNC_CONSTANTS } from '../constants';

@Injectable()
export class CatalogSyncScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CatalogSyncScheduler.name);
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private service!: MarketplaceCatalogSyncService;

  constructor(private readonly repository: CatalogSyncRepository) {}

  // Injected lazily to break circular dependency
  setService(service: MarketplaceCatalogSyncService): void {
    this.service = service;
  }

  async onModuleInit(): Promise<void> {
    await this.loadSchedules();
  }

  onModuleDestroy(): void {
    for (const timer of this.timers.values()) clearInterval(timer);
    this.timers.clear();
  }

  // ── Schedule management ───────────────────────────────────

  async loadSchedules(): Promise<void> {
    try {
      const schedules = await this.repository.findEnabledSchedules();
      for (const s of schedules) {
        this.register(s as unknown as ICatalogSyncSchedule);
      }
      this.logger.log(`Loaded ${schedules.length} catalog sync schedules`);
    } catch (err) {
      this.logger.warn(`Failed to load sync schedules: ${(err as Error).message}`);
    }
  }

  register(schedule: ICatalogSyncSchedule): void {
    if (this.timers.has(schedule.id)) return;

    const interval = Math.max(schedule.intervalMs, MP_CATALOG_SYNC_CONSTANTS.MIN_SCHEDULE_INTERVAL_MS);
    const timer = setInterval(async () => {
      await this.runSchedule(schedule);
    }, interval);

    this.timers.set(schedule.id, timer);
    this.logger.debug(`Registered sync schedule ${schedule.id} (every ${interval}ms)`);
  }

  deregister(scheduleId: string): void {
    const timer = this.timers.get(scheduleId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(scheduleId);
    }
  }

  async triggerNow(scheduleId: string): Promise<void> {
    const schedules = await this.repository.findEnabledSchedules();
    const schedule = schedules.find((s) => s['id'] === scheduleId);
    if (schedule) {
      await this.runSchedule(schedule as unknown as ICatalogSyncSchedule);
    }
  }

  // ── Runner ────────────────────────────────────────────────

  private async runSchedule(schedule: ICatalogSyncSchedule): Promise<void> {
    if (!this.service) return;
    try {
      const job = await this.service.startSync({
        workspaceId: schedule.workspaceId,
        accountId: schedule.accountId,
        providerKey: schedule.providerKey,
        marketplaceKey: schedule.marketplaceKey,
        direction: schedule.direction,
        scope: schedule.scope,
        itemType: schedule.itemType,
        trigger: SyncTrigger.SCHEDULED,
        conflictStrategy: schedule.conflictStrategy,
        filterOptions: schedule.filterOptions ?? null,
        scheduleId: schedule.id,
      });

      await this.repository.updateSchedule(schedule.id, {
        lastRunAt: new Date(),
        nextRunAt: new Date(Date.now() + schedule.intervalMs),
        lastJobId: job.id,
      });
    } catch (err) {
      this.logger.warn(
        `Scheduled sync for account '${schedule.accountId}' failed: ${(err as Error).message}`,
      );
    }
  }
}
