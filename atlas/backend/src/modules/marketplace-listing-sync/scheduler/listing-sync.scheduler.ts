import { Injectable, Logger } from '@nestjs/common';
import { IListingSyncSchedule, IListingSyncJob, ListingSyncRequest, SyncTrigger } from '../interfaces';
import { ListingSyncRepository } from '../repository/listing-sync.repository';

@Injectable()
export class ListingSyncScheduler {
  private readonly logger = new Logger(ListingSyncScheduler.name);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private service: { startSync: (req: ListingSyncRequest) => Promise<IListingSyncJob> } | null = null;

  constructor(private readonly repository: ListingSyncRepository) {}

  setService(service: { startSync: (req: ListingSyncRequest) => Promise<IListingSyncJob> }): void {
    this.service = service;
  }

  register(schedule: IListingSyncSchedule): void {
    if (!schedule.enabled) return;
    this.deregister(schedule.id);

    const delayMs = schedule.nextRunAt
      ? Math.max(0, schedule.nextRunAt.getTime() - Date.now())
      : schedule.intervalMs;

    const timer = setTimeout(async () => {
      await this.fire(schedule);
    }, delayMs);

    this.timers.set(schedule.id, timer);
  }

  deregister(scheduleId: string): void {
    const timer = this.timers.get(scheduleId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(scheduleId);
    }
  }

  async triggerNow(scheduleId: string): Promise<void> {
    const schedules = await this.repository.findSchedulesByWorkspace('');
    const schedule = schedules.find((s) => s['id'] === scheduleId) as unknown as IListingSyncSchedule | undefined;
    if (schedule) await this.fire(schedule);
  }

  private async fire(schedule: IListingSyncSchedule): Promise<void> {
    try {
      if (this.service) {
        await this.service.startSync({
          workspaceId: schedule.workspaceId,
          accountId: schedule.accountId,
          providerKey: schedule.providerKey,
          marketplaceKey: schedule.marketplaceKey,
          direction: schedule.direction,
          scope: schedule.scope,
          itemType: schedule.itemType,
          conflictStrategy: schedule.conflictStrategy ?? undefined,
          filterOptions: schedule.filterOptions,
          scheduleId: schedule.id,
          trigger: SyncTrigger.SCHEDULED,
        });
      }

      const nextRunAt = new Date(Date.now() + schedule.intervalMs);
      await this.repository.updateSchedule(schedule.id, { lastRunAt: new Date(), lastJobId: null, nextRunAt });

      // Re-register for next interval
      const fresh = await this.repository.findScheduleById(schedule.id, schedule.workspaceId);
      if (fresh && fresh['enabled'] && !fresh['deletedAt']) {
        this.register(fresh as unknown as IListingSyncSchedule);
      }
    } catch (err) {
      this.logger.error(`ListingSyncScheduler failed to fire schedule '${schedule.id}': ${(err as Error).message}`);
    }
  }
}
