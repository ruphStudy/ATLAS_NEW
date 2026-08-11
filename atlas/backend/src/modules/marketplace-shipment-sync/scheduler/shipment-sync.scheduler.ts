import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShipmentSyncRepository } from '../repository/shipment-sync.repository';
import { SyncTrigger } from '../interfaces';

@Injectable()
export class ShipmentSyncScheduler {
  private readonly logger = new Logger(ShipmentSyncScheduler.name);
  private service: any;

  constructor(private readonly repository: ShipmentSyncRepository) {}

  setService(service: any): void {
    this.service = service;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSchedules(): Promise<void> {
    if (!this.service) return;

    try {
      const schedules = await this.repository.findSchedules('*', { enabled: true });
      const now = new Date();

      for (const schedule of schedules) {
        const nextRunAt = schedule['nextRunAt'] as Date | null;
        if (!nextRunAt || nextRunAt > now) continue;

        await this.service.startSync({
          workspaceId: schedule['workspaceId'],
          accountId: schedule['accountId'],
          providerKey: schedule['providerKey'],
          marketplaceKey: schedule['marketplaceKey'],
          direction: schedule['direction'],
          scope: schedule['scope'],
          itemType: schedule['itemType'],
          trigger: SyncTrigger.SCHEDULED,
          conflictStrategy: schedule['conflictStrategy'],
          filterOptions: schedule['filterOptions'],
          scheduleId: schedule['id'],
        });

        const intervalMs = schedule['intervalMs'] as number;
        await this.repository.updateSchedule(schedule['id'] as string, schedule['workspaceId'] as string, {
          lastRunAt: now,
          nextRunAt: new Date(now.getTime() + intervalMs),
        });
      }
    } catch (err) {
      this.logger.error(`Schedule check failed: ${(err as Error).message}`);
    }
  }
}
